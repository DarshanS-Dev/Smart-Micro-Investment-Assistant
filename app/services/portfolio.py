"""
app/services/portfolio.py

Builds the single DashboardResponse payload. Read + compute only — no
writes, no commits. Takes an already-open Session (read-only use) plus
the user, queries their Transaction + Ledger rows, and derives every
field schemas.DashboardResponse needs.

Nothing here is cached — recomputed fresh on every dashboard poll
(DASHBOARD_POLL_SECONDS), including a live yfinance current-price call.
"""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.models import User, Transaction, Ledger
from app.services.price_fetcher import get_current_price
from app.schemas import (
    DashboardResponse,
    AssetBreakdown,
    GrowthPoint,
    LedgerLotOut,
    TransactionFeedItem,
    CategoryInsight,
)


def build_dashboard(db: Session, user: User) -> DashboardResponse:
    ledger_rows: list[Ledger] = (
        db.query(Ledger)
        .filter(Ledger.user_id == user.id)
        .order_by(Ledger.purchase_date.asc(), Ledger.id.asc())
        .all()
    )
    transactions: list[Transaction] = (
        db.query(Transaction)
        .filter(Transaction.user_id == user.id)
        .order_by(Transaction.date.asc(), Transaction.id.asc())
        .all()
    )

    # --- current price(s) --------------------------------------------------
    assets_held = {row.asset for row in ledger_rows}
    current_prices: dict[str, float] = {
        asset: get_current_price(asset) for asset in assets_held
    }
    price_updated_at = datetime.now(timezone.utc)

    # --- per-lot + running totals -------------------------------------
    lots: list[LedgerLotOut] = []
    growth_series: list[GrowthPoint] = []
    total_invested = 0.0
    current_value = 0.0
    per_asset_totals: dict[str, dict[str, float]] = {}

    running_value = 0.0
    for row in ledger_rows:
        units = round(row.amount_invested / row.price_at_purchase, 6)
        price_now = current_prices[row.asset]
        value_now = round(units * price_now, 2)

        lots.append(
            LedgerLotOut(
                purchase_date=row.purchase_date,
                asset=row.asset,
                amount_invested=row.amount_invested,
                price_at_purchase=row.price_at_purchase,
                current_units=units,
                current_value=value_now,
            )
        )

        total_invested += row.amount_invested
        current_value += value_now

        running_value += value_now
        growth_series.append(
            GrowthPoint(date=row.purchase_date, value=round(running_value, 2))
        )

        bucket = per_asset_totals.setdefault(
            row.asset, {"total_invested": 0.0, "current_value": 0.0}
        )
        bucket["total_invested"] += row.amount_invested
        bucket["current_value"] += value_now

    total_invested = round(total_invested, 2)
    current_value = round(current_value, 2)
    gain_loss_amount = round(current_value - total_invested, 2)
    # Guard divide-by-zero for a brand new user with zero investments yet.
    gain_loss_percent = (
        round((gain_loss_amount / total_invested) * 100, 2) if total_invested > 0 else 0.0
    )

    per_asset = [
        AssetBreakdown(
            asset=asset,
            total_invested=round(totals["total_invested"], 2),
            current_value=round(totals["current_value"], 2),
        )
        for asset, totals in per_asset_totals.items()
    ]

    # --- transaction feed: infer accumulating vs invested status ----------
    # No FK from ledger back to transactions (by design). We replay the
    # SAME running-jar logic as roundup.process_transactions, in the same
    # chronological order, and match each reset point against the ledger
    # rows (already sorted by purchase_date/id above) IN ORDER. Whenever
    # the replayed running total matches the next unconsumed ledger row's
    # amount_invested, every transaction accumulated so far is stamped
    # "invested" and the counter resets — mirroring exactly how the jar
    # fired for real at ingestion time.
    transaction_feed: list[TransactionFeedItem] = []
    running_roundup = 0.0
    ledger_pointer = 0
    pending_group: list[Transaction] = []

    for txn in transactions:
        pending_group.append(txn)
        running_roundup = round(running_roundup + txn.roundup_amount, 2)

        if (
            ledger_pointer < len(ledger_rows)
            and running_roundup >= ledger_rows[ledger_pointer].amount_invested
        ):
            # This group's jar-fill matches the next ledger row — stamp
            # every transaction in this group "invested".
            for t in pending_group:
                transaction_feed.append(
                    TransactionFeedItem(
                        date=t.date,
                        merchant=t.merchant,
                        amount=t.amount,
                        roundup_amount=t.roundup_amount,
                        cumulative_roundup=running_roundup,
                        category=t.category,
                        status="invested",
                    )
                )
            pending_group = []
            running_roundup = 0.0
            ledger_pointer += 1

    # Whatever's left in pending_group never crossed threshold yet —
    # still sitting in the jar, i.e. "accumulating".
    for t in pending_group:
        transaction_feed.append(
            TransactionFeedItem(
                date=t.date,
                merchant=t.merchant,
                amount=t.amount,
                roundup_amount=t.roundup_amount,
                cumulative_roundup=running_roundup,
                category=t.category,
                status="accumulating",
            )
        )

    # --- category insights: "how much of your investment did this
    # category fund" ------------------------------------------------------
    # Deliberately counts ONLY transactions already stamped "invested"
    # above (i.e. their roundup actually crossed threshold and became a
    # real ledger row) — money still sitting in the jar ("accumulating")
    # hasn't funded anything yet, so it's excluded here. This keeps the
    # framing honest: "Swiggy has funded ₹340 so far", not a projection.
    #
    # Reuses transaction_feed (already built above) instead of re-querying
    # or re-replaying the jar logic a second time.
    category_totals: dict[str, dict[str, float]] = {}
    for item in transaction_feed:
        if item.status != "invested":
            continue
        cat = item.category or "Other"
        bucket = category_totals.setdefault(
            cat, {"total_spent": 0.0, "roundup_generated": 0.0}
        )
        bucket["total_spent"] += item.amount
        bucket["roundup_generated"] += item.roundup_amount

    category_insights = [
        CategoryInsight(
            category=cat,
            total_spent=round(totals["total_spent"], 2),
            roundup_generated=round(totals["roundup_generated"], 2),
        )
        for cat, totals in category_totals.items()
    ]
    # Sort by roundup_generated descending — frontend's donut chart / list
    # reads better biggest-contributor-first (e.g. "Swiggy funded ₹340").
    category_insights.sort(key=lambda c: c.roundup_generated, reverse=True)

    return DashboardResponse(
        total_invested=total_invested,
        current_value=current_value,
        gain_loss_amount=gain_loss_amount,
        gain_loss_percent=gain_loss_percent,
        price_updated_at=price_updated_at,
        growth_series=growth_series,
        lots=lots,
        per_asset=per_asset,
        transaction_feed=transaction_feed,
        pending_roundup_balance=user.pending_roundup_balance,
        roundup_threshold=settings.ROUNDUP_THRESHOLD,
        category_insights=category_insights,
    )