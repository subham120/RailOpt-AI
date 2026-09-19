"""Corridors router — section list, windows, traffic data. No more fallback silencing."""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.core.deps import get_current_user
from backend.models.corridor import CorridorBlock, BlockWindow, TrafficData
from backend.models.user import User

router = APIRouter(tags=["corridors"])


def _corridor_to_dict(c: CorridorBlock, include_windows: bool = True) -> dict:
    d = {
        "sectionId": c.section_id,
        "sectionName": c.section_name,
        "fromStation": c.from_station,
        "toStation": c.to_station,
        "lineType": c.line_type,
        "trafficDensity": c.traffic_density,
        "zone": c.zone,
        "zoneCode": getattr(c, "zone_code", None) or "NR",
        "division": c.division,
        "totalKm": c.total_km,
        "electrified": c.electrified,
        "latFrom": c.lat_from,
        "lonFrom": c.lon_from,
        "latTo": c.lat_to,
        "lonTo": c.lon_to,
    }
    if include_windows:
        d["windows"] = [_window_to_dict(w) for w in c.windows if w.is_active]
    return d


def _window_to_dict(w: BlockWindow) -> dict:
    return {
        "id": w.id,
        "sectionId": w.section_id,
        "dayOfWeek": w.day_of_week,
        "startTime": w.start_time.strftime("%H:%M") if w.start_time else None,
        "endTime": w.end_time.strftime("%H:%M") if w.end_time else None,
        "windowType": w.window_type,
        "maxDurationMinutes": w.max_duration_minutes,
        "isActive": w.is_active,
    }


@router.get("")
def get_corridors(
    zone: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(CorridorBlock)
    if zone and zone.strip().upper() != "ALL":
        z = zone.strip()
        q = q.filter((CorridorBlock.zone_code.ilike(z)) | (CorridorBlock.zone.ilike(z)))
    corridors = q.order_by(CorridorBlock.section_id).all()
    if not corridors:
        if zone and zone.strip().upper() != "ALL":
            return {"success": True, "data": []}
        raise HTTPException(503, "Corridor data not available. Run seed first.")
    return {"success": True, "data": [_corridor_to_dict(c) for c in corridors]}


@router.get("/windows/all")
def get_all_windows(
    zone: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(BlockWindow).filter(BlockWindow.is_active == True)
    if zone and zone.strip().upper() != "ALL":
        z = zone.strip()
        q = q.join(CorridorBlock, BlockWindow.section_id == CorridorBlock.section_id).filter(
            (CorridorBlock.zone_code.ilike(z)) | (CorridorBlock.zone.ilike(z))
        )
    windows = (
        q.order_by(BlockWindow.section_id, BlockWindow.day_of_week, BlockWindow.start_time)
        .all()
    )
    return {"success": True, "data": [_window_to_dict(w) for w in windows]}


@router.get("/{section_id}")
def get_corridor(section_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    c = db.query(CorridorBlock).filter(CorridorBlock.section_id == section_id).first()
    if not c:
        raise HTTPException(404, f"Corridor {section_id!r} not found")
    return {"success": True, "data": _corridor_to_dict(c)}


@router.get("/{section_id}/traffic")
def get_traffic(
    section_id: str,
    start_date: Optional[date] = Query(None, alias="startDate"),
    end_date: Optional[date] = Query(None, alias="endDate"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(TrafficData).filter(TrafficData.section_id == section_id)
    if start_date:
        q = q.filter(TrafficData.date >= start_date)
    if end_date:
        q = q.filter(TrafficData.date <= end_date)
    rows = q.order_by(TrafficData.date, TrafficData.hour).all()

    return {
        "success": True,
        "data": [
            {
                "sectionId": r.section_id,
                "date": r.date.isoformat(),
                "hour": r.hour,
                "passengerTrains": r.passenger_trains,
                "goodsTrains": r.goods_trains,
                "totalTrains": r.total_trains,
            }
            for r in rows
        ],
    }
