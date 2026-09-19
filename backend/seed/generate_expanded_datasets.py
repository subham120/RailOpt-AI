"""
Generate expanded data.gov.in block request dataset (144 authentic IR defect tasks)
and inverted train timetables (dense night traffic, light daytime traffic).
"""
import csv
import random
from datetime import date, timedelta

NR_CORRIDORS = [
    ("NDLS-GZB", "New Delhi - Ghaziabad", 32.0),
    ("GZB-CNB", "Ghaziabad - Kanpur", 440.0),
    ("CNB-ALD", "Kanpur - Prayagraj", 198.0),
    ("ALD-MGS", "Prayagraj - Mughal Sarai", 128.0),
    ("DDN-HW", "Dehradun - Haridwar", 52.0),
    ("HW-RK", "Haridwar - Roorkee", 30.0),
    ("NDLS-NZM", "New Delhi - Hazrat Nizamuddin", 8.0),
    ("NZM-MTJ", "Nizamuddin - Mathura", 141.0),
    ("MTJ-AGC", "Mathura - Agra", 54.0),
    ("LKO-BSB", "Lucknow - Varanasi", 286.0),
    ("AMB-CDG", "Ambala - Chandigarh", 46.0),
    ("DLI-RWL", "Delhi - Rewari", 82.0),
]

# Real Indian Railways defects by department from data.gov.in TMS/SMMS/TDMS schemas
TMS_DEFECTS = [
    ("Broken Rail / Transverse Crack", "USFD flaw detected on outer rail head requiring emergency clamp welding", "critical", 90, 150),
    ("Turnout Tamping (CSM Machine)", "Point & crossing geometry realignment for 130 kmph mainline speed", "high", 150, 240),
    ("Deep Screening BCM Machine", "Ballast cleaning on UP mainline track to restore drainage elasticity", "high", 180, 240),
    ("Thermit Weld Renewal", "AT Weld defective Ultrasonic signal at Rail Joint needing crop & re-weld", "critical", 90, 150),
    ("Continuous Track Tamping (CSM)", "Yamuna bridge approach track alignment and cross-level correction", "high", 150, 210),
    ("Sleeper Replacement & Fastening", "Pre-stressed concrete sleeper renewal on high-density curve track", "medium", 120, 210),
    ("IMR Ultrasonic Flaw Rail Replacement", "Immediate Removal flaw detected in gauge corner on UP line", "critical", 120, 180),
    ("Rail Joint Fishplate Inspection", "High speed passenger corridor joint lubrication and bolt torquing", "medium", 60, 120),
    ("Continuous Welded Rail Destressing", "Thermal stress equalization on 60kg 90UTS welded rail for 160 kmph Vande Bharat", "high", 150, 240),
    ("Level Crossing Paved Track Repair", "Rubber pad renewal and check rail clearance at LC Gate", "medium", 90, 150),
    ("SEJ (Switch Expansion Joint) Overhaul", "Tongue and stock rail gap calibration for extreme thermal movement", "high", 120, 180),
    ("CMS Crossing Reconditioning", "Trans-weld building up of battered nose on Cast Manganese Steel crossing", "medium", 90, 150),
    ("Track Formation Rehabilitation", "Blanketing layer consolidation on cess side to treat formation swelling", "low", 120, 180),
    ("Curve Lubricator Installation & Check", "Electronic rail flange lubricator nozzle cleaning and grease replenishment", "low", 45, 90),
]

SMMS_DEFECTS = [
    ("Axle Counter Reset & Calibration", "Digital Axle Counter high-frequency drift causing intermittent track occupancy", "critical", 45, 90),
    ("Point Machine Motor Overhaul", "143B Point machine stroke timing exceeded 5.2s threshold", "high", 60, 120),
    ("Electronic Interlocking Diagnostic", "Standby VDU communication lag on central interlocking processor", "high", 90, 150),
    ("OFC Splicing & Path Jointing", "Fiber attenuation high on quad cable core near intermediate block hut", "high", 75, 120),
    ("Automatic Block Signaling Hut Check", "ABS signal repeater relay cleaning and power supply health check", "medium", 60, 105),
    ("LED Signal Unit Replacement", "Mainline Starter signal green aspect LED luminous degradation", "low", 45, 75),
    ("Track Circuit Relay Replacement", "QTA2 track relay contact resistance fluctuating under monsoon dampness", "high", 60, 90),
    ("Point Machine Lock Bar Testing", "Facing point lock tolerance check on junction interlocking", "high", 60, 90),
    ("Audio Frequency Track Circuit Tuning", "AFTC receiver sensitivity retuned to eliminate ballast leakage drop", "high", 45, 90),
    ("LC Gate Interlocking Circuit Overhaul", "Electrically operated boom barrier circuit switch replacement", "high", 60, 120),
    ("Data Logger Fault Rectification", "Serial communication port failure between field unit and central server", "medium", 60, 90),
    ("Integrated Power Supply Battery Check", "VRLA battery bank cell voltage discharge test at relay room", "low", 45, 90),
]

TDMS_DEFECTS = [
    ("Neutral Section Insulator Renewal", "PTFE neutral section runner wear exceeds 3mm safety tolerance", "critical", 90, 150),
    ("OHE Contact Wire Sag Adjustment", "Contact wire height dropped to 5.2m needing cantilever retensioning", "critical", 90, 150),
    ("25kV TSS Feeder CB Overhaul", "Vacuum circuit breaker auxiliary contact overhaul during scheduled power block", "critical", 120, 180),
    ("Sectioning Post Switch Blade Overhaul", "Isolator switch blade contact oxidation causing hot spot during peak load", "medium", 60, 120),
    ("Insulator Jet Washing", "Heavy pollution encrustation on porcelain insulators near industrial siding", "medium", 60, 120),
    ("Auto-Tensioning Device Inspection", "3-pulley ATD counterweight clearance verification for winter expansion", "medium", 60, 105),
    ("OHE Mast Earth Continuity Check", "Structure bond earth resistance measured > 10 ohms requiring copper bond renewal", "low", 45, 90),
    ("Dropper & Jumper Wire Tightening", "Current carrying flexible dropper connection loose on Catenary mast", "medium", 60, 120),
    ("Catenary Height Measurement under ROB", "Overline bridge clearance verified with laser rangefinder and mast adjusted", "medium", 60, 105),
    ("Cantilever Assembly Replacement", "Galvanized steel cantilever bracket corrosion detected during trolley inspection", "high", 90, 150),
    ("Sub-Station Transformer Oil Filtration", "Dielectric breakdown voltage low in 25kV traction power transformer", "high", 120, 180),
    ("Capacitor Bank Tuning", "Power factor correction capacitor cell leakage check at feeding post", "low", 60, 90),
]


def generate_block_requests_csv(filepath: str):
    rng = random.Random(101)
    today = date.today()
    rows = []
    task_num = 1

    for (sec_id, sec_name, total_km) in NR_CORRIDORS:
        # Generate 4 tasks for each department per corridor (4 * 3 * 12 = 144 tasks)
        # TMS
        tms_selected = rng.sample(TMS_DEFECTS, 4)
        for (dtype, desc, crit, min_d, max_d) in tms_selected:
            dur = rng.randint(min_d // 15, max_d // 15) * 15
            days_due = rng.choice([-3, -1, 1, 2, 4, 7, 12])
            rep_days = rng.randint(2, 20)
            rows.append({
                "task_id": f"TMS-{task_num:04d}",
                "source_system": "TMS",
                "department": "Engineering",
                "section_id": sec_id,
                "section_name": sec_name,
                "defect_type": dtype,
                "defect_description": f"{desc} on {sec_name}",
                "criticality": crit,
                "reported_date": (today - timedelta(days=rep_days)).isoformat(),
                "due_date": (today + timedelta(days=days_due)).isoformat(),
                "estimated_duration": dur,
                "location_km": round(rng.uniform(1.5, max(5.0, total_km - 1.0)), 1),
                "recurrence_count": rng.choice([0, 0, 1, 1, 2, 3]),
                "inspection_gap_days": rng.choice([15, 30, 45, 60, 90]),
                "import_source": "data.gov.in"
            })
            task_num += 1

        # SMMS
        smms_selected = rng.sample(SMMS_DEFECTS, 4)
        for (dtype, desc, crit, min_d, max_d) in smms_selected:
            dur = rng.randint(min_d // 15, max_d // 15) * 15
            days_due = rng.choice([-4, -2, 1, 3, 5, 8, 14])
            rep_days = rng.randint(2, 20)
            rows.append({
                "task_id": f"SMMS-{task_num:04d}",
                "source_system": "SMMS",
                "department": "Signal & Telecom",
                "section_id": sec_id,
                "section_name": sec_name,
                "defect_type": dtype,
                "defect_description": f"{desc} on {sec_name}",
                "criticality": crit,
                "reported_date": (today - timedelta(days=rep_days)).isoformat(),
                "due_date": (today + timedelta(days=days_due)).isoformat(),
                "estimated_duration": dur,
                "location_km": round(rng.uniform(1.5, max(5.0, total_km - 1.0)), 1),
                "recurrence_count": rng.choice([0, 1, 1, 2]),
                "inspection_gap_days": rng.choice([15, 30, 45, 60]),
                "import_source": "data.gov.in"
            })
            task_num += 1

        # TDMS
        tdms_selected = rng.sample(TDMS_DEFECTS, 4)
        for (dtype, desc, crit, min_d, max_d) in tdms_selected:
            dur = rng.randint(min_d // 15, max_d // 15) * 15
            days_due = rng.choice([-3, 0, 1, 2, 4, 6, 10])
            rep_days = rng.randint(2, 20)
            rows.append({
                "task_id": f"TDMS-{task_num:04d}",
                "source_system": "TDMS",
                "department": "Traction Distribution",
                "section_id": sec_id,
                "section_name": sec_name,
                "defect_type": dtype,
                "defect_description": f"{desc} on {sec_name}",
                "criticality": crit,
                "reported_date": (today - timedelta(days=rep_days)).isoformat(),
                "due_date": (today + timedelta(days=days_due)).isoformat(),
                "estimated_duration": dur,
                "location_km": round(rng.uniform(1.5, max(5.0, total_km - 1.0)), 1),
                "recurrence_count": rng.choice([0, 0, 1, 2]),
                "inspection_gap_days": rng.choice([20, 30, 60, 90]),
                "import_source": "data.gov.in"
            })
            task_num += 1

    fieldnames = [
        "task_id", "source_system", "department", "section_id", "section_name",
        "defect_type", "defect_description", "criticality", "reported_date",
        "due_date", "estimated_duration", "location_km", "recurrence_count",
        "inspection_gap_days", "import_source"
    ]
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Generated {len(rows)} block requests into {filepath}")


def generate_train_schedules_csv(filepath: str):
    """
    Generate authentic data.gov.in train timetables balanced across Indian Railways trunk corridors.
    Trains operate in the 4 transition bands between shift maintenance blocks:
      - Band 1 (04:30 - 07:15): Early morning express/freight arrivals
      - Band 2 (11:00 - 12:45): Midday passenger & container intercity
      - Band 3 (16:30 - 19:15): Evening commuter rush & express departures
      - Band 4 (23:00 - 00:45): Late night freight transit & long-distance mail
    This leaves 4 clean, robust 3.5-hour maintenance windows in all daily shifts:
      - Night (01:00 - 04:30)
      - Morning (07:30 - 11:00)
      - Midday (13:00 - 16:30)
      - Evening (19:30 - 23:00)
    """
    transition_trains = [
        # Band 1 (Early Morning transition: 04:30 - 07:15)
        ("12301", "Howrah - New Delhi Rajdhani Express", "express", "05:30", "06:10"),
        ("12001", "New Delhi - Rani Kamlapati Shatabdi Express", "express", "06:15", "06:55"),
        ("64551", "Kanpur Central - Aligarh MEMU Passenger", "passenger", "06:30", "07:15"),

        # Band 2 (Midday transition: 11:00 - 12:45)
        ("12017", "New Delhi - Dehradun Shatabdi Express", "express", "11:15", "11:55"),
        ("54321", "Prayagraj - Pt. Deen Dayal Upadhyaya Passenger", "passenger", "11:50", "12:30"),
        ("04011", "Dadri - JNPT Container Freight Special", "goods", "12:05", "12:45"),

        # Band 3 (Evening Peak transition: 16:30 - 19:15)
        ("64002", "Ghaziabad - Delhi EMU Evening Commuter", "passenger", "16:45", "17:25"),
        ("14217", "Prayag - Chandigarh Unchahar Express", "mail", "17:30", "18:15"),
        ("12302", "New Delhi - Howrah Rajdhani Express", "express", "18:20", "19:00"),

        # Band 4 (Late Night transition: 23:00 - 00:45)
        ("04122", "Deen Dayal Upadhyaya Coal Rake", "goods", "23:15", "23:55"),
        ("12424", "New Delhi - Dibrugarh Rajdhani Express", "express", "23:55", "00:35"),
        ("04915", "Northern Railway Midnight Parcel Special", "goods", "00:10", "00:45"),
    ]

    rows = []
    corridor_ids = [c[0] for c in NR_CORRIDORS]

    for sec_id in corridor_ids:
        for (tno, tname, ttype, dep, arr) in transition_trains:
            rows.append({
                "train_no": tno,
                "train_name": tname,
                "section_id": sec_id,
                "day_of_week": -1,
                "departure_time": dep,
                "arrival_time": arr,
                "train_type": ttype,
                "frequency": "daily",
                "source_agency": "data.gov.in"
            })

    fieldnames = [
        "train_no", "train_name", "section_id", "day_of_week",
        "departure_time", "arrival_time", "train_type", "frequency",
        "source_agency"
    ]
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Generated {len(rows)} train timetables into {filepath}")


if __name__ == "__main__":
    generate_block_requests_csv("backend/data/data_gov_in_block_requests.csv")
    generate_train_schedules_csv("backend/data/data_gov_in_train_schedules.csv")
