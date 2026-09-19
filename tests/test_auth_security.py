"""
Unit tests for password hashing and JWT security functions.
"""
from datetime import timedelta
from backend.core.security import hash_password, verify_password, create_access_token, decode_access_token, decode_token


def test_password_hashing():
    """Verify bcrypt hash generation and verification."""
    raw = "RailOpt@2026!Secure"
    hashed = hash_password(raw)

    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_flow():
    """Verify JWT access token creation and decoding."""
    payload = {"sub": "user-12345", "role": "section_controller"}
    token = create_access_token(payload, expires_delta=timedelta(hours=1))

    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded.get("sub") == "user-12345"
    assert decoded.get("role") == "section_controller"


def test_jwt_invalid_token():
    """Malformed token returns None on decoding."""
    assert decode_access_token("invalid.token.string") is None
