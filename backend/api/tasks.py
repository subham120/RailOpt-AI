"""
Tasks router — full CRUD + AI prioritization + SHAP explanation.
Replaces taskController.js entirely.
"""
import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from backend.db.database import get_db
from backend.core.deps import get_current_user, require_admin
from backend.models.maintenance_task import MaintenanceTask
from backend.models.corridor import CorridorBlock
from backend.models.audit_log import AuditLog
from backend.models.user import User
from backend.ai.scoring.prioritizer import prioritization_engine

router = APIRouter(tags=["tasks"])


# ─── Schemas ───────────────────────────────────────────

class TaskCreate(BaseModel):
    task_id: str
    source_system: str
    department: str
    section_id: str
    section_name: str = ""
    defect_type: str
    defect_description: str = ""
    criticality: str = "medium"
    reported_date: date
    due_date: date
    estimated_duration: int
    location_km: float | None = None
    recurrence_count: int = 0
    notes: str = ""


class TaskUpdate(BaseModel):
    status: str | None = None
    criticality: str | None = None
    notes: str | None = None
    estimated_duration: int | None = None
    due_date: date | None = None


class PrioritizeRequest(BaseModel):
    zone: Optional[str] = None


# ─── Helpers ────────────────────────────────────────────

def _task_to_dict(t: MaintenanceTask) -> dict:
    return {
        "_id": str(t.id),
        "id": str(t.id),
        "taskId": t.task_id,
        "sourceSystem": t.source_system,
        "department": t.department,
        "sectionId": t.section_id,
        "sectionName": t.section_name,
        "zoneCode": getattr(t, "zone_code", None) or "NR",
        "defectType": t.defect_type,
        "defectDescription": t.defect_description,
        "criticality": t.criticality,
        "reportedDate": t.reported_date.isoformat() if t.reported_date else None,
        "dueDate": t.due_date.isoformat() if t.due_date else None,
        "estimatedDuration": t.estimated_duration,
        "locationKm": t.location_km,
        "status": t.status,
        "criticalityScore": t.criticality_score,
        "urgencyTier": t.urgency_tier,
        "scoreBreakdown": t.score_breakdown,
        "aiReasoning": t.ai_reasoning,
        "mlScore": t.ml_score,
        "ruleScore": t.rule_score,
        "recurrenceCount": t.recurrence_count,
        "lastOccurrence": t.last_occurrence.isoformat() if t.last_occurrence else None,
        "inspectionGapDays": t.inspection_gap_days,
        "importSource": t.import_source,
        "notes": t.notes,
        "createdAt": t.created_at.isoformat() if t.created_at else None,
        "updatedAt": t.updated_at.isoformat() if t.updated_at else None,
    }


class PrioritizeRequest(BaseModel):
    zone: Optional[str] = None


# ─── Routes ─────────────────────────────────────────────

@router.get("")
def get_tasks(
    request: Request,
    department: Optional[str] = None,
    status: Optional[str] = None,
    criticality: Optional[str] = None,
    section_id: Optional[str] = Query(None, alias="sectionId"),
    source_system: Optional[str] = Query(None, alias="sourceSystem"),
    zone: Optional[str] = Query(None),
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(MaintenanceTask)
    target_zone = zone or request.headers.get("X-Rail-Zone")

    if target_zone and target_zone.strip().upper() != "ALL":
        z = target_zone.strip()
        q = q.filter(
            (MaintenanceTask.zone_code.ilike(z)) |
            (MaintenanceTask.section_id.in_(
                db.query(CorridorBlock.section_id).filter(
                    (CorridorBlock.zone_code.ilike(z)) | (CorridorBlock.zone.ilike(z))
                )
            ))
        )

    # Role-based filter: dept_engineer sees only their dept
    if current_user.role == "dept_engineer" and (not isinstance(department, str) or not department.strip()):
        q = q.filter(MaintenanceTask.department == current_user.department)
    elif isinstance(department, str) and department.strip() and department.strip() != "all":
        q = q.filter(MaintenanceTask.department == department.strip())

    if isinstance(status, str) and status.strip() and status.strip() != "all":
        q = q.filter(MaintenanceTask.status == status.strip())
    if isinstance(criticality, str) and criticality.strip() and criticality.strip() != "all":
        q = q.filter(MaintenanceTask.criticality == criticality.strip())
    if isinstance(section_id, str) and section_id.strip() and section_id.strip() != "all":
        q = q.filter(MaintenanceTask.section_id == section_id.strip())
    if isinstance(source_system, str) and source_system.strip() and source_system.strip() != "all":
        q = q.filter(MaintenanceTask.source_system == source_system.strip())

    total = q.count()
    tasks = q.order_by(MaintenanceTask.reported_date.desc()) \
             .offset((page - 1) * limit).limit(limit).all()

    return {
        "success": True,
        "data": [_task_to_dict(t) for t in tasks],
        "pagination": {"total": total, "page": page, "pages": -(-total // limit), "limit": limit},
    }


@router.get("/stats/summary")
def get_task_stats(
    request: Request,
    zone: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from sqlalchemy import case
    today = date.today()

    target_zone = zone or request.headers.get("X-Rail-Zone")
    q = db.query(
        MaintenanceTask.department,
        MaintenanceTask.criticality,
        MaintenanceTask.status,
        func.count().label("cnt"),
    )
    if target_zone and target_zone.strip().upper() != "ALL":
        z = target_zone.strip()
        q = q.filter(
            (MaintenanceTask.zone_code.ilike(z)) |
            (MaintenanceTask.section_id.in_(
                db.query(CorridorBlock.section_id).filter(
                    (CorridorBlock.zone_code.ilike(z)) | (CorridorBlock.zone.ilike(z))
                )
            ))
        )
    rows = q.group_by(
        MaintenanceTask.department,
        MaintenanceTask.criticality,
        MaintenanceTask.status,
    ).all()

    by_dept = {}
    by_crit = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    by_status = {}
    total = 0

    for r in rows:
        total += r.cnt
        by_dept[r.department] = by_dept.get(r.department, 0) + r.cnt
        crit = (r.criticality or "medium").lower()
        by_crit[crit] = by_crit.get(crit, 0) + r.cnt
        by_status[r.status] = by_status.get(r.status, 0) + r.cnt

    overdue_q = db.query(func.count(MaintenanceTask.id)).filter(
        MaintenanceTask.due_date < today,
        MaintenanceTask.status.in_(["pending", "scheduled"]),
    )
    if target_zone and target_zone.strip().upper() != "ALL":
        z = target_zone.strip()
        overdue_q = overdue_q.filter(
            (MaintenanceTask.zone_code.ilike(z)) |
            (MaintenanceTask.section_id.in_(
                db.query(CorridorBlock.section_id).filter(
                    (CorridorBlock.zone_code.ilike(z)) | (CorridorBlock.zone.ilike(z))
                )
            ))
        )
    overdue = overdue_q.scalar() or 0

    return {
        "success": True,
        "data": {
            "total": total,
            "byDepartment": by_dept,
            "byCriticality": by_crit,
            "byStatus": by_status,
            "overdue": overdue,
        },
    }


@router.get("/{task_id}")
def get_task(task_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    t = db.query(MaintenanceTask).filter(MaintenanceTask.task_id == task_id).first()
    if not t:
        raise HTTPException(404, f"Task {task_id} not found")
    return {"success": True, "data": _task_to_dict(t)}


@router.get("/{task_id}/explain")
def explain_task(task_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    t = db.query(MaintenanceTask).filter(MaintenanceTask.task_id == task_id).first()
    if not t:
        raise HTTPException(404, f"Task {task_id} not found")
    c = db.query(CorridorBlock).filter(CorridorBlock.section_id == t.section_id).first()
    td = c.traffic_density if c else "medium"
    explanation = prioritization_engine.explain_score(_task_to_dict(t), td)
    return {"success": True, "data": explanation}


@router.post("")
def create_task(
    body: TaskCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(MaintenanceTask).filter(MaintenanceTask.task_id == body.task_id).first()
    if existing:
        raise HTTPException(400, f"Task {body.task_id} already exists")

    # Auto-resolve zone from corridor
    corridor = db.query(CorridorBlock).filter(CorridorBlock.section_id == body.section_id).first()
    zone_code = getattr(corridor, "zone_code", None) or "NR"

    t = MaintenanceTask(
        task_id=body.task_id,
        source_system=body.source_system,
        department=body.department,
        section_id=body.section_id,
        section_name=body.section_name or (corridor.section_name if corridor else body.section_id),
        zone_code=zone_code,
        defect_type=body.defect_type,
        defect_description=body.defect_description,
        criticality=body.criticality,
        reported_date=body.reported_date,
        due_date=body.due_date,
        estimated_duration=body.estimated_duration,
        location_km=body.location_km,
        recurrence_count=body.recurrence_count,
        notes=body.notes,
        status="pending",
    )
    db.add(t)
    client_ip = request.client.host if request.client else None
    db.add(AuditLog(action="TASK_CREATED", user_id=current_user.id,
                    user_name=current_user.name, target_id=body.task_id, target_type="task",
                    details=f"Task {body.task_id} created for {body.section_id} ({zone_code})", ip_address=client_ip))
    db.commit()
    db.refresh(t)
    return {"success": True, "data": _task_to_dict(t)}


@router.put("/{task_id}")
def update_task(
    task_id: str,
    body: TaskUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(MaintenanceTask).filter(MaintenanceTask.task_id == task_id).first()
    if not t:
        raise HTTPException(404, f"Task {task_id} not found")

    if body.status is not None:
        t.status = body.status
    if body.criticality is not None:
        t.criticality = body.criticality

    client_ip = request.client.host if request.client else None
    db.add(AuditLog(action="TASK_UPDATED", user_id=current_user.id,
                    user_name=current_user.name, target_id=task_id, target_type="task",
                    details=f"Task {task_id} updated: status={body.status}, crit={body.criticality}",
                    ip_address=client_ip))
    db.commit()
    db.refresh(t)
    return {"success": True, "data": _task_to_dict(t)}


@router.delete("/{task_id}")
def delete_task(
    task_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    client_ip = request.client.host if request.client else None
    t = db.query(MaintenanceTask).filter(
        (MaintenanceTask.task_id == task_id) | (MaintenanceTask.id == (uuid.UUID(task_id) if len(task_id) == 36 else None))
    ).first()
    if not t:
        raise HTTPException(404, "Task not found")
    tid = t.task_id
    db.delete(t)
    db.add(AuditLog(action="TASK_DELETED", user_id=current_user.id,
                    user_name=current_user.name, target_id=tid, target_type="task",
                    details=f"Task {tid} deleted", ip_address=client_ip))
    db.commit()
    return {"success": True, "message": "Task deleted"}


@router.post("/prioritize")
def prioritize_tasks(
    request: Request,
    body: Optional[PrioritizeRequest] = None,
    zone: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run AI scoring (XGBoost + rule hybrid) on all pending/scheduled tasks."""
    from backend.models.corridor import CorridorBlock

    target_zone = (body.zone if body and body.zone else None) or zone or request.headers.get("X-Rail-Zone")

    q = db.query(MaintenanceTask).filter(
        MaintenanceTask.status.in_(["pending", "scheduled"])
    )
    if target_zone and target_zone.strip().upper() != "ALL":
        z = target_zone.strip()
        q = q.filter(
            (MaintenanceTask.zone_code.ilike(z)) |
            (MaintenanceTask.section_id.in_(
                db.query(CorridorBlock.section_id).filter(
                    (CorridorBlock.zone_code.ilike(z)) | (CorridorBlock.zone.ilike(z))
                )
            ))
        )
    tasks = q.all()
    if not tasks:
        raise HTTPException(400, f"No pending tasks to prioritize{' in zone ' + target_zone if target_zone else ''}")

    corridors = db.query(CorridorBlock).all()
    corridor_map = {c.section_id: c.traffic_density for c in corridors}

    scored = prioritization_engine.score_tasks([_task_to_dict(t) for t in tasks], corridor_map)

    # Persist scores back to DB
    scored_map = {s["taskId"]: s for s in scored}
    for t in tasks:
        s = scored_map.get(t.task_id)
        if s:
            t.criticality_score = s["criticalityScore"]
            t.urgency_tier = s["urgencyTier"]
            t.score_breakdown = s.get("scoreBreakdown")
            t.ai_reasoning = s.get("reasoning", "")
            t.ml_score = s.get("mlScore")
            t.rule_score = s.get("ruleScore")

    client_ip = request.client.host if request.client else None
    db.add(AuditLog(
        action="AI_PRIORITIZATION_RUN",
        user_id=current_user.id,
        user_name=current_user.name,
        target_type="task",
        details=f"Scored {len(tasks)} tasks via XGBoost+rule hybrid engine",
        ip_address=client_ip,
    ))
    db.commit()

    summary = {
        "total": len(scored),
        "critical": sum(1 for s in scored if s.get("urgencyTier") == "Critical"),
        "high": sum(1 for s in scored if s.get("urgencyTier") == "High"),
        "medium": sum(1 for s in scored if s.get("urgencyTier") == "Medium"),
        "low": sum(1 for s in scored if s.get("urgencyTier") == "Low"),
    }

    return {"success": True, "tasks": scored, "summary": summary}
