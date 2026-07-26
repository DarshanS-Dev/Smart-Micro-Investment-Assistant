from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

# --- Resolve DATABASE_URL via pydantic-settings (config.py) ---
# Settings.DATABASE_URL is a required field with no default, so if it's
# missing from .env / the real environment, pydantic-settings raises a
# clear validation error the moment `settings` is imported anywhere in
# the app — fails loudly at startup, same spirit as the old RuntimeError,
# but now there's exactly ONE place (config.py) responsible for reading
# env vars, instead of this file also reaching into os.getenv directly.
RAW_DATABASE_URL = settings.DATABASE_URL

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