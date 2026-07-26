"""
app/services/ledger_service.py

Turns a batch of FiredInvestment events (from roundup.process_transactions)
into priced, unit-computed investments ready for the upload endpoint to
persist as Ledger rows.

Deliberately does NOT:
    - open a DB Session, or commit anything (same rule as roundup.py —
      the upload endpoint is the single writer/committer)
    - decide the asset — that's the user's onboarding choice, passed in
      as a plain argument, not looked up here

One batch fetch, not one call per fire: if `fired_investments` has
multiple entries (a single upload can cross ROUNDUP_THRESHOLD more than
once), we fetch the whole date range from yfinance ONCE via
price_fetcher.get_historical_prices, then look each fire's price up
from that single in-memory dict. Keeps this the flakiest-dependency
surface area as small as possible.
"""

from dataclasses import dataclass
from datetime import date, timedelta

from app.services.price_fetcher import get_historical_prices, get_price_on_or_after
from app.services.roundup import FiredInvestment
from app.utils.constants import AssetBucket

# How far PAST the last fired investment's purchase_date to pad the
# fetch window. Covers weekends + a run of adjacent public holidays so
# get_price_on_or_after always has a future trading day to fall back on.
# Lives here (not in price_fetcher.py) because it's a ledger-execution
# concern, not a generic price-fetching concern.
END_PADDING_DAYS = 5


@dataclass
class ExecutedInvestment:
    """
    One fired investment, now priced and unit-computed. Mirrors the
    Ledger model's persisted columns (amount_invested, asset,
    price_at_purchase, purchase_date) plus `units`, which the upload
    endpoint needs immediately to build the response's InvestmentFired
    list — units itself is never stored (same "computed, not persisted"
    convention as LedgerLotOut.current_units in schemas.py).
    """
    amount_invested: float
    asset: str
    price_at_purchase: float
    purchase_date: date
    units: float


def execute_investments(
    fired_investments: list[FiredInvestment],
    asset: AssetBucket,
) -> list[ExecutedInvestment]:
    """
    Prices each FiredInvestment on-or-after its purchase_date and
    computes units = amount_invested / price_at_purchase.

    Returns [] immediately, with NO yfinance call, if fired_investments
    is empty — most uploads won't cross threshold, and we never want to
    hit the network (the flakiest part of the stack) for nothing.

    Raises ValueError if price_fetcher can't find a price on or after
    some fire's purchase_date within the padded range (propagated raw,
    not wrapped — the upload endpoint is the single place that maps
    exceptions to HTTP responses).
    """
    if not fired_investments:
        return []

    purchase_dates = [fi.purchase_date for fi in fired_investments]
    start = min(purchase_dates)
    # Pad end so a fire near the tail of the batch still has a future
    # trading day available for forward-fill.
    end = max(purchase_dates) + timedelta(days=END_PADDING_DAYS)

    prices = get_historical_prices(asset, start, end)

    executed: list[ExecutedInvestment] = []
    for fi in fired_investments:
        price = get_price_on_or_after(prices, fi.purchase_date)
        units = round(fi.amount_invested / price, 6)

        executed.append(
            ExecutedInvestment(
                amount_invested=fi.amount_invested,
                asset=asset,
                price_at_purchase=price,
                purchase_date=fi.purchase_date,
                units=units,
            )
        )

    return executed