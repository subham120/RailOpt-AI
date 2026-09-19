"""
Unit tests for RailOpt AI Assistant multi-turn memory and dynamic RAG retrieval.
"""
from fastapi.testclient import TestClient
from backend.main import app
from backend.core.security import create_access_token
from backend.db.database import SessionLocal
from backend.models.user import User

client = TestClient(app)


def _get_auth_token():
    try:
        with SessionLocal() as db:
            user = db.query(User).filter(User.role == "admin", User.is_active == True).first()
            if user:
                return create_access_token({"sub": str(user.id), "role": user.role})
    except Exception:
        pass
    return create_access_token({"sub": "test-admin", "role": "admin"})


def test_assistant_suggestions():
    """Verify suggestions endpoint returns valid railway guidance prompts."""
    token = _get_auth_token()
    response = client.get(
        "/api/assistant/suggestions",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["suggestions"]) > 0


def test_assistant_chat_multi_turn_fallback():
    """Verify multi-turn request structure is accepted and returns formatted response."""
    token = _get_auth_token()
    payload = {
        "message": "Which critical defects are overdue in Kanpur section?",
        "history": [
            {"role": "user", "content": "Hello, I need maintenance advice for Northern Railway."},
            {"role": "assistant", "content": "I can help with track defects, signal maintenance, and block possessions."},
        ],
        "context_type": "general",
    }
    response = client.post(
        "/api/assistant/chat",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "response" in data
    assert isinstance(data["context_used"], list)
