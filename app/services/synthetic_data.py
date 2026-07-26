"""
app/services/synthetic_data.py

Generates fake-but-realistic transaction data for testing and demo
fallback purposes. Output is a list of schemas.TransactionIn objects —
the exact same shape a parsed CSV row is coerced into. This means the
generator doesn't have its own ingestion path: whatever calls this
feeds the result through the SAME upload/ingestion pipeline a real
CSV would go through (round-up calc, ledger firing, etc. all happen
downstream, not here).

This file does NOT compute roundup_amount and does NOT touch the DB —
that's roundup.py's and the ingestion endpoint's job respectively.
Keeps responsibilities separated: this file only fakes "what a bank
statement looks like."
"""

import random
from datetime import date, timedelta

from app.schemas import TransactionIn

# Merchant pool. Category isn't stored here — categorizer.py (if it
# survives the cut) will map merchant -> category later via its own
# lookup table. Keeping this list category-agnostic avoids duplicating
# that mapping in two places.
MERCHANTS = [
    "Swiggy", "Zomato", "Amazon", "Flipkart", "Uber", "Ola",
    "BigBasket", "DMart", "Starbucks", "Chai Point", "PVR Cinemas",
    "Netflix", "Spotify", "Local Grocery", "Apollo Pharmacy",
    "Reliance Digital", "IRCTC", "BookMyShow", "Myntra", "Domino's",
]

# Amount distribution: most spends are small/everyday, a minority are
# larger (shopping, electronics, travel). Roughly mirrors real spend
# patterns and guarantees enough small transactions for round-ups to
# actually accumulate toward the threshold within the demo window.
SMALL_SPEND_RANGE = (50, 300)
LARGE_SPEND_RANGE = (500, 3000)
LARGE_SPEND_PROBABILITY = 0.2


def _random_amount() -> float:
    if random.random() < LARGE_SPEND_PROBABILITY:
        amount = random.uniform(*LARGE_SPEND_RANGE)
    else:
        amount = random.uniform(*SMALL_SPEND_RANGE)
    return round(amount, 2)


def generate_transactions(
    num_days: int = 30,
    avg_per_day: float = 2.5,
) -> list[TransactionIn]:
    """
    Generates transactions spread over the last `num_days` days
    (today going backward), averaging `avg_per_day` transactions/day.

    Returns transactions sorted chronologically (oldest first) — the
    order round-ups must be processed in, per the ordering note on
    Transaction.date in models.py.
    """
    today = date.today()
    transactions: list[TransactionIn] = []

    for day_offset in range(num_days, 0, -1):
        txn_date = today - timedelta(days=day_offset)

        # Random count around avg_per_day, minimum 0 (some days you
        # just don't spend — keeps it from looking mechanically uniform).
        count_today = max(0, round(random.gauss(avg_per_day, 1.2)))

        for _ in range(count_today):
            transactions.append(
                TransactionIn(
                    date=txn_date,
                    merchant=random.choice(MERCHANTS),
                    amount=_random_amount(),
                )
            )

    # Already built oldest-day-first, but multiple same-day transactions
    # aren't ordered relative to each other — stable sort by date keeps
    # same-day entries in insertion order, which is fine since roundup
    # logic only cares about date-level chronology, not intra-day order.
    transactions.sort(key=lambda t: t.date)
    return transactions