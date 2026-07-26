"""
app/services/roundup.py

Pure "spare change jar" logic. Two responsibilities only:

    1. Per-transaction round-up math (compute_roundup) — stateless.
    2. Batch processing a chronological list of transactions, tracking a
       running jar balance that starts from the user's existing
       pending_roundup_balance, and firing whenever it crosses
       ROUNDUP_THRESHOLD (process_transactions).

Deliberately does NOT:
    - touch the DB (no Session, no commits)
    - call yfinance / price_fetcher
    - decide what asset to buy or how many units

Those are price_fetcher.py + ledger_service.py's job, orchestrated by the
upload endpoint. Keeping this file pure means it's trivially unit-testable
with plain floats, and the flakiest part of the stack (yfinance) never
touches this file.

Fire behavior (see discussion): when the running jar total crosses
ROUNDUP_THRESHOLD, the ENTIRE running total is invested and the jar resets
to 0 — no fixed-amount lots, no remainder carried forward mid-fire. This
matches the project's existing "no ledger<->transaction traceability"
stance and produces more natural-looking variable investment amounts for
the demo.
"""

import math
from dataclasses import dataclass, field
from datetime import date

from app.config import settings
from app.schemas import TransactionIn


def compute_roundup(amount: float) -> float:
    """
    Rounds UP (never down) to the nearest ROUNDUP_UNIT and returns the
    difference. E.g. with ROUNDUP_UNIT=10: amount=44 -> next_unit=50 ->
    roundup=6. An amount that's already an exact multiple of the unit
    (e.g. 300 with unit 10) correctly yields a roundup of 0.
    """
    unit = settings.ROUNDUP_UNIT
    next_unit = math.ceil(amount / unit) * unit
    # round() guards against float imprecision (e.g. 0.6000000000000005)
    return round(next_unit - amount, 2)


@dataclass
class ProcessedTransaction:
    """One input transaction, annotated with its computed roundup."""
    transaction: TransactionIn
    roundup_amount: float


@dataclass
class FiredInvestment:
    """
    A single threshold-crossing event. Carries only what ledger_service
    needs to actually execute the buy (amount + the date to price it on) —
    no asset/ticker here, since roundup.py doesn't know about assets.
    """
    amount_invested: float
    purchase_date: date


@dataclass
class RoundupResult:
    """Everything the upload endpoint needs after processing a batch."""
    processed_transactions: list[ProcessedTransaction] = field(default_factory=list)
    fired_investments: list[FiredInvestment] = field(default_factory=list)
    pending_balance_after: float = 0.0


def process_transactions(
    transactions: list[TransactionIn],
    starting_balance: float,
) -> RoundupResult:
    """
    Walks `transactions` IN ORDER (caller's responsibility to have them
    chronologically sorted — see synthetic_data.py's ordering note) and:

      - computes each one's roundup_amount
      - accumulates a running jar total, starting from starting_balance
        (i.e. the user's persisted pending_roundup_balance, so the jar
        carries over across separate uploads)
      - whenever the running total >= ROUNDUP_THRESHOLD, fires: the WHOLE
        running total becomes a FiredInvestment, and the jar resets to 0
      - returns everything needed to (a) persist Transaction rows with
        their roundup_amount, (b) hand fired investments to
        ledger_service for actual execution, and (c) persist the final
        leftover jar balance back onto the user row.

    No DB session, no commits — caller does all persistence.
    """
    running_total = starting_balance
    processed: list[ProcessedTransaction] = []
    fired: list[FiredInvestment] = []

    for txn in transactions:
        roundup_amount = compute_roundup(txn.amount)
        processed.append(
            ProcessedTransaction(transaction=txn, roundup_amount=roundup_amount)
        )

        running_total = round(running_total + roundup_amount, 2)

        if running_total >= settings.ROUNDUP_THRESHOLD:
            fired.append(
                FiredInvestment(
                    amount_invested=running_total,
                    purchase_date=txn.date,
                )
            )
            running_total = 0.0

    return RoundupResult(
        processed_transactions=processed,
        fired_investments=fired,
        pending_balance_after=running_total,
    )