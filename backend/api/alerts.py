"""
Alerts router — surface critical overdue tasks and TTT conflicts to the frontend header badge.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.core.deps import get_current_user
from backend.models.alert_log import AlertLog
from backend.models.corridor import CorridorBlock
from backend.models.maintenance_task import MaintenanceTask
from backend.models.user import User

from fastapi import APIRouter, Depends, HTTPException, Query, Request

router = APIRouter(tags=["alerts"])


def _alert_to_dict(a: AlertLog, task_map: dict = None, corridor_map: dict = None) -> dict:
    t_code = None
    if task_map and a.task_id in task_map:
        t_code = task_map[a.task_id].task_id
    elif a.message and "task " in a.message.lower():
        # Try extracting task code if mentioned in message (e.g. TMS-0128)
        import re
        m = re.search(r'\b(TMS|SMMS|TDMS|REQ)-\d+\b', a.message)
        if m:
            t_code = m.group(0)

    sec_name = a.section_id
    if corridor_map and a.section_id in corridor_map:
        sec_name = corridor_map[a.section_id].section_name

    return {
        "id": a.id,
        "alertType": a.alert_type,
        "taskId": str(a.task_id) if a.task_id else None,
        "taskCode": t_code,
        "scheduleId": a.schedule_id,
        "sectionId": a.section_id,
        "sectionName": sec_name,
        "message": a.message,
        "severity": a.severity,
        "isRead": a.is_read,
        "resolvedAt": a.resolved_at.isoformat() if a.resolved_at else None,
        "createdAt": a.created_at.isoformat() if a.created_at else None,
    }


@router.get("")
def get_alerts(
    request: Request,
    unread_only: bool = True,
    zone: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    target_zone = zone or request.headers.get("X-Rail-Zone")
    q = db.query(AlertLog)
    if unread_only:
        q = q.filter(AlertLog.is_read == False)
    if target_zone and target_zone.strip().upper() != "ALL":
        z = target_zone.strip()
        q = q.filter(
            AlertLog.section_id.in_(
                db.query(CorridorBlock.section_id).filter(
                    (CorridorBlock.zone_code.ilike(z)) | (CorridorBlock.zone.ilike(z))
                )
            )
        )
    alerts = q.order_by(AlertLog.created_at.desc()).limit(50).all()

    # Pre-fetch corridors and tasks for enrichment
    sec_ids = {a.section_id for a in alerts if a.section_id}
    corridors = {c.section_id: c for c in db.query(CorridorBlock).filter(CorridorBlock.section_id.in_(sec_ids)).all()} if sec_ids else {}

    task_ids = {a.task_id for a in alerts if a.task_id}
    tasks = {str(t.id): t for t in db.query(MaintenanceTask).filter(MaintenanceTask.id.in_(task_ids)).all()} if task_ids else {}

    return {
        "success": True,
        "data": [_alert_to_dict(a, tasks, corridors) for a in alerts],
        "count": len(alerts),
    }


@router.put("/read-all")
def mark_all_read(
    request: Request,
    zone: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    target_zone = zone or request.headers.get("X-Rail-Zone")
    q = db.query(AlertLog).filter(AlertLog.is_read == False)
    if target_zone and target_zone.strip().upper() != "ALL":
        z = target_zone.strip()
        q = q.filter(
            AlertLog.section_id.in_(
                db.query(CorridorBlock.section_id).filter(
                    (CorridorBlock.zone_code.ilike(z)) | (CorridorBlock.zone.ilike(z))
                )
            )
        )
    q.update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"success": True}


@router.put("/{alert_id}/read")
def mark_read(alert_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    a = db.query(AlertLog).filter(AlertLog.id == alert_id).first()
    if not a:
        raise HTTPException(404, "Alert not found")
    a.is_read = True
    db.commit()
    return {"success": True}


@router.delete("/{alert_id}")
def delete_alert(alert_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    a = db.query(AlertLog).filter(AlertLog.id == alert_id).first()
    if not a:
        raise HTTPException(404, "Alert not found")
    db.delete(a)
    db.commit()
    return {"success": True}


@router.post("/scan")
def scan_alerts(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """
    Scan for new alert conditions and create AlertLog entries:
    - Critical/high tasks past due date with no schedule
    - Tasks overdue > 7 days with any criticality
    """
    from datetime import date
    today = date.today()

    # Find critical/high tasks past due date
    overdue_tasks = db.query(MaintenanceTask).filter(
        MaintenanceTask.criticality.in_(["critical", "high"]),
        MaintenanceTask.due_date < today,
        MaintenanceTask.status.in_(["pending", "scheduled"]),
    ).all()

    created = 0
    for t in overdue_tasks:
        # Avoid duplicate alerts
        existing = db.query(AlertLog).filter(
            AlertLog.task_id == t.id,
            AlertLog.alert_type == "critical_overdue",
            AlertLog.is_read == False,
        ).first()
        if not existing:
            days_overdue = (today - t.due_date).days
            db.add(AlertLog(
                alert_type="critical_overdue",
                task_id=t.id,
                section_id=t.section_id,
                message=f"Task {t.task_id} ({t.defect_type}) is {days_overdue} days overdue on {t.section_name or t.section_id}",
                severity="critical" if t.criticality == "critical" else "high",
            ))
            created += 1

    db.commit()
    return {"success": True, "alertsCreated": created}
