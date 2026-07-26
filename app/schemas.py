"""
app/schemas.py

Consolidated Pydantic schemas. Single file, not a package — matches the
project's flat-structure decision (see models.py for the ORM equivalents).

Naming convention used throughout:
    *In   -> what the client sends us (request body)
    *Out  -> what we send back (response body), safe to expose
    *Create/*Login -> auth-specific request shapes
No schema here ever includes `hashed_password`.
"""

from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# 1. Auth
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    asset_bucket: Optional[str] = None  # None => frontend redirects to /choose-bucket
    created_at: datetime

    class Config:
        from_attributes = True  # lets you do UserOut.model_validate(db_user)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    """
    Only schema that ever bundles a user + a token together.
    Used at register/login endpoints only — UserOut itself never carries a token.
    """
    user: UserOut
    token: Token


# ---------------------------------------------------------------------------
# 2. Onboarding — asset bucket selection
# ---------------------------------------------------------------------------

# Validated at the schema layer only. DB column stays an unconstrained String
# (per your earlier decision) — this Literal is what actually rejects bad
# values, with a clean 422, before anything touches price_fetcher's ticker map.
AssetBucket = Literal["nifty50", "gold", "crypto"]


class AssetBucketSelect(BaseModel):
    asset_bucket: AssetBucket


# ---------------------------------------------------------------------------
# 3. Transactions / CSV ingestion
# ---------------------------------------------------------------------------

class TransactionIn(BaseModel):
    """
    Shape a parsed CSV row (or synthetic-data row) is coerced into
    before ingestion. roundup_amount and category are NOT here —
    those are computed/filled server-side, never trusted from input.
    """
    date: date
    merchant: str
    amount: float = Field(..., gt=0)


class TransactionOut(BaseModel):
    id: int
    date: date
    merchant: str
    amount: float
    category: Optional[str] = None
    roundup_amount: float

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# 4. Upload response — powers the live "investment executed" demo moment
# ---------------------------------------------------------------------------

class InvestmentFired(BaseModel):
    """One ledger row that got written synchronously during this upload call."""
    amount_invested: float
    asset: str
    price_at_purchase: float
    purchase_date: date


class UploadResponse(BaseModel):
    transactions_ingested: int
    investments_executed: list[InvestmentFired]
    pending_balance_after: float  # jar progress even when nothing fired this call


# ---------------------------------------------------------------------------
# 5. Dashboard — single consolidated response for the one-page dashboard
# ---------------------------------------------------------------------------

class AssetBreakdown(BaseModel):
    asset: str
    total_invested: float
    current_value: float


class GrowthPoint(BaseModel):
    """One point per ledger event (not daily-resampled — see design note)."""
    date: date
    value: float


class LedgerLotOut(BaseModel):
    """
    A single executed investment ("lot"), with computed unit/value fields
    for the collapsible per-lot table under the growth chart.
    current_units / current_value are computed in the service layer,
    never stored — DB only ever stores amount_invested + price_at_purchase.
    """
    purchase_date: date
    asset: str
    amount_invested: float
    price_at_purchase: float
    current_units: float
    current_value: float


class TransactionFeedItem(BaseModel):
    """
    Separate from LedgerLotOut on purpose: there's deliberately no FK from
    ledger back to transactions, so the "spend + roundup" feed and the
    "executed investment" feed are two independently-sourced lists that
    the frontend merges visually by chronology, not by a shared key.
    `status` lets the frontend do "accumulating" vs "included in investment
    on X" row styling without needing a real link.
    """
    date: date
    merchant: str
    amount: float
    roundup_amount: float
    cumulative_roundup: float
    category: Optional[str] = None
    status: Literal["accumulating", "invested"]


class CategoryInsight(BaseModel):
    category: str
    total_spent: float
    roundup_generated: float


class DashboardResponse(BaseModel):
    # A — Summary strip
    total_invested: float
    current_value: float
    gain_loss_amount: float
    gain_loss_percent: float
    price_updated_at: datetime

    # B — Growth chart + per-lot table
    growth_series: list[GrowthPoint]
    lots: list[LedgerLotOut]

    # C — Ledger / transaction feed + threshold progress bar
    per_asset: list[AssetBreakdown]
    transaction_feed: list[TransactionFeedItem]
    pending_roundup_balance: float
    roundup_threshold: float

    # D — Spending insights (frontend renders this block only if non-empty)
    category_insights: list[CategoryInsight] = []