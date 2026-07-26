"""
app/routers/dashboard.py

Single endpoint: the one-page dashboard. All aggregation logic lives in
services/portfolio.py (build_dashboard) — this router just authenticates
the caller and hands back whatever that function computes.

No query params (date filters, etc.) — the whole dashboard spec is
"show full history," not a filtered view, so there's nothing to parse
here. Keeping this file intentionally thin: if something's wrong with
the numbers, the bug is in portfolio.py, not here.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import DashboardResponse
from app.auth.dependencies import get_current_user
from app.services import portfolio

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Guards against a user hitting this before completing onboarding.
    # Shouldn't happen in the normal flow — frontend checks asset_bucket
    # right after login/register and redirects to /choose-bucket first —
    # but this is a cheap safety net in case that redirect is ever
    # skipped or bypassed directly via the API.
    if current_user.asset_bucket is None:
        raise HTTPException(
            status_code=400,
            detail="Complete onboarding (select an asset bucket) before viewing the dashboard.",
        )

    return portfolio.build_dashboard(db, current_user)