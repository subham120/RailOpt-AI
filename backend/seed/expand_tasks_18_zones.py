"""
Script to generate comprehensive data.gov.in block requests and train timetables
for all 18 Zonal Railways of Indian Railways.
"""
import csv
import random
from datetime import date, timedelta
from backend.seed.corridors_18_zones import ALL_18_ZONE_CORRIDORS

ENGINEERING_DEFECTS = [
    ("Level Crossing Paved Track Repair", "Rubber pad renewal and check rail clearance at LC Gate", "medium", 135),
    ("Thermit Weld Renewal", "AT Weld defective Ultrasonic signal at Rail Joint needing crop & re-weld", "critical", 150),
    ("Continuous Welded Rail Destressing", "Thermal stress equalization on 60kg 90UTS welded rail for 160 kmph Vande Bharat", "high", 180),
    ("Sleeper Replacement & Fastening", "Pre-stressed concrete sleeper renewal on high-density curve track", "medium", 135),
    ("SEJ Overhaul", "Tongue and stock rail gap calibration for extreme thermal expansion", "high", 165),
    ("CMS Crossing Reconditioning", "Trans-weld building up of battered nose on Cast Manganese Steel crossing", "medium", 135),
    ("Deep Ballast Screening & Tamping", "Ballast cleaning machine deployment to restore track elasticity", "high", 210),
    ("Bridge Bearing Inspection & Greasing", "Girder seating rocker-roller bearing lubrication", "medium", 120),
    ("Rail Flaw Ultrasonic Testing", "USFD detected transverse fatigue crack in rail head", "critical", 90),
    ("Track Geometry Alignment Calibration", "Track recording car flagged cross-level and twist exceeding tolerance", "high", 120),
]

ST_DEFECTS = [
    ("OFC Splicing & Path Jointing", "Fiber attenuation high on quad cable core near intermediate block hut", "high", 105),
    ("Point Machine Motor Overhaul", "143B Point machine stroke timing exceeded 5.2s threshold", "high", 105),
    ("Track Circuit Relay Replacement", "QTA2 track relay contact resistance fluctuating under dampness", "high", 90),
    ("Point Machine Lock Bar Testing", "Facing point lock tolerance check on junction interlocking", "high", 90),
    ("Axle Counter Sensor Recalibration", "Multi-section digital axle counter wheel sensor gain drifted", "critical", 75),
    ("Automatic Signaling Aspect Renewal", "Signal LED cluster degradation on home signal aspect", "high", 60),
    ("Electronic Interlocking Diagnostic", "Dual redundant EI system power supply unit card replacement", "critical", 90),
    ("Level Crossing Boom Barrier Overhaul", "Electric lifting barrier clutch mechanism alignment", "medium", 90),
]

TRD_DEFECTS = [
    ("Neutral Section Insulator Renewal", "PTFE neutral section runner wear exceeds 3mm safety tolerance", "critical", 90),
    ("Insulator Jet Washing", "Heavy pollution encrustation on porcelain insulators near industrial sidings", "medium", 90),
    ("Cantilever Assembly Replacement", "Galvanized steel cantilever bracket corrosion detected during trolley inspection", "high", 105),
    ("25kV TSS Feeder CB Overhaul", "Vacuum circuit breaker auxiliary contact overhaul during scheduled power block", "critical", 120),
    ("Catenary Wire Tension Regulation", "Auto-tensioning device pulley weight travel check before winter", "high", 120),
    ("Dropper Replacement & Height Adjustment", "Current carrying copper flexible dropper frayed near mast", "medium", 75),
    ("Substation Transformer Testing", "Traction power transformer dissolved gas analysis sampling", "medium", 90),
    ("OHE Contact Wire Profile Measurement", "Laser pantograph contact wire height and stagger recording", "high", 90),
]


def generate_datasets():
    random.seed(42)
    today = date(2026, 9, 19)

    tasks = []
    task_idx = 1

    for corridor in ALL_18_ZONE_CORRIDORS:
        sec_id = corridor["section_id"]
        sec_name = corridor["section_name"]
        zone_code = corridor["zone_code"]
        total_km = corridor["total_km"]

        # Generate 4-6 tasks per corridor across departments
        # 1-2 Engineering
        for _ in range(random.randint(2, 3)):
            def_name, def_desc, crit, dur = random.choice(ENGINEERING_DEFECTS)
            reported = today - timedelta(days=random.randint(2, 20))
            due = reported + timedelta(days=random.randint(5, 25))
            loc = round(random.uniform(1.0, max(2.0, total_km - 1.0)), 1)
            tasks.append({
                "task_id": f"TMS-{task_idx:04d}",
                "source_system": "TMS",
                "department": "Engineering",
                "section_id": sec_id,
                "section_name": sec_name,
                "zone_code": zone_code,
                "defect_type": def_name,
                "defect_description": f"{def_desc} on {sec_name}",
                "criticality": crit,
                "reported_date": reported.isoformat(),
                "due_date": due.isoformat(),
                "estimated_duration": dur,
                "location_km": loc,
                "recurrence_count": random.choice([0, 0, 1, 2]),
                "inspection_gap_days": random.choice([15, 30, 45, 60]),
                "import_source": "data.gov.in"
            })
            task_idx += 1

        # 1-2 S&T
        for _ in range(random.randint(2, 3)):
            def_name, def_desc, crit, dur = random.choice(ST_DEFECTS)
            reported = today - timedelta(days=random.randint(2, 20))
            due = reported + timedelta(days=random.randint(5, 25))
            loc = round(random.uniform(1.0, max(2.0, total_km - 1.0)), 1)
            tasks.append({
                "task_id": f"SMMS-{task_idx:04d}",
                "source_system": "SMMS",
                "department": "Signal & Telecom",
                "section_id": sec_id,
                "section_name": sec_name,
                "zone_code": zone_code,
                "defect_type": def_name,
                "defect_description": f"{def_desc} on {sec_name}",
                "criticality": crit,
                "reported_date": reported.isoformat(),
                "due_date": due.isoformat(),
                "estimated_duration": dur,
                "location_km": loc,
                "recurrence_count": random.choice([0, 0, 1, 2]),
                "inspection_gap_days": random.choice([15, 30, 45, 60]),
                "import_source": "data.gov.in"
            })
            task_idx += 1

        # 1-2 TRD
        for _ in range(random.randint(2, 3)):
            def_name, def_desc, crit, dur = random.choice(TRD_DEFECTS)
            reported = today - timedelta(days=random.randint(2, 20))
            due = reported + timedelta(days=random.randint(5, 25))
            loc = round(random.uniform(1.0, max(2.0, total_km - 1.0)), 1)
            tasks.append({
                "task_id": f"TDMS-{task_idx:04d}",
                "source_system": "TDMS",
                "department": "Traction Distribution",
                "section_id": sec_id,
                "section_name": sec_name,
                "zone_code": zone_code,
                "defect_type": def_name,
                "defect_description": f"{def_desc} on {sec_name}",
                "criticality": crit,
                "reported_date": reported.isoformat(),
                "due_date": due.isoformat(),
                "estimated_duration": dur,
                "location_km": loc,
                "recurrence_count": random.choice([0, 0, 1, 2]),
                "inspection_gap_days": random.choice([15, 30, 45, 60]),
                "import_source": "data.gov.in"
            })
            task_idx += 1

    # Write block requests CSV
    csv_file = "backend/data/data_gov_in_block_requests.csv"
    fields = [
        "task_id", "source_system", "department", "section_id", "section_name",
        "zone_code", "defect_type", "defect_description", "criticality",
        "reported_date", "due_date", "estimated_duration", "location_km",
        "recurrence_count", "inspection_gap_days", "import_source"
    ]
    with open(csv_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(tasks)
    print(f"Generated {len(tasks)} data.gov.in tasks across all 18 zones into {csv_file}")

    # Generate Train Schedules CSV for all corridors
    train_types = ["Vande Bharat Express", "Rajdhani Express", "Shatabdi Express", "Superfast Express", "Container Freight", "POL Tanker Freight"]
    train_rows = []
    t_num = 12001
    for corridor in ALL_18_ZONE_CORRIDORS:
        sec_id = corridor["section_id"]
        # Generate 4-6 trains per corridor
        for _ in range(random.randint(4, 6)):
            ttype = random.choice(train_types)
            is_pax = "Freight" not in ttype
            # Peak hours for passenger, off-peak for freight
            if is_pax:
                dep_hour = random.choice([6, 7, 8, 9, 16, 17, 18, 19, 20])
            else:
                dep_hour = random.choice([0, 1, 2, 3, 11, 12, 13, 14, 22, 23])
            dep_min = random.choice([0, 15, 30, 45])
            arr_hour = (dep_hour + random.randint(1, 3)) % 24
            arr_min = random.choice([10, 25, 40, 55])
            train_rows.append({
                "train_number": str(t_num),
                "train_name": f"{corridor['from_station'].split()[0]} - {corridor['to_station'].split()[0]} {ttype}",
                "section_id": sec_id,
                "departure_time": f"{dep_hour:02d}:{dep_min:02d}",
                "arrival_time": f"{arr_hour:02d}:{arr_min:02d}",
                "frequency": "Daily",
                "train_type": "Passenger" if is_pax else "Freight",
                "days_of_run": "All Days"
            })
            t_num += 1

    sched_file = "backend/data/data_gov_in_train_schedules.csv"
    s_fields = ["train_number", "train_name", "section_id", "departure_time", "arrival_time", "frequency", "train_type", "days_of_run"]
    with open(sched_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=s_fields)
        writer.writeheader()
        writer.writerows(train_rows)
    print(f"Generated {len(train_rows)} train schedules across all 18 zones into {sched_file}")


if __name__ == "__main__":
    generate_datasets()
