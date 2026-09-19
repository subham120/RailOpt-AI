"""AuditLog model — replaces Mongoose AuditLog.js."""
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column
from backend.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    user_name: Mapped[str] = mapped_column(String(100), default="System")
    target_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    target_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    details: Mapped[str] = mapped_column(Text, default="")
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), index=True)

    def __repr__(self) -> str:
        return f"<AuditLog {self.action} by {self.user_name}>"
