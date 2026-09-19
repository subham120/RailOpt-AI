"""
BlockSchedule model — replaces Mongoose BlockSchedule.js.
Extended with availability_score, ttt_conflicts, and carry-forward fields.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    String, Boolean, Integer, Float, DateTime, Text,
    ForeignKey, Enum, Index, func, Uuid, JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.db.base import Base


class BlockSchedule(Base):
    __tablename__ = "block_schedules"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    schedule_id: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)

    # Location
    section_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    section_name: Mapped[str] = mapped_column(String(200), default="")
    zone_code: Mapped[str | None] = mapped_column(String(20), default="NR", index=True)

    # Timing
    window_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    window_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    total_duration_min: Mapped[int] = mapped_column(Integer, default=0)

    # Department coordination
    departments: Mapped[list] = mapped_column(JSON, default=list)
    task_ids: Mapped[list] = mapped_column(JSON, default=list)   # UUID strings
    task_id_strings: Mapped[list] = mapped_column(JSON, default=list)  # task_id codes
    is_multi_department: Mapped[bool] = mapped_column(Boolean, default=False)

    # Plan horizon
    plan_type: Mapped[str] = mapped_column(
        Enum("daily", "weekly", "monthly", name="plan_type_enum", native_enum=False), default="weekly"
    )
    week_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    month_year: Mapped[str | None] = mapped_column(String(10), nullable=True)  # "2026-09"
    horizon_label: Mapped[str | None] = mapped_column(String(20), nullable=True)  # "W-36-2026"

    # AI optimization
    optimizer_score: Mapped[float] = mapped_column(Float, default=0.0)
    ai_reasoning: Mapped[str] = mapped_column(Text, default="")
    original_window: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    original_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Asset availability (NEW)
    availability_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    ttt_conflicts: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # [{"train_no": "12301", "conflict_type": "overlap", "overlap_minutes": 15}]

    # Workflow status
    status: Mapped[str] = mapped_column(
        Enum(
            "proposed", "approved", "rejected", "executed", "cancelled",
            name="schedule_status_enum",
            native_enum=False,
        ),
        default="proposed",
        index=True,
    )
    approved_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    approval_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    rejection_reason: Mapped[str] = mapped_column(Text, default="")
    is_overridden: Mapped[bool] = mapped_column(Boolean, default=False)
    override_reason: Mapped[str] = mapped_column(Text, default="")

    # Carry-forward tracking
    carry_forward_from: Mapped[str | None] = mapped_column(String(80), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now()
    )

    approver: Mapped["User"] = relationship("User", foreign_keys=[approved_by])

    __table_args__ = (
        Index("ix_schedules_section_start", "section_id", "window_start"),
        Index("ix_schedules_plan_type_status", "plan_type", "status"),
        Index("ix_schedules_week", "week_number"),
    )

    def __repr__(self) -> str:
        return f"<BlockSchedule {self.schedule_id} [{self.status}]>"


from backend.models.user import User  # noqa: E402, F401
