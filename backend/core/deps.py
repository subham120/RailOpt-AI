"""FastAPI dependency injection: DB session, current user, role guards."""
import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.core.security import decode_token, JWTError
from backend.models.user import User

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = decode_token(token)
        user_id_raw = payload.get("sub")
        if not user_id_raw:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

    user_id = str(user_id_raw)
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return current_user


def require_controller_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("admin", "section_controller"):
        raise HTTPException(status_code=403, detail="Section controller or admin role required")
    return current_user
