"""
app/config.py

Single source of truth for env-backed settings + tunable constants.
Everything else (database.py, auth/jwt_handler.py, services/*) imports
from here instead of reading os.environ directly.

Uses pydantic-settings (BaseSettings) instead of a plain class, to stay
consistent with the rest of the codebase (schemas.py, FastAPI) being
Pydantic-first end to end. Bonus: automatic type coercion + validation,
and .env is loaded declaratively via Config.env_file instead of a
separate load_dotenv() call.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- Database (Neon) ---
    DATABASE_URL: str

    # --- JWT ---
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440

    # --- Round-up jar ---
    # Real-world equivalent would be ~₹400-500 (mirrors Acorns' ~$5 threshold).
    # Set artificially low here so it visibly fires multiple times during a
    # demo dataset. This is the one knob to bump up before a "serious" demo
    # and back down for a "watch it fire live" demo.
    ROUNDUP_THRESHOLD: float = 50.0

    # --- Dashboard polling (frontend reference only, not enforced server-side) ---
    DASHBOARD_POLL_SECONDS: int = 12

    class Config:
        env_file = ".env"


settings = Settings()