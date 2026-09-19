"""
Demo seed data — 12 NR corridors + block windows + traffic + TTT + 80 tasks + demo users.
Called on startup or by POST /api/ingest/seed.
Idempotent: checks if data already exists before inserting.
"""
import uuid
import random
from datetime import date, datetime, timedelta, time

from sqlalchemy.orm import Session

from backend.models.user import User
from backend.models.corridor import CorridorBlock, BlockWindow, TrafficData
from backend.models.train_timetable import TrainTimetable
from backend.models.maintenance_task import MaintenanceTask
from backend.core.security import hash_password

from backend.seed.corridors_18_zones import ALL_18_ZONE_CORRIDORS

# Keep backward-compatibility alias
NR_CORRIDORS = [c for c in ALL_18_ZONE_CORRIDORS if c.get("zone_code") == "NR"]

# Task templates per department
TASK_TEMPLATES = {
    "Engineering": [
        ("Rail fracture", "critical", 90, 180), ("Rail joint failure", "high", 60, 120),
        ("Track geometry defect", "high", 120, 240), ("Bridge inspection", "medium", 180, 360),
        ("Ballast renewal", "medium", 240, 480), ("Sleeper replacement", "medium", 180, 300),
        ("Level crossing maintenance", "medium", 60, 120), ("Drain cleaning", "low", 30, 90),
        ("Vegetation clearance", "low", 60, 180),
    ],
    "Signal & Telecom": [
        ("Track circuit failure", "critical", 60, 120), ("Signal failure", "critical", 45, 90),
        ("Point machine failure", "high", 60, 120), ("Axle counter failure", "high", 45, 90),
        ("OFC cable cut", "medium", 90, 180), ("Panel maintenance", "medium", 120, 240),
        ("BSNL equipment fault", "low", 30, 60),
    ],
    "Traction Distribution": [
        ("OHE wire break", "critical", 120, 240), ("Insulator flashover", "critical", 90, 180),
        ("Power supply interruption", "critical", 60, 120), ("Pantograph damage", "high", 90, 180),
        ("Booster transformer failure", "high", 120, 240), ("Sectioning post maintenance", "medium", 60, 120),
        ("OHE mast inspection", "low", 60, 120),
    ],
}

SOURCE_MAP = {
    "Engineering": "TMS",
    "Signal & Telecom": "SMMS",
    "Traction Distribution": "TDMS",
}

DEMO_TRAINS = [
    # Band 1 (Early Morning transition: 04:30 - 07:15)
    ("12301", "Howrah - New Delhi Rajdhani Express", "express", "daily", time(5, 30), time(6, 10)),
    ("12001", "New Delhi - Rani Kamlapati Shatabdi Express", "express", "daily", time(6, 15), time(6, 55)),
    ("64551", "Kanpur Central - Aligarh MEMU Passenger", "passenger", "daily", time(6, 30), time(7, 15)),

    # Band 2 (Midday transition: 11:00 - 12:45)
    ("12017", "New Delhi - Dehradun Shatabdi Express", "express", "daily", time(11, 15), time(11, 55)),
    ("54321", "Prayagraj - Pt. Deen Dayal Upadhyaya Passenger", "passenger", "daily", time(11, 50), time(12, 30)),
    ("04011", "Dadri - JNPT Container Freight Special", "goods", "daily", time(12, 5), time(12, 45)),

    # Band 3 (Evening Peak transition: 16:30 - 19:15)
    ("64002", "Ghaziabad - Delhi EMU Evening Commuter", "passenger", "daily", time(16, 45), time(17, 25)),
    ("14217", "Prayag - Chandigarh Unchahar Express", "mail", "daily", time(17, 30), time(18, 15)),
    ("12302", "New Delhi - Howrah Rajdhani Express", "express", "daily", time(18, 20), time(19, 0)),

    # Band 4 (Late Night transition: 23:00 - 00:45)
    ("04122", "Deen Dayal Upadhyaya Coal Rake", "goods", "daily", time(23, 15), time(23, 55)),
    ("12424", "New Delhi - Dibrugarh Rajdhani Express", "express", "daily", time(23, 55), time(0, 35)),
    ("04915", "Northern Railway Midnight Parcel Special", "goods", "daily", time(0, 10), time(0, 45)),
]


def run_seed(db: Session) -> dict:
    counts = {}

    # ── Users ────────────────────────────────────────────
    existing_emails = {u.email.lower() for u in db.query(User.email).all()}
    demo_users = [
        # Official Indian Railways Accounts (matching Quick Demo buttons)
        User(id=str(uuid.uuid4()), name="Admin Controller", email="admin@railways.gov.in", password=hash_password("RailAdmin@120"), role="admin", department=None, zonal_railway="Northern Railway"),
        User(id=str(uuid.uuid4()), name="Sr. DEN (Engineering)", email="engineering@railways.gov.in", password=hash_password("RailEng@120"), role="dept_engineer", department="Engineering", zonal_railway="Northern Railway"),
        User(id=str(uuid.uuid4()), name="Sr. DEE/TRD (OHE)", email="trd@railways.gov.in", password=hash_password("RailTrd@120"), role="dept_engineer", department="Traction Distribution", zonal_railway="Northern Railway"),
        User(id=str(uuid.uuid4()), name="Sr. DSTE (Signal & Telecom)", email="signal@railways.gov.in", password=hash_password("RailSt@120"), role="dept_engineer", department="Signal & Telecom", zonal_railway="Northern Railway"),
        User(id=str(uuid.uuid4()), name="Chief Section Controller", email="control@railways.gov.in", password=hash_password("RailControl@120"), role="section_controller", department=None, zonal_railway="Northern Railway"),

        # Convenient short alias accounts
        User(id=str(uuid.uuid4()), name="Admin User", email="admin@railopt.in", password=hash_password("RailAdmin@120"), role="admin", department=None, zonal_railway="Northern Railway"),
        User(id=str(uuid.uuid4()), name="Priya Sharma", email="engineer@railopt.in", password=hash_password("RailEng@120"), role="dept_engineer", department="Engineering", zonal_railway="Northern Railway"),
        User(id=str(uuid.uuid4()), name="Rajesh Kumar", email="controller@railopt.in", password=hash_password("RailControl@120"), role="section_controller", department=None, zonal_railway="Northern Railway"),
        User(id=str(uuid.uuid4()), name="Arjun Nair", email="traction@railopt.in", password=hash_password("RailTrd@120"), role="dept_engineer", department="Traction Distribution", zonal_railway="Northern Railway"),
        User(id=str(uuid.uuid4()), name="Deepa Menon", email="st@railopt.in", password=hash_password("RailSt@120"), role="dept_engineer", department="Signal & Telecom", zonal_railway="Northern Railway"),

        # Gov.in accounts with 123 password
        User(id=str(uuid.uuid4()), name="Admin Officer", email="admin@railopt.gov.in", password=hash_password("Admin@123"), role="admin", department=None, zonal_railway="Northern Railway"),
        User(id=str(uuid.uuid4()), name="Section Controller Delhi", email="controller.delhi@railopt.gov.in", password=hash_password("Controller@123"), role="section_controller", department=None, zonal_railway="Northern Railway"),
        User(id=str(uuid.uuid4()), name="Track Engineer", email="eng.track@railopt.gov.in", password=hash_password("Engineer@123"), role="dept_engineer", department="Engineering", zonal_railway="Northern Railway"),
    ]
    added_users = 0
    for u in demo_users:
        if u.email.lower() not in existing_emails:
            db.add(u)
            added_users += 1
    counts["users"] = added_users

    # ── Corridors ────────────────────────────────────────
    if db.query(CorridorBlock).count() == 0:
        for c in ALL_18_ZONE_CORRIDORS:
            db.add(CorridorBlock(**c))
        counts["corridors"] = len(ALL_18_ZONE_CORRIDORS)

        # Block windows: 4 evenly distributed daily shifts per corridor per day:
        # 1. Night Block (00:00 - 06:00): 01:00 - 04:30
        # 2. Morning Shift (06:00 - 12:00): 07:30 - 11:00
        # 3. Midday Window (12:00 - 18:00): 13:00 - 16:30
        # 4. Evening Shift (18:00 - 24:00): 19:30 - 23:00
        win_count = 0
        for c in ALL_18_ZONE_CORRIDORS:
            for dow in range(7):
                # 1. Night Shift Window
                db.add(BlockWindow(
                    section_id=c["section_id"],
                    day_of_week=dow,
                    start_time=time(1, 0),
                    end_time=time(4, 30),
                    window_type="night",
                    max_duration_minutes=210,
                    is_active=True,
                ))
                win_count += 1

                # 2. Morning Shift Window
                db.add(BlockWindow(
                    section_id=c["section_id"],
                    day_of_week=dow,
                    start_time=time(7, 30),
                    end_time=time(11, 0),
                    window_type="morning",
                    max_duration_minutes=210,
                    is_active=True,
                ))
                win_count += 1

                # 3. Midday Shift Window
                db.add(BlockWindow(
                    section_id=c["section_id"],
                    day_of_week=dow,
                    start_time=time(13, 0),
                    end_time=time(16, 30),
                    window_type="midday",
                    max_duration_minutes=210,
                    is_active=True,
                ))
                win_count += 1

                # 4. Evening Shift Window
                db.add(BlockWindow(
                    section_id=c["section_id"],
                    day_of_week=dow,
                    start_time=time(19, 30),
                    end_time=time(23, 0),
                    window_type="evening",
                    max_duration_minutes=210,
                    is_active=True,
                ))
                win_count += 1
        counts["block_windows"] = win_count

        # Traffic data: last 7 days, hourly
        today = date.today()
        td_count = 0
        rng = random.Random(42)
        for c in ALL_18_ZONE_CORRIDORS:
            td_map = {"high": (5, 3), "medium": (3, 2), "low": (1, 1)}
            pax_base, goods_base = td_map[c["traffic_density"]]
            for day_offset in range(7):
                d = today - timedelta(days=day_offset)
                for h in range(24):
                    is_peak = 6 <= h <= 9 or 17 <= h <= 21
                    pax = rng.randint(pax_base * (3 if is_peak else 1), pax_base * (5 if is_peak else 2))
                    goods = rng.randint(goods_base, goods_base * (3 if h < 6 or h > 21 else 2))
                    db.add(TrafficData(
                        section_id=c["section_id"],
                        date=d,
                        hour=h,
                        passenger_trains=pax,
                        goods_trains=goods,
                        total_trains=pax + goods,
                    ))
                    td_count += 1
        counts["traffic_data"] = td_count

        # Train timetable: 21 trains per corridor (night-heavy freight & express + sparse day)
        ttt_count = 0
        for c in ALL_18_ZONE_CORRIDORS:
            for (tno, tname, ttype, freq, dep_t, arr_t) in DEMO_TRAINS:
                db.add(TrainTimetable(
                    train_no=tno,
                    train_name=tname,
                    section_id=c["section_id"],
                    day_of_week=-1,  # daily
                    departure_time=dep_t,
                    arrival_time=arr_t,
                    train_type=ttype,
                    frequency=freq,
                    is_active=True,
                    ttt_source="seeded",
                ))
                ttt_count += 1
        counts["timetable"] = ttt_count
    else:
        counts["corridors"] = 0
        counts["block_windows"] = 0
        counts["traffic_data"] = 0
        counts["timetable"] = 0

    # ── Tasks ────────────────────────────────────────────
    if db.query(MaintenanceTask).count() == 0:
        import csv
        import os
        from datetime import datetime

        csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "data_gov_in_block_requests.csv")
        task_count = 0
        corridor_zone_map = {c["section_id"]: c.get("zone_code", "NR") for c in ALL_18_ZONE_CORRIDORS}

        if os.path.exists(csv_path):
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    rep_d = datetime.strptime(row["reported_date"], "%Y-%m-%d").date()
                    due_d = datetime.strptime(row["due_date"], "%Y-%m-%d").date()
                    db.add(MaintenanceTask(
                        id=str(uuid.uuid4()),
                        task_id=row["task_id"],
                        source_system=row["source_system"],
                        department=row["department"],
                        section_id=row["section_id"],
                        section_name=row["section_name"],
                        zone_code=row.get("zone_code") or corridor_zone_map.get(row["section_id"], "NR"),
                        defect_type=row["defect_type"],
                        defect_description=row["defect_description"],
                        criticality=row["criticality"],
                        reported_date=rep_d,
                        due_date=due_d,
                        estimated_duration=int(row["estimated_duration"]),
                        location_km=float(row["location_km"]),
                        status="pending",
                        recurrence_count=int(row.get("recurrence_count", 0)),
                        inspection_gap_days=int(row.get("inspection_gap_days", 30)),
                        import_source="data.gov.in",
                        import_batch_id="DATA.GOV.IN-BATCH-01",
                    ))
                    task_count += 1
        else:
            rng = random.Random(42)
            today = date.today()
            task_num = 1
            for dept, templates in TASK_TEMPLATES.items():
                source = SOURCE_MAP[dept]
                for corridor in ALL_18_ZONE_CORRIDORS:
                    num_tasks = rng.randint(2, 3)
                    chosen = rng.sample(templates, min(num_tasks, len(templates)))
                    for (defect_type, criticality, min_dur, max_dur) in chosen:
                        days_past_due = rng.choice([-5, -3, 0, 2, 5, 10, 15, 25])
                        due_date = today + timedelta(days=days_past_due)
                        reported_days_ago = rng.randint(1, 30)
                        rep_date = today - timedelta(days=reported_days_ago)
                        duration = rng.randint(min_dur, max_dur)
                        prefix = {"TMS": "TMS", "SMMS": "SMMS", "TDMS": "TDMS"}[source]
                        task_id = f"{prefix}-{task_num:04d}"
                        recurrence = rng.randint(0, 3)
                        insp_gap = rng.randint(0, 90)

                        db.add(MaintenanceTask(
                            id=str(uuid.uuid4()),
                            task_id=task_id,
                            source_system=source,
                            department=dept,
                            section_id=corridor["section_id"],
                            section_name=corridor["section_name"],
                            zone_code=corridor.get("zone_code", "NR"),
                            defect_type=defect_type,
                            defect_description=f"{defect_type} detected on {corridor['section_name']}",
                            criticality=criticality,
                            reported_date=rep_date,
                            due_date=due_date,
                            estimated_duration=duration,
                            location_km=rng.uniform(1.0, corridor["total_km"]),
                            status="pending",
                            recurrence_count=recurrence,
                            inspection_gap_days=insp_gap,
                            import_source="data.gov.in",
                            import_batch_id="DATA.GOV.IN-BATCH-01",
                        ))
                        task_num += 1
                        task_count += 1

        counts["tasks"] = task_count
    else:
        counts["tasks"] = 0

    db.commit()
    return counts
