"""User model — replaces Mongoose User.js."""
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Enum, func
from sqlalchemy.orm import Mapped, mapped_column
from backend.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        Enum("admin", "section_controller", "dept_engineer", name="user_role", native_enum=False),
        default="dept_engineer",
    )
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    zonal_railway: Mapped[str] = mapped_column(String(100), default="Northern Railway")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"
