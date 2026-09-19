"""
Ingest router — real CSV import for TMS, SMMS, TDMS source systems.
Also handles demo seeding for evaluators.
"""
import io
import uuid
from datetime import date
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.core.deps import get_current_user, require_controller_or_admin
from backend.models.maintenance_task import MaintenanceTask
from backend.models.audit_log import AuditLog
from backend.models.user import User

router = APIRouter(tags=["ingest"])


@router.post("/csv")
async def import_csv(
    request: Request,
    file: UploadFile = File(...),
    source: str = Form(...),        # TMS | SMMS | TDMS
    db: Session = Depends(get_db),
    current_user: User = Depends(require_controller_or_admin),
):
    """
    Parse and import maintenance task CSV from TMS, SMMS, or TDMS.
    Returns row-level import summary with error details.
    """
    if source not in ("TMS", "SMMS", "TDMS"):
        raise HTTPException(400, f"Unknown source '{source}'. Must be TMS, SMMS, or TDMS.")

    content = await file.read()

    try:
        if source == "TMS":
            from backend.ingest.tms_adapter import TMSAdapter
            adapter = TMSAdapter()
        elif source == "SMMS":
            from backend.ingest.smms_adapter import SMMSAdapter
            adapter = SMMSAdapter()
        else:
            from backend.ingest.tdms_adapter import TDMSAdapter
            adapter = TDMSAdapter()

        rows, errors = adapter.parse(content)
    except Exception as e:
        raise HTTPException(400, f"CSV parse error: {e}")

    batch_id = f"BATCH-{source}-{uuid.uuid4().hex[:8].upper()}"
    imported, skipped = 0, 0

    # Deduplicate against existing task_ids
    existing_ids = {
        t.task_id
        for t in db.query(MaintenanceTask.task_id).filter(
            MaintenanceTask.task_id.in_([r["task_id"] for r in rows])
        ).all()
    }

    for row in rows:
        if row["task_id"] in existing_ids:
            skipped += 1
            continue
        try:
            task = MaintenanceTask(
                **row,
                import_source="csv",
                import_batch_id=batch_id,
            )
            db.add(task)
            imported += 1
        except Exception as e:
            errors.append(f"Insert error for {row.get('task_id', '?')}: {e}")
            skipped += 1

    client_ip = request.client.host if request.client else None
    db.add(AuditLog(
        action="CSV_IMPORT",
        user_id=current_user.id,
        user_name=current_user.name,
        target_type="task",
        details=f"Imported {imported} tasks from {source} CSV (batch {batch_id}). Skipped: {skipped}.",
        ip_address=client_ip,
    ))
    db.commit()

    return {
        "success": True,
        "batchId": batch_id,
        "source": source,
        "imported": imported,
        "skipped": skipped,
        "errors": errors[:30],
    }


@router.get("/template/{source}")
def download_template(source: str, _: User = Depends(get_current_user)):
    """Download a CSV template with correct column headers for each source system."""
    templates = {
        "TMS": (
            "Asset_ID,Section_Code,From_Station,To_Station,Defect_Category,Defect_Description,"
            "Priority,Scheduled_Date,Est_Duration_Hrs,Location_KM,Last_Inspection,Recurrence_Count\n"
            "TMS-SAMPLE-001,NDLS-GZB,New Delhi,Ghaziabad,Rail fracture,Crack detected at km 12.4,"
            "P1,2026-09-15,2.5,12.4,2026-08-01,2\n"
        ),
        "SMMS": (
            "Work_Order_ID,Section_ID,Station_From,Station_To,Signal_Type,Fault_Description,"
            "Urgency,Due_Date,Duration_Minutes,KM_Marker,Last_Maintenance\n"
            "SMMS-SAMPLE-001,NDLS-GZB,New Delhi,Ghaziabad,Track circuit,Shunting failure,"
            "High,2026-09-20,90,8.2,2026-07-15\n"
        ),
        "TDMS": (
            "Equipment_ID,Corridor_Code,Start_Station,End_Station,Equipment_Type,Defect_Details,"
            "Criticality_Level,Target_Date,Estimated_Hours,Location_KM,Previous_Failure_Date\n"
            "TDMS-SAMPLE-001,NDLS-GZB,New Delhi,Ghaziabad,OHE,Insulator flashover at km 18,"
            "Critical,2026-09-10,3.0,18.0,2026-08-20\n"
        ),
    }
    if source not in templates:
        raise HTTPException(400, f"Unknown source '{source}'")

    content = templates[source].encode("utf-8")
    return StreamingResponse(
        io.BytesIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={source.lower()}_template.csv"},
    )


@router.post("/seed")
async def seed_data(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_controller_or_admin),
):
    """
    Seed the database with 80 realistic maintenance tasks + 12 NR corridors
    + block windows + traffic data + train timetable for demo purposes.
    Only runs if DB is empty.
    """
    from backend.seed.seed_data import run_seed
    result = run_seed(db)
    client_ip = request.client.host if request.client else None
    db.add(AuditLog(
        action="DATA_SEED",
        user_id=current_user.id,
        user_name=current_user.name,
        target_type="system",
        details=f"Seeded: {result}",
        ip_address=client_ip,
    ))
    db.commit()
    return {"success": True, "seeded": result}
