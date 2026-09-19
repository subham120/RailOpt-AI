# backend/models/__init__.py
"""Import all models so Alembic autogenerate detects them."""
from backend.models.user import User
from backend.models.corridor import CorridorBlock, BlockWindow, TrafficData
from backend.models.train_timetable import TrainTimetable
from backend.models.maintenance_task import MaintenanceTask
from backend.models.block_schedule import BlockSchedule
from backend.models.audit_log import AuditLog
from backend.models.alert_log import AlertLog

__all__ = [
    "User",
    "CorridorBlock", "BlockWindow", "TrafficData",
    "TrainTimetable",
    "MaintenanceTask",
    "BlockSchedule",
    "AuditLog",
    "AlertLog",
]
