from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# --- Load DATABASE_URL from environment ---
RAW_DATABASE_URL = settings.DATABASE_URL

# Neon sometimes provides "postgresql://" or "postgres://" —
# SQLAlchemy needs the driver explicitly named as "postgresql+psycopg2://"
DATABASE_URL = RAW_DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# Only add sslmode=require for cloud/remote databases (not localhost/sqlite)
is_local = "localhost" in DATABASE_URL or "127.0.0.1" in DATABASE_URL or "sqlite" in DATABASE_URL
if not is_local and "sslmode" not in DATABASE_URL:
    separator = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL = f"{DATABASE_URL}{separator}sslmode=require"


if "sqlite" in DATABASE_URL:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
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