"""AlertLog model — surfaces critical overdue tasks and TTT conflicts to the UI."""
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, Text, ForeignKey, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column
from backend.db.base import Base


class AlertLog(Base):
    __tablename__ = "alert_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    alert_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    # critical_overdue | ttt_conflict | schedule_gap | asset_critical | unscheduled_critical
    task_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("maintenance_tasks.id", ondelete="CASCADE"), nullable=True
    )
    schedule_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    section_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="high")  # critical|high|medium
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), index=True)

    def __repr__(self) -> str:
        return f"<Alert [{self.severity}] {self.alert_type}: {self.message[:50]}>"
