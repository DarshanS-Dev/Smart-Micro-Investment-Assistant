"""
app/main.py

Entry point. Wires together: DB table creation (create_all — no Alembic
yet, deliberately skipped for hackathon speed, see config discussion),
CORS, and routers.

NOTE: onboarding.py and dashboard.py aren't built yet. Their
include_router lines are left commented out below — uncomment the
two marked lines the moment those files exist. Everything else here
is runnable right now with just auth + transactions.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth, transactions
# from app.routers import onboarding, dashboard  

app = FastAPI(title="Smart Expense & Micro-Investment Assistant")

# --- CORS ---
# Wildcarded for hackathon speed — frontend origin isn't fixed/known yet.
# Fine for a demo, would need locking down for anything real.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    """
    create_all() instead of Alembic (not set up yet — deliberate call,
    revisit only if time permits at the very end). Creates any tables
    that don't exist yet; no-ops for ones that already do. Won't alter
    existing tables, but that's not a concern on a fresh Neon DB.

    Wrapped in try/except so a bad DATABASE_URL or connection issue
    fails LOUDLY at startup instead of surfacing later as a confusing
    500 on the first request that touches the DB.
    """
    try:
        Base.metadata.create_all(bind=engine)
        print("[startup] DB connected, tables ensured.")
    except Exception as exc:
        print(f"[startup] DB CONNECTION FAILED: {exc}")
        raise


@app.get("/health")
def health_check():
    return {"status": "ok"}


# --- Routers ---
# Prefixes (e.g. "/auth", "/transactions") live inside each router file,
# not here — main.py just includes them.
app.include_router(auth.router)
app.include_router(transactions.router)
# app.include_router(onboarding.router)  
# app.include_router(dashboard.router)   