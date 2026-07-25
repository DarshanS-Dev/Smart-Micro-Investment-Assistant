"""
app/auth/jwt_handler.py

Create + verify JWTs. Uses python-jose (already in requirements.txt).
Password hashing lives here too (bcrypt directly — NOT passlib, per
your earlier decision, since passlib is unmaintained and breaks with
bcrypt>=4.0).
"""

from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> int:
    """Returns the user_id encoded in the token. Raises JWTError if invalid/expired."""
    payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    return int(payload["sub"])