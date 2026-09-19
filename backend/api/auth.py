"""Auth router — login, register, me, change-password.

Improvements applied:
  S3: Literal role validation — prevents arbitrary role escalation
  S5: ip_address captured in AuditLog entries
  S6: datetime.utcnow() replaced with datetime.now(timezone.utc)
  Demo2: PUT /change-password endpoint added
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.core.security import verify_password, hash_password, create_access_token
from backend.core.deps import get_current_user, require_admin
from backend.models.user import User
from backend.models.audit_log import AuditLog

logger = logging.getLogger(__name__)
router = APIRouter(tags=["auth"])

# Valid user roles (S3: Literal prevents arbitrary role strings)
UserRole = Literal["admin", "section_controller", "dept_engineer"]


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: UserRole = "dept_engineer"  # S3: validated against Literal
    department: str | None = None
    zonal_railway: str = "Northern Railway"


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class TokenResponse(BaseModel):
    success: bool
    token: str
    user: dict
    data: dict | None = None


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email, User.is_active == True).first()
    if not user or not verify_password(body.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user.id)})

    # S5: capture client IP in audit log
    client_ip = request.client.host if request.client else None
    db.add(AuditLog(
        action="AUTH_LOGIN",
        user_id=user.id,
        user_name=user.name,
        target_type="auth",
        details=f"User {user.email} logged in",
        ip_address=client_ip,
    ))
    db.commit()

    user_dict = {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "department": user.department,
        "zonalRailway": user.zonal_railway,
    }

    return {
        "success": True,
        "token": token,
        "user": user_dict,
        "data": {
            "token": token,
            "user": user_dict,
        },
    }


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "success": True,
        "data": {
            "id": str(current_user.id),
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role,
            "department": current_user.department,
            "zonalRailway": current_user.zonal_railway,
        },
    }


@router.post("/register")
def register(
    body: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        name=body.name,
        email=body.email,
        password=hash_password(body.password),
        role=body.role,
        department=body.department,
        zonal_railway=body.zonal_railway,
    )
    db.add(user)
    db.flush()

    # S5: audit with IP
    client_ip = request.client.host if request.client else None
    db.add(AuditLog(
        action="USER_REGISTER",
        user_id=current_admin.id,
        user_name=current_admin.name,
        target_type="user",
        target_id=str(user.id),
        details=f"Admin registered new user {body.email} with role {body.role}",
        ip_address=client_ip,
    ))
    db.commit()
    db.refresh(user)
    return {"success": True, "data": {"id": str(user.id), "email": user.email, "role": user.role}}


@router.put("/change-password")
def change_password(
    body: ChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Demo2: Allow users to change their own password."""
    if not verify_password(body.current_password, current_user.password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    if len(body.new_password) < 8:
        raise HTTPException(status_code=422, detail="New password must be at least 8 characters")

    current_user.password = hash_password(body.new_password)

    client_ip = request.client.host if request.client else None
    db.add(AuditLog(
        action="PASSWORD_CHANGE",
        user_id=current_user.id,
        user_name=current_user.name,
        target_type="user",
        details="User changed their password",
        ip_address=client_ip,
    ))
    db.commit()
    return {"success": True, "message": "Password changed successfully"}
