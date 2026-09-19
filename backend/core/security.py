"""JWT creation, verification, and password hashing.

Robust password hashing with bcrypt + standard library PBKDF2 fallback.
"""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

try:
    import jwt
    from jwt.exceptions import PyJWTError as JWTError
except ImportError:
    from jose import JWTError, jwt  # type: ignore

try:
    import bcrypt
    _HAS_BCRYPT = True
except ImportError:
    _HAS_BCRYPT = False

from backend.core.config import settings


def hash_password(plain: str) -> str:
    """Hash a plaintext password using bcrypt or PBKDF2-SHA256."""
    if _HAS_BCRYPT:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(plain.encode("utf-8"), salt).decode("utf-8")
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"pbkdf2:sha256${salt}${key.hex()}"


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against its stored hash."""
    if not hashed:
        return False
    try:
        if hashed.startswith("$2b$") or hashed.startswith("$2a$"):
            if _HAS_BCRYPT:
                return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
            return False
        if hashed.startswith("pbkdf2:sha256$"):
            _, salt, key_hex = hashed.split("$")
            expected = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
            return hmac.compare_digest(expected, key_hex)
        return False
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token using timezone-aware UTC datetime."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    """Raise JWTError if token is invalid or expired."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def decode_access_token(token: str) -> dict | None:
    """Safely decode token and return payload, or None on error."""
    try:
        return decode_token(token)
    except Exception:
        return None
