"""
MaintenanceTask model — replaces Mongoose MaintenanceTask.js.
Extended with real ingestion fields, 5-feature AI scoring, and inspection gap tracking.
"""
import uuid
from datetime import date, datetime
from sqlalchemy import (
    String, Boolean, Integer, Float, Date, DateTime, Text,
    ForeignKey, Enum, Index, func, Uuid, JSON,
)
from sqlalchemy.orm import Mapped, mapped_column
from backend.db.base import Base


class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    task_id: Mapped[str] = mapped_column(String(60), unique=True, nullable=False, index=True)

    # Source system
    source_system: Mapped[str] = mapped_column(
        Enum("TMS", "SMMS", "TDMS", name="source_system_enum", native_enum=False), nullable=False
    )
    department: Mapped[str] = mapped_column(
        Enum("Engineering", "Traction Distribution", "Signal & Telecom", name="dept_enum", native_enum=False),
        nullable=False,
    )
    section_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("corridor_blocks.section_id"), nullable=False
    )
    section_name: Mapped[str] = mapped_column(String(200), default="")
    zone_code: Mapped[str | None] = mapped_column(String(20), default="NR", index=True)

    # Defect details
    defect_type: Mapped[str] = mapped_column(String(200), nullable=False)
    defect_description: Mapped[str] = mapped_column(Text, default="")
    criticality: Mapped[str] = mapped_column(
        Enum("critical", "high", "medium", "low", name="criticality_enum", native_enum=False),
        default="medium",
    )
    reported_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    estimated_duration: Mapped[int] = mapped_column(Integer, nullable=False)  # minutes
    location_km: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Status
    status: Mapped[str] = mapped_column(
        Enum(
            "pending", "scheduled", "approved", "in_progress", "completed", "cancelled",
            name="task_status_enum",
            native_enum=False,
        ),
        default="pending",
        index=True,
    )

    # AI scoring (5-feature model)
    criticality_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    urgency_tier: Mapped[str | None] = mapped_column(String(20), nullable=True)
    score_breakdown: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # {"safety": 0.9, "overdue": 0.3, "traffic": 1.0, "recurrence": 0.4, "inspection_gap": 0.6}
    ai_reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    ml_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    rule_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Historical recurrence
    recurrence_count: Mapped[int] = mapped_column(Integer, default=0)
    last_occurrence: Mapped[date | None] = mapped_column(Date, nullable=True)
    inspection_gap_days: Mapped[int] = mapped_column(Integer, default=0)

    # Data ingestion
    import_source: Mapped[str] = mapped_column(
        Enum("manual", "csv", "api", "seed", "data.gov.in", name="import_source_enum", native_enum=False), default="manual"
    )
    import_batch_id: Mapped[str | None] = mapped_column(String(60), nullable=True)

    # Assignment
    assigned_to: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    notes: Mapped[str] = mapped_column(Text, default="")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        Index("ix_tasks_dept_status", "department", "status"),
        Index("ix_tasks_section", "section_id"),
        Index("ix_tasks_criticality", "criticality"),
    )

    def __repr__(self) -> str:
        return f"<Task {self.task_id} [{self.criticality}] {self.defect_type}>"
