"""
Timetable router — view/import/query Indian Railways train timetable (COA data).
Used to generate hard TTT constraints for CP-SAT optimizer.
"""
import io
from typing import Optional
from datetime import time
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
import pandas as pd

from backend.db.database import get_db
from backend.core.deps import get_current_user, require_controller_or_admin
from backend.models.train_timetable import TrainTimetable
from backend.models.corridor import CorridorBlock
from backend.models.user import User

router = APIRouter(tags=["timetable"])

DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


def _ttt_to_dict(t: TrainTimetable) -> dict:
    return {
        "id": t.id,
        "trainNo": t.train_no,
        "trainName": t.train_name,
        "sectionId": t.section_id,
        "dayOfWeek": t.day_of_week,
        "dayName": DAY_NAMES[t.day_of_week] if 0 <= t.day_of_week <= 6 else "Daily",
        "departureTime": t.departure_time.strftime("%H:%M") if t.departure_time else None,
        "arrivalTime": t.arrival_time.strftime("%H:%M") if t.arrival_time else None,
        "trainType": t.train_type,
        "frequency": t.frequency,
        "isActive": t.is_active,
        "tttSource": t.ttt_source,
    }


@router.get("")
def list_timetable(
    section_id: Optional[str] = Query(None, alias="sectionId"),
    day_of_week: Optional[int] = Query(None, alias="dayOfWeek"),
    train_type: Optional[str] = Query(None, alias="trainType"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(TrainTimetable).filter(TrainTimetable.is_active == True)
    if section_id:
        q = q.filter(TrainTimetable.section_id == section_id)
    if day_of_week is not None:
        q = q.filter(TrainTimetable.day_of_week == day_of_week)
    if train_type:
        q = q.filter(TrainTimetable.train_type == train_type)
    rows = q.order_by(TrainTimetable.section_id, TrainTimetable.day_of_week, TrainTimetable.departure_time).all()
    return {"success": True, "data": [_ttt_to_dict(r) for r in rows], "total": len(rows)}


@router.get("/{section_id}/blocked")
def get_blocked_windows(
    section_id: str,
    day_of_week: int = Query(..., alias="dayOfWeek"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Return list of (start_min, end_min) blocked intervals for a section on a given day.
    Includes ±15min buffer around each train passage.
    """
    trains = db.query(TrainTimetable).filter(
        TrainTimetable.section_id == section_id,
        TrainTimetable.is_active == True,
        TrainTimetable.day_of_week.in_([day_of_week, -1]),  # -1 = daily
    ).all()

    blocked = []
    for t in trains:
        start_min, end_min = t.blocked_minutes_range()
        blocked.append({
            "trainNo": t.train_no,
            "trainName": t.train_name,
            "trainType": t.train_type,
            "startMin": start_min,
            "endMin": end_min,
            "startTime": f"{start_min // 60:02d}:{start_min % 60:02d}",
            "endTime": f"{end_min // 60:02d}:{end_min % 60:02d}",
        })

    return {"success": True, "sectionId": section_id, "dayOfWeek": day_of_week, "blocked": blocked}


@router.post("/check-conflict")
def check_conflict(
    section_id: str,
    window_start_min: int,
    window_end_min: int,
    day_of_week: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Check if a proposed maintenance window conflicts with any train on that section+day."""
    trains = db.query(TrainTimetable).filter(
        TrainTimetable.section_id == section_id,
        TrainTimetable.is_active == True,
        TrainTimetable.day_of_week.in_([day_of_week, -1]),
    ).all()

    conflicts = []
    for t in trains:
        tstart, tend = t.blocked_minutes_range()
        overlap_start = max(window_start_min, tstart)
        overlap_end = min(window_end_min, tend)
        if overlap_end > overlap_start:
            overlap_min = overlap_end - overlap_start
            train_display = f"#{t.train_no} {t.train_name}" if t.train_name else f"#{t.train_no}"
            conflicts.append({
                "trainNo": t.train_no,
                "trainName": t.train_name or "",
                "trainType": t.train_type,
                "overlapMinutes": overlap_min,
                "alertMessage": f"⚠️ TTT Conflict: Overlap with {train_display} ({overlap_min} mins)",
            })

    return {
        "success": True,
        "hasConflict": len(conflicts) > 0,
        "conflicts": conflicts,
    }


@router.post("/import-csv")
async def import_timetable_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_controller_or_admin),
):
    """
    Import TTT from CSV. Expected columns:
    train_no, train_name, section_id, day_of_week, departure_time (HH:MM),
    arrival_time (HH:MM), train_type, frequency
    """
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Invalid CSV: {e}")

    required = {"train_no", "section_id", "day_of_week", "departure_time", "arrival_time"}
    missing = required - set(df.columns)
    if missing:
        raise HTTPException(400, f"Missing CSV columns: {missing}")

    # Validate sections exist
    sections = {c.section_id for c in db.query(CorridorBlock).all()}

    imported, skipped, errors = 0, 0, []
    for i, row in df.iterrows():
        sid = str(row["section_id"]).strip()
        if sid not in sections:
            errors.append(f"Row {i+2}: Unknown section_id '{sid}'")
            skipped += 1
            continue
        try:
            dep_t = time(*[int(x) for x in str(row["departure_time"]).split(":")])
            arr_t = time(*[int(x) for x in str(row["arrival_time"]).split(":")])
        except Exception:
            errors.append(f"Row {i+2}: Invalid time format")
            skipped += 1
            continue

        existing = db.query(TrainTimetable).filter(
            TrainTimetable.train_no == str(row["train_no"]),
            TrainTimetable.section_id == sid,
            TrainTimetable.day_of_week == int(row["day_of_week"]),
        ).first()

        if existing:
            existing.departure_time = dep_t
            existing.arrival_time = arr_t
            existing.ttt_source = "csv_import"
        else:
            entry = TrainTimetable(
                train_no=str(row["train_no"]),
                train_name=str(row.get("train_name", "")),
                section_id=sid,
                day_of_week=int(row["day_of_week"]),
                departure_time=dep_t,
                arrival_time=arr_t,
                train_type=str(row.get("train_type", "passenger")),
                frequency=str(row.get("frequency", "daily")),
                ttt_source="csv_import",
            )
            db.add(entry)
        imported += 1

    db.commit()
    return {"success": True, "imported": imported, "skipped": skipped, "errors": errors[:20]}
