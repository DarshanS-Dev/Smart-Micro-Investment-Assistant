"""
app/routers/onboarding.py

Single endpoint: set the user's asset_bucket once at onboarding.
No "change bucket later" flow — deliberately deferred (see project notes).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import AssetBucketSelect, UserOut
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("/asset-bucket", response_model=UserOut)
def select_asset_bucket(
    payload: AssetBucketSelect,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.asset_bucket = payload.asset_bucket
    db.commit()
    db.refresh(current_user)
    return current_user