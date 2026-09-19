"""
CorridorBlock, BlockWindow, TrafficData models.
Replaces Sequelize CorridorBlock.js — now fully in SQLAlchemy.
"""
from datetime import date, time, datetime
from sqlalchemy import (
    String, Boolean, Float, Integer, Date, Time, DateTime,
    ForeignKey, Enum as PgEnum, Index, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.db.base import Base


class CorridorBlock(Base):
    __tablename__ = "corridor_blocks"

    section_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    section_name: Mapped[str] = mapped_column(String(200), nullable=False)
    from_station: Mapped[str] = mapped_column(String(100), nullable=False)
    to_station: Mapped[str] = mapped_column(String(100), nullable=False)
    line_type: Mapped[str] = mapped_column(
        PgEnum("single", "double", "triple", "quadruple", name="line_type_enum"),
        default="double",
    )
    traffic_density: Mapped[str] = mapped_column(
        PgEnum("high", "medium", "low", name="traffic_density_enum"),
        default="medium",
    )
    zone: Mapped[str] = mapped_column(String(100), default="Northern Railway")
    zone_code: Mapped[str] = mapped_column(String(20), default="NR", index=True)
    division: Mapped[str] = mapped_column(String(100), default="Delhi")
    total_km: Mapped[float] = mapped_column(Float, default=0.0)
    electrified: Mapped[bool] = mapped_column(Boolean, default=True)
    lat_from: Mapped[float | None] = mapped_column(Float, nullable=True)
    lon_from: Mapped[float | None] = mapped_column(Float, nullable=True)
    lat_to: Mapped[float | None] = mapped_column(Float, nullable=True)
    lon_to: Mapped[float | None] = mapped_column(Float, nullable=True)

    windows: Mapped[list["BlockWindow"]] = relationship(
        "BlockWindow", back_populates="corridor", cascade="all, delete-orphan"
    )
    timetable: Mapped[list["TrainTimetable"]] = relationship(
        "TrainTimetable", back_populates="corridor", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<CorridorBlock {self.section_id}>"


class BlockWindow(Base):
    """Available maintenance possession windows per section per day."""
    __tablename__ = "block_windows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    section_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("corridor_blocks.section_id", ondelete="CASCADE"), nullable=False
    )
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Sun … 6=Sat
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    window_type: Mapped[str] = mapped_column(
        PgEnum("night", "day", "mixed", "morning", "midday", "evening", name="window_type_enum"), default="night"
    )
    max_duration_minutes: Mapped[int] = mapped_column(Integer, default=240)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    corridor: Mapped["CorridorBlock"] = relationship("CorridorBlock", back_populates="windows")

    __table_args__ = (
        Index("ix_block_windows_section_day", "section_id", "day_of_week"),
    )


class TrafficData(Base):
    """Hourly train count time-series per section (last 30 days)."""
    __tablename__ = "traffic_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    section_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("corridor_blocks.section_id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    hour: Mapped[int] = mapped_column(Integer, nullable=False)        # 0–23
    passenger_trains: Mapped[int] = mapped_column(Integer, default=0)
    goods_trains: Mapped[int] = mapped_column(Integer, default=0)
    total_trains: Mapped[int] = mapped_column(Integer, default=0)

    __table_args__ = (
        Index("ix_traffic_data_section_date_hour", "section_id", "date", "hour"),
    )


# Avoid circular import — import here after model definitions
from backend.models.train_timetable import TrainTimetable  # noqa: E402, F401
