from datetime import datetime, timezone, date as date_type

from sqlalchemy import String, Float, Date, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)

    # Chosen once at onboarding: "nifty50" | "gold" | "crypto"
    # Kept as a plain String (validated at the schema layer, not DB layer)
    # so adding/renaming asset options later doesn't require a migration.
    asset_bucket: Mapped[str | None] = mapped_column(String, nullable=True)

    # The "jar" — leftover round-up spare change that hasn't crossed
    # threshold yet. Persists across uploads so nothing is lost between
    # separate CSV uploads / generator runs.
    pending_roundup_balance: Mapped[float] = mapped_column(Float, default=0.0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # One user -> many transactions, many ledger entries
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="user")
    ledger_entries: Mapped[list["Ledger"]] = relationship(back_populates="user")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    # Date of the transaction itself — drives historical price lookups
    # and the chronological order round-ups must be processed in.
    date: Mapped[date_type] = mapped_column(Date)

    merchant: Mapped[str] = mapped_column(String)
    amount: Mapped[float] = mapped_column(Float)

    # Nullable + no default categorization logic wired yet —
    # categorizer.py fills this in later; first thing cut under time pressure.
    category: Mapped[str | None] = mapped_column(String, nullable=True)

    # Computed once at ingestion time (next_unit - amount) and cached here
    # so downstream code never has to recompute it.
    roundup_amount: Mapped[float] = mapped_column(Float)

    user: Mapped["User"] = relationship(back_populates="transactions")


class Ledger(Base):
    __tablename__ = "ledger"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    # No FK back to a specific transaction — a ledger row represents
    # "the jar crossed threshold," which may be funded by several
    # transactions' round-ups combined. Traceability to individual
    # transactions was deliberately dropped as unnecessary for the demo.
    amount_invested: Mapped[float] = mapped_column(Float)

    # Snapshot of the user's asset bucket at the moment this fired —
    # stored redundantly (not just looked up via user_id) in case a user's
    # bucket choice ever changes later; historical ledger rows shouldn't
    # silently reinterpret as a different asset.
    asset: Mapped[str] = mapped_column(String)

    price_at_purchase: Mapped[float] = mapped_column(Float)
    purchase_date: Mapped[date_type] = mapped_column(Date)

    user: Mapped["User"] = relationship(back_populates="ledger_entries")