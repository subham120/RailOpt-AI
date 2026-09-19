"""
Schedules router — generate, approve, partial-approve, reject, override.
Core CP-SAT orchestration pipeline.

Improvements:
  A2: generate_schedule wrapped in try/except with db.rollback() on failure
  A5: plan_type validated with Literal
  B4: safe corridor lookup (no default CorridorBlock())
  B8: real existing schedules passed to compute_availability
  S6: datetime.utcnow() replaced with timezone-aware utc
"""
import logging
import uuid
from datetime import datetime, date, timedelta, timezone
from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, model_validator
from sqlalchemy.orm import Session
from sqlalchemy import func

logger = logging.getLogger(__name__)

from backend.db.database import get_db
from backend.core.deps import get_current_user, require_controller_or_admin
from backend.models.block_schedule import BlockSchedule
from backend.models.maintenance_task import MaintenanceTask
from backend.models.corridor import CorridorBlock, BlockWindow
from backend.models.train_timetable import TrainTimetable
from backend.models.audit_log import AuditLog
from backend.models.alert_log import AlertLog
from backend.models.user import User
from backend.ai.scoring.prioritizer import prioritization_engine
from backend.ai.optimizer.scheduler import block_optimizer
from backend.ai.metrics.availability import compute_availability
from backend.api.tasks import _task_to_dict

router = APIRouter(tags=["schedules"])


# ─── Schemas ───────────────────────────────────────────

class GenerateRequest(BaseModel):
    plan_type: Literal["daily", "weekly", "monthly"] = "weekly"
    target_date: date | None = None    # start of horizon (default: today)
    zone: str | None = None

    @model_validator(mode="before")
    @classmethod
    def handle_camel_case(cls, data):
        if isinstance(data, dict):
            if "planType" in data and "plan_type" not in data:
                data["plan_type"] = data["planType"]
            if "targetDate" in data and "target_date" not in data:
                data["target_date"] = data["targetDate"]
            if "zone" in data:
                data["zone"] = data["zone"]
        return data


class PartialApproveRequest(BaseModel):
    approved_task_ids: list[str]
    rejected_task_ids: list[str] = []
    reason: str = ""


class RejectRequest(BaseModel):
    reason: str


class OverrideRequest(BaseModel):
    new_start: datetime
    new_end: datetime
    reason: str


# ─── Helpers ────────────────────────────────────────────

def _sched_to_dict(s: BlockSchedule) -> dict:
    return {
        "_id": str(s.id),
        "id": str(s.id),
        "scheduleId": s.schedule_id,
        "sectionId": s.section_id,
        "sectionName": s.section_name,
        "zoneCode": getattr(s, "zone_code", None) or "NR",
        "assignedWindow": {
            "start": s.window_start.isoformat() if s.window_start else None,
            "end": s.window_end.isoformat() if s.window_end else None,
        },
        "departments": s.departments or [],
        "taskIds": s.task_ids or [],
        "taskIdStrings": s.task_id_strings or [],
        "isMultiDepartment": s.is_multi_department,
        "planType": s.plan_type,
        "weekNumber": s.week_number,
        "monthYear": s.month_year,
        "horizonLabel": s.horizon_label,
        "status": s.status,
        "optimizerScore": s.optimizer_score,
        "totalDurationMinutes": s.total_duration_min,
        "availabilityScore": s.availability_score,
        "tttConflicts": s.ttt_conflicts or [],
        "aiReasoning": s.ai_reasoning,
        "isOverridden": s.is_overridden,
        "overrideReason": s.override_reason,
        "approvedBy": str(s.approved_by) if s.approved_by else None,
        "approvalDate": s.approval_date.isoformat() if s.approval_date else None,
        "rejectionReason": s.rejection_reason,
        "createdAt": s.created_at.isoformat() if s.created_at else None,
    }


# ─── Routes ─────────────────────────────────────────────

@router.get("")
def get_schedules(
    request: Request,
    plan_type: Optional[str] = Query(None, alias="planType"),
    status: Optional[str] = None,
    section_id: Optional[str] = Query(None, alias="sectionId"),
    zone: Optional[str] = Query(None),
    page: int = 1,
    limit: int = Query(500, ge=1, le=1000),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    target_zone = zone or request.headers.get("X-Rail-Zone")
    q = db.query(BlockSchedule)
    if target_zone and target_zone.strip().upper() != "ALL":
        z = target_zone.strip()
        q = q.filter(
            (BlockSchedule.zone_code.ilike(z)) |
            (BlockSchedule.section_id.in_(
                db.query(CorridorBlock.section_id).filter(
                    (CorridorBlock.zone_code.ilike(z)) | (CorridorBlock.zone.ilike(z))
                )
            ))
        )
    if plan_type:
        q = q.filter(BlockSchedule.plan_type == plan_type)
    if status:
        q = q.filter(BlockSchedule.status == status)
    if section_id:
        q = q.filter(BlockSchedule.section_id == section_id)

    total = q.count()
    schedules = q.order_by(BlockSchedule.window_start.asc()) \
                 .offset((page - 1) * limit).limit(limit).all()

    return {
        "success": True,
        "data": [_sched_to_dict(s) for s in schedules],
        "pagination": {"total": total, "page": page, "pages": -(-total // limit)},
    }


@router.get("/stats")
def get_stats(
    request: Request,
    zone: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    target_zone = zone or request.headers.get("X-Rail-Zone")
    q = db.query(BlockSchedule)
    if target_zone and target_zone.strip().upper() != "ALL":
        z = target_zone.strip()
        q = q.filter(
            (BlockSchedule.zone_code.ilike(z)) |
            (BlockSchedule.section_id.in_(
                db.query(CorridorBlock.section_id).filter(
                    (CorridorBlock.zone_code.ilike(z)) | (CorridorBlock.zone.ilike(z))
                )
            ))
        )
    rows = q.with_entities(BlockSchedule.status, func.count().label("cnt")) \
             .group_by(BlockSchedule.status).all()
    by_status = {r.status: r.cnt for r in rows}

    type_rows = q.with_entities(BlockSchedule.plan_type, func.count().label("cnt")) \
                  .group_by(BlockSchedule.plan_type).all()
    by_type = {r.plan_type: r.cnt for r in type_rows}

    total = sum(by_status.values())
    multi = q.filter(BlockSchedule.is_multi_department == True).count()

    return {
        "success": True,
        "data": {"total": total, "byStatus": by_status, "byPlanType": by_type, "multiDeptBlocks": multi},
    }


@router.post("/generate")
def generate_schedule(
    body: GenerateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_controller_or_admin),
):
    """
    10-step CP-SAT optimization pipeline.
    A2: Wrapped in try/except so a mid-pipeline failure triggers db.rollback().
    """
    base_date = body.target_date or date.today()
    plan_type = body.plan_type
    target_zone = body.zone or request.headers.get("X-Rail-Zone")

    # Step 1: Fetch pending tasks
    task_q = db.query(MaintenanceTask).filter(
        MaintenanceTask.status.in_(["pending", "scheduled"])
    )
    if target_zone and target_zone.strip().upper() != "ALL":
        z = target_zone.strip()
        task_q = task_q.filter(
            (MaintenanceTask.zone_code.ilike(z)) |
            (MaintenanceTask.section_id.in_(
                db.query(CorridorBlock.section_id).filter(
                    (CorridorBlock.zone_code.ilike(z)) | (CorridorBlock.zone.ilike(z))
                )
            ))
        )
    tasks = task_q.all()
    if not tasks:
        raise HTTPException(400, f"No pending tasks to schedule{' in zone ' + target_zone if target_zone else ''}. Ingest data first.")

    # Step 2: Fetch corridors + windows (hard fail — no silent fallback)
    corridor_q = db.query(CorridorBlock)
    if target_zone and target_zone.strip().upper() != "ALL":
        z = target_zone.strip()
        corridor_q = corridor_q.filter((CorridorBlock.zone_code.ilike(z)) | (CorridorBlock.zone.ilike(z)))
    corridors = corridor_q.all()
    if not corridors:
        raise HTTPException(503, f"Corridor data missing{' for zone ' + target_zone if target_zone else ''}. Run /api/ingest/seed first.")
    
    corridor_map = {c.section_id: c for c in corridors}
    windows = db.query(BlockWindow).filter(
        BlockWindow.is_active == True,
        BlockWindow.section_id.in_(corridor_map.keys()),
    ).all()

    # Step 3: Fetch TTT blocked intervals per section
    horizon_days = {"daily": 1, "weekly": 7, "monthly": 30}.get(plan_type, 7)

    ttt_blocked: dict[str, list[tuple[int, int]]] = {}
    for section_id in corridor_map:
        ttt_blocked[section_id] = []
        trains = db.query(TrainTimetable).filter(
            TrainTimetable.section_id == section_id,
            TrainTimetable.is_active == True,
        ).all()
        for t in trains:
            ttt_blocked[section_id].append(t.blocked_minutes_range())

    # Step 4: AI prioritization (if tasks not yet scored)
    td_map = {c.section_id: c.traffic_density for c in corridors}
    unscored = [t for t in tasks if t.criticality_score is None]
    if unscored:
        scored = prioritization_engine.score_tasks([_task_to_dict(t) for t in unscored], td_map)
        scored_map = {s["taskId"]: s for s in scored}
        for t in unscored:
            s = scored_map.get(t.task_id, {})
            t.criticality_score = s.get("criticalityScore", 0.5)
            t.urgency_tier = s.get("urgencyTier", "Medium")
            t.score_breakdown = s.get("scoreBreakdown")
            t.ai_reasoning = s.get("reasoning", "")

    # Step 5: CP-SAT optimization
    task_dicts = [_task_to_dict(t) for t in tasks]
    window_dicts = [
        {
            "sectionId": w.section_id,
            "dayOfWeek": w.day_of_week,
            "startTime": w.start_time.strftime("%H:%M"),
            "endTime": w.end_time.strftime("%H:%M"),
            "maxDurationMinutes": w.max_duration_minutes,
        }
        for w in windows
    ]
    schedule_plans = block_optimizer.optimize(task_dicts, window_dicts, ttt_blocked, plan_type, base_date)

    # Step 6: B8 fix — pass real existing (approved/executed) schedules to compute_availability
    existing_schedules = db.query(BlockSchedule).filter(
        BlockSchedule.status.in_(["approved", "executed"])
    ).all()
    section_availability = {
        sid: compute_availability(sid, windows, existing_schedules) for sid in corridor_map
    }

    try:
        # Step 7: Delete old proposed schedules for this horizon (inside transaction)
        del_q = db.query(BlockSchedule).filter(
            BlockSchedule.plan_type == plan_type,
            BlockSchedule.status == "proposed",
        )
        if target_zone and target_zone.strip().upper() != "ALL":
            del_q = del_q.filter(BlockSchedule.section_id.in_(corridor_map.keys()))
        del_q.delete(synchronize_session=False)

        # Step 8: Insert new schedules
        # S6: timezone.utc replaces utcnow(); B4: safe corridor lookup (no CorridorBlock() default)
        now = datetime.now(timezone.utc)
        created_schedules = []
        for plan in schedule_plans:
            corridor = corridor_map.get(plan["sectionId"])
            # B4: don't instantiate CorridorBlock() with no args — use None-safe fallback
            section_name = (corridor.section_name if corridor else None) or plan["sectionId"]
            sched = BlockSchedule(
                id=str(uuid.uuid4()),
                schedule_id=plan["scheduleId"],
                section_id=plan["sectionId"],
                section_name=section_name,
                zone_code=corridor.zone_code if (corridor and corridor.zone_code) else (target_zone or "NR"),
                window_start=plan["windowStart"],
                window_end=plan["windowEnd"],
                total_duration_min=plan["totalDurationMinutes"],
                departments=plan["departments"],
                task_ids=plan["taskIds"],
                task_id_strings=plan["taskIdStrings"],
                is_multi_department=len(set(plan["departments"])) > 1,
                plan_type=plan_type,
                week_number=plan.get("weekNumber"),
                month_year=plan.get("monthYear"),
                horizon_label=plan.get("horizonLabel"),
                optimizer_score=plan.get("optimizerScore", 0.0),
                ai_reasoning=plan.get("aiReasoning", ""),
                availability_score=section_availability.get(plan["sectionId"], {}).get("availability_score"),
                ttt_conflicts=plan.get("tttConflicts", []),
                status="proposed",
            )
            db.add(sched)
            created_schedules.append(sched)

        # Step 9: Update task statuses
        scheduled_task_ids = set()
        for plan in schedule_plans:
            scheduled_task_ids.update(plan.get("taskIdStrings", []))

        for t in tasks:
            if t.task_id in scheduled_task_ids:
                t.status = "scheduled"

        # Step 10: Audit + alerts for unscheduled critical tasks
        unscheduled_critical = [
            t for t in tasks
            if t.task_id not in scheduled_task_ids and t.criticality in ("critical", "high")
        ]
        for t in unscheduled_critical:
            existing_alert = db.query(AlertLog).filter(
                AlertLog.task_id == t.id,
                AlertLog.alert_type == "unscheduled_critical",
                AlertLog.is_read == False,
            ).first()
            if not existing_alert:
                db.add(AlertLog(
                    alert_type="unscheduled_critical",
                    task_id=t.id,
                    section_id=t.section_id,
                    message=f"Critical task {t.task_id} ({t.defect_type}) could not be scheduled — insufficient window availability",
                    severity="critical" if t.criticality == "critical" else "high",
                ))

        client_ip = request.client.host if request.client else None
        db.add(AuditLog(
            action="GENERATE_SCHEDULE",
            user_id=current_user.id,
            user_name=current_user.name,
            target_type="schedule",
            details=(
                f"CP-SAT generated {len(created_schedules)} blocks for {plan_type} plan "
                f"starting {base_date}. Optimizer: {schedule_plans[0].get('optimizerMode', 'unknown') if schedule_plans else 'N/A'}"
            ),
            ip_address=client_ip,
        ))
        db.commit()

    except Exception as exc:
        # A2: rollback on ANY failure to leave DB clean
        db.rollback()
        logger.error("[generate_schedule] pipeline failed: %s", exc)
        raise HTTPException(500, f"Schedule generation failed: {exc}") from exc

    return {
        "success": True,
        "data": [_sched_to_dict(s) for s in created_schedules],
        "summary": {
            "total": len(created_schedules),
            "multiDept": sum(1 for s in created_schedules if s.is_multi_department),
            "unscheduledCritical": len(unscheduled_critical),
            "planType": plan_type,
            "baseDate": base_date.isoformat(),
            "optimizerMode": schedule_plans[0].get("optimizerMode", "unknown") if schedule_plans else "none",
        },
    }


@router.put("/{schedule_id}/approve")
def approve_schedule(
    schedule_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_controller_or_admin),
):
    s = db.query(BlockSchedule).filter(
        (BlockSchedule.id == schedule_id) | (BlockSchedule.schedule_id == schedule_id)
    ).first()
    if not s:
        raise HTTPException(404, "Schedule not found")
    if s.status != "proposed":
        raise HTTPException(400, f"Cannot approve schedule in status '{s.status}'")

    client_ip = request.client.host if request.client else None
    s.status = "approved"
    s.approved_by = current_user.id
    s.approval_date = datetime.now(timezone.utc)

    # Update tasks to approved
    db.query(MaintenanceTask).filter(
        MaintenanceTask.task_id.in_(s.task_id_strings or [])
    ).update({"status": "approved"}, synchronize_session=False)

    db.add(AuditLog(action="APPROVE_SCHEDULE", user_id=current_user.id,
                    user_name=current_user.name, target_id=s.schedule_id,
                    target_type="schedule", details=f"Schedule {s.schedule_id} approved",
                    ip_address=client_ip))
    db.commit()
    db.refresh(s)
    return {"success": True, "data": _sched_to_dict(s)}


@router.put("/{schedule_id}/partial-approve")
def partial_approve(
    schedule_id: str,
    body: PartialApproveRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_controller_or_admin),
):
    s = db.query(BlockSchedule).filter(
        (BlockSchedule.id == schedule_id) | (BlockSchedule.schedule_id == schedule_id)
    ).first()
    if not s:
        raise HTTPException(404, "Schedule not found")

    client_ip = request.client.host if request.client else None
    s.status = "approved"
    s.approved_by = current_user.id
    s.approval_date = datetime.now(timezone.utc)

    if body.approved_task_ids:
        db.query(MaintenanceTask).filter(
            MaintenanceTask.task_id.in_(body.approved_task_ids)
        ).update({"status": "approved"}, synchronize_session=False)

    if body.rejected_task_ids:
        db.query(MaintenanceTask).filter(
            MaintenanceTask.task_id.in_(body.rejected_task_ids)
        ).update({"status": "pending"}, synchronize_session=False)

    db.add(AuditLog(action="PARTIAL_APPROVE", user_id=current_user.id,
                    user_name=current_user.name, target_id=s.schedule_id,
                    target_type="schedule",
                    details=f"Partial approve: {len(body.approved_task_ids)} approved, "
                            f"{len(body.rejected_task_ids)} returned to pending",
                    ip_address=client_ip))
    db.commit()
    db.refresh(s)
    return {"success": True, "data": _sched_to_dict(s)}


@router.put("/{schedule_id}/reject")
def reject_schedule(
    schedule_id: str,
    body: RejectRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_controller_or_admin),
):
    s = db.query(BlockSchedule).filter(
        (BlockSchedule.id == schedule_id) | (BlockSchedule.schedule_id == schedule_id)
    ).first()
    if not s:
        raise HTTPException(404, "Schedule not found")

    client_ip = request.client.host if request.client else None
    s.status = "rejected"
    s.rejection_reason = body.reason

    db.query(MaintenanceTask).filter(
        MaintenanceTask.task_id.in_(s.task_id_strings or [])
    ).update({"status": "pending"}, synchronize_session=False)

    db.add(AuditLog(action="REJECT_SCHEDULE", user_id=current_user.id,
                    user_name=current_user.name, target_id=s.schedule_id,
                    target_type="schedule", details=f"Rejected: {body.reason}",
                    ip_address=client_ip))
    db.commit()
    db.refresh(s)
    return {"success": True, "data": _sched_to_dict(s)}


@router.put("/{schedule_id}/override")
def override_schedule(
    schedule_id: str,
    body: OverrideRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_controller_or_admin),
):
    s = db.query(BlockSchedule).filter(
        (BlockSchedule.id == schedule_id) | (BlockSchedule.schedule_id == schedule_id)
    ).first()
    if not s:
        raise HTTPException(404, "Schedule not found")

    client_ip = request.client.host if request.client else None

    # TTT conflict check on new window
    start_min = body.new_start.hour * 60 + body.new_start.minute
    end_min = body.new_end.hour * 60 + body.new_end.minute
    day = body.new_start.weekday()

    trains = db.query(TrainTimetable).filter(
        TrainTimetable.section_id == s.section_id,
        TrainTimetable.is_active == True,
        TrainTimetable.day_of_week.in_([day, -1]),
    ).all()
    conflicts = []
    for t in trains:
        ts, te = t.blocked_minutes_range()
        if min(end_min, te) > max(start_min, ts):
            overlap_min = min(end_min, te) - max(start_min, ts)
            train_display = f"#{t.train_no} {t.train_name}" if t.train_name else f"#{t.train_no}"
            conflicts.append({
                "trainNo": t.train_no,
                "trainName": t.train_name or "",
                "trainType": t.train_type,
                "conflictType": "ttt_overlap",
                "overlapMinutes": overlap_min,
                "message": f"Conflict with {train_display} ({overlap_min} min overlap)",
            })

    s.original_window = {
        "start": s.window_start.isoformat() if s.window_start else None,
        "end": s.window_end.isoformat() if s.window_end else None,
    }
    s.original_score = s.optimizer_score
    s.window_start = body.new_start
    s.window_end = body.new_end
    s.total_duration_min = int((body.new_end - body.new_start).total_seconds() / 60)
    s.is_overridden = True
    s.override_reason = body.reason
    s.ttt_conflicts = conflicts

    db.add(AuditLog(action="OVERRIDE_SCHEDULE", user_id=current_user.id,
                    user_name=current_user.name, target_id=s.schedule_id,
                    target_type="schedule", details=f"Override: {body.reason}",
                    ip_address=client_ip))
    db.commit()
    db.refresh(s)
    return {"success": True, "data": _sched_to_dict(s), "tttConflicts": conflicts}
