"""
app/utils/constants.py

Maps a user's chosen asset_bucket (validated at the schema layer via
schemas.AssetBucket) to the actual yfinance ticker each bucket needs.

MVP scope: two buckets only, both sourced from yfinance. Crypto/CoinGecko
was cut deliberately — one price source (yfinance) is enough for the demo
and avoids maintaining a second API integration under time pressure.

We use ETF tickers for nifty50/gold (not the raw index/spot price)
because the product pitch is "we bought units of a real, investable
instrument" — matches how amount_invested / price_at_purchase /
current_units math is framed everywhere else in the app.
"""

from typing import Literal

AssetBucket = Literal["nifty50", "gold"]

# yfinance tickers — single lookup, since every bucket now comes from yfinance.
YFINANCE_TICKERS: dict[AssetBucket, str] = {
    "nifty50": "NIFTYBEES.NS",  # Nippon India ETF tracking Nifty 50
    "gold": "GOLDBEES.NS",      # Nippon India Gold ETF
}