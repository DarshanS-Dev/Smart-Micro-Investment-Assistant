"""
app/services/price_fetcher.py

The ONLY file that talks to yfinance. Two jobs:

    1. get_historical_prices(asset, start, end) -> dict[date, float]
       Batch-fetches OHLC data once for a date range and returns a
       date -> closing price lookup. Used so ledger_service can price a
       fired investment on the exact date it occurred, without hitting
       yfinance once per transaction.

    2. get_current_price(asset) -> float
       Single live-price lookup, used by the dashboard to mark-to-market
       existing ledger holdings (current_value calculations).

Ticker resolution goes through utils/constants.YFINANCE_TICKERS, so this
file never hardcodes a ticker string itself.
"""

from datetime import date

import yfinance as yf

from app.utils.constants import AssetBucket, YFINANCE_TICKERS


def _ticker_for(asset: AssetBucket) -> str:
    if asset not in YFINANCE_TICKERS:
        raise ValueError(f"Unknown asset bucket: {asset!r}")
    return YFINANCE_TICKERS[asset]


def get_historical_prices(
    asset: AssetBucket,
    start: date,
    end: date,
) -> dict[date, float]:
    """
    Batch-fetches daily closing prices for `asset` between start and end
    (inclusive-ish — yfinance's `end` param is exclusive, so we pad it by
    one day to make sure the last day in range is actually included).

    Returns a dict keyed by date for O(1) lookups, e.g.:
        {date(2026, 7, 1): 142.35, date(2026, 7, 2): 143.10, ...}

    If the market was closed on a given date (weekend/holiday), that date
    simply won't be a key in the returned dict — callers must handle
    fallback (e.g. use the most recent prior trading day's price).
    """
    ticker = _ticker_for(asset)
    # yfinance's `end` is exclusive, so add a day to include `end` itself
    padded_end = end.fromordinal(end.toordinal() + 1)

    history = yf.Ticker(ticker).history(start=start, end=padded_end)

    if history.empty:
        return {}

    prices: dict[date, float] = {}
    for timestamp, row in history.iterrows():
        prices[timestamp.date()] = round(float(row["Close"]), 4)

    return prices


def get_price_on_or_after(
    prices: dict[date, float],
    target: date,
) -> float:
    """
    Helper for the common "market was closed on this exact date" case.
    Given a date->price dict (from get_historical_prices) and a target
    date, returns the price on that date if present, otherwise walks
    FORWARD to the nearest later date that has a price.

    Forward (not backward) is deliberate: a purchase can only execute at
    a price the market actually offers at or after the transaction date
    (e.g. a Saturday spend gets invested at Monday's opening trade,
    not Friday's already-past closing price) — mirrors how a real
    round-up buy would actually settle.

    Raises ValueError if no price exists on or after target at all
    (e.g. target is past the entire fetched range — caller fetched too
    narrow a window).
    """
    if target in prices:
        return prices[target]

    later_dates = [d for d in prices if d > target]
    if not later_dates:
        raise ValueError(
            f"No price available on or after {target} in the fetched range"
        )
    return prices[min(later_dates)]


def get_current_price(asset: AssetBucket) -> float:
    """
    Live/most-recent price lookup for dashboard mark-to-market. Uses
    yfinance's fast_info, which is a lighter-weight call than pulling
    full history just to read the last row.
    """
    ticker = _ticker_for(asset)
    info = yf.Ticker(ticker).fast_info
    return round(float(info["lastPrice"]), 4)