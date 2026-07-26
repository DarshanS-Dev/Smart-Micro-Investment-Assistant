import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# --- Load DATABASE_URL from environment ---
# Expected format (Neon gives you this on your project dashboard):
#   postgresql://<user>:<password>@<host>/<dbname>?sslmode=require
RAW_DATABASE_URL = os.getenv("DATABASE_URL")

if not RAW_DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Add it to your .env file "
        "(copy the connection string from your Neon dashboard)."
    )

# Neon sometimes provides "postgresql://" or "postgres://" —
# SQLAlchemy needs the driver explicitly named as "postgresql+psycopg2://"
DATABASE_URL = RAW_DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# Neon requires SSL — if sslmode isn't already in the URL, force it
if "sslmode" not in DATABASE_URL:
    separator = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL = f"{DATABASE_URL}{separator}sslmode=require"


engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# --- FastAPI dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()