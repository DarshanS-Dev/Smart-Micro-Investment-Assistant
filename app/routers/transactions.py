"""
app/routers/transactions.py

The single ingestion endpoint. Real CSV uploads and synthetic-generator
runs both end up as list[TransactionIn] and flow through the SAME
processing path from there — no separate synthetic endpoint (per
earlier decision), just an optional query flag for demo/dev use.

This file is the ONLY writer/committer for this flow. roundup.py and
ledger_service.py stay pure (no Session) by design — all DB writes
happen here, in one commit.

Partial-success behavior (agreed): transactions ALWAYS persist. If
ledger_service.execute_investments fails (yfinance couldn't price the
batch), the jar is NOT reset — we add back the full sum of that
batch's fired_investments on top of pending_balance_after, so the
user's spare change is never silently lost. Still one commit either way.
"""

import csv
import io

from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models import User, Transaction, Ledger
from app.schemas import TransactionIn, UploadResponse, InvestmentFired
from app.services import synthetic_data, roundup, ledger_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _parse_csv(raw_bytes: bytes) -> list[TransactionIn]:
    """
    Expects columns: date, merchant, amount (header row required).
    Pydantic does the actual type coercion/validation per row via
    TransactionIn — this function just walks the CSV rows.
    """
    text = raw_bytes.decode("utf-8-sig")  # -sig handles Excel's BOM
    reader = csv.DictReader(io.StringIO(text))

    rows: list[TransactionIn] = []
    for i, row in enumerate(reader):
        try:
            rows.append(
                TransactionIn(
                    date=row["date"],
                    merchant=row["merchant"],
                    amount=row["amount"],
                )
            )
        except (KeyError, ValueError) as e:
            raise HTTPException(
                status_code=422,
                detail=f"Row {i + 1} in CSV is malformed: {e}",
            )

    rows.sort(key=lambda t: t.date)  # same chronological requirement as synthetic_data
    return rows


@router.post("/upload", response_model=UploadResponse)
def upload_transactions(
    file: UploadFile | None = File(None),
    use_synthetic: bool = Query(
        False,
        description="Dev/demo flag: generate synthetic transactions instead of parsing `file`.",
    ),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.asset_bucket is None:
        raise HTTPException(
            status_code=400,
            detail="Pick an asset bucket before uploading transactions.",
        )

    # --- 1. get input transactions, either source, same downstream shape ---
    if use_synthetic:
        incoming = synthetic_data.generate_transactions()
    else:
        if file is None:
            raise HTTPException(
                status_code=400,
                detail="No file provided. Pass a CSV file or set use_synthetic=true.",
            )
        incoming = _parse_csv(file.file.read())

    if not incoming:
        raise HTTPException(status_code=400, detail="No transactions to ingest.")

    # --- 2. round-up processing (pure, no DB, no network) -------------------
    result = roundup.process_transactions(
        incoming, starting_balance=user.pending_roundup_balance
    )

    # --- 3. persist Transaction rows — ALWAYS, regardless of what happens
    #        with investment execution below.
    for processed in result.processed_transactions:
        db.add(
            Transaction(
                user_id=user.id,
                date=processed.transaction.date,
                merchant=processed.transaction.merchant,
                amount=processed.transaction.amount,
                roundup_amount=processed.roundup_amount,
            )
        )

    # --- 4. try to execute any fired investments --------------------------
    investments_executed: list[InvestmentFired] = []
    pending_balance_after = result.pending_balance_after

    if result.fired_investments:
        try:
            executed = ledger_service.execute_investments(
                result.fired_investments, asset=user.asset_bucket
            )
            for ex in executed:
                db.add(
                    Ledger(
                        user_id=user.id,
                        amount_invested=ex.amount_invested,
                        asset=ex.asset,
                        price_at_purchase=ex.price_at_purchase,
                        purchase_date=ex.purchase_date,
                    )
                )
                investments_executed.append(
                    InvestmentFired(
                        amount_invested=ex.amount_invested,
                        asset=ex.asset,
                        price_at_purchase=ex.price_at_purchase,
                        purchase_date=ex.purchase_date,
                    )
                )
        except ValueError:
            # yfinance couldn't price this batch — jar money isn't lost.
            # Add back the FULL sum of every fire in this batch on top of
            # the already-computed leftover, so nothing vanishes.
            unpriced_total = sum(fi.amount_invested for fi in result.fired_investments)
            pending_balance_after = round(
                result.pending_balance_after + unpriced_total, 2
            )
            # investments_executed stays [] — no fake "invested!" moment.

    # --- 5. persist final jar balance + commit everything, once -----------
    user.pending_roundup_balance = pending_balance_after
    db.add(user)
    db.commit()

    return UploadResponse(
        transactions_ingested=len(result.processed_transactions),
        investments_executed=investments_executed,
        pending_balance_after=pending_balance_after,
    )