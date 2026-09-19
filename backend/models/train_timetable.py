"""
TrainTimetable model — represents the Control Office Application (COA) timetable.
Used as hard constraints in the CP-SAT optimizer to prevent scheduling blocks
during active train slots.
"""
from datetime import time
from sqlalchemy import (
    String, Boolean, Integer, Time, ForeignKey, Enum as PgEnum, Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.db.base import Base


class TrainTimetable(Base):
    __tablename__ = "train_timetable"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    train_no: Mapped[str] = mapped_column(String(10), nullable=False)
    train_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    section_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("corridor_blocks.section_id", ondelete="CASCADE"), nullable=False
    )
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Sun, 6=Sat; -1=daily
    departure_time: Mapped[time] = mapped_column(Time, nullable=False)
    arrival_time: Mapped[time] = mapped_column(Time, nullable=False)
    train_type: Mapped[str] = mapped_column(
        PgEnum("passenger", "goods", "express", "mail", "special", name="train_type_enum"),
        default="passenger",
    )
    frequency: Mapped[str] = mapped_column(
        PgEnum("daily", "biweekly", "weekly", name="frequency_enum"),
        default="daily",
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    ttt_source: Mapped[str] = mapped_column(String(20), default="seeded")  # seeded|csv_import

    corridor: Mapped["CorridorBlock"] = relationship("CorridorBlock", back_populates="timetable")

    __table_args__ = (
        Index("ix_timetable_section_day", "section_id", "day_of_week"),
    )

    def blocked_minutes_range(self) -> tuple[int, int]:
        """Return (start_min, end_min) as minutes from midnight for this train passage."""
        start = self.departure_time.hour * 60 + self.departure_time.minute
        end = self.arrival_time.hour * 60 + self.arrival_time.minute
        # Handle overnight trains (e.g. 23:00 → 01:00)
        if end < start:
            end += 1440
        # Add 15-min buffer on each side for operations
        return max(0, start - 15), end + 15


# Avoid circular — import after definition
from backend.models.corridor import CorridorBlock  # noqa: E402, F401
