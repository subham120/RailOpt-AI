"""
TDMS (Traction Distribution Management System) CSV adapter.
Maps TDMS export format to internal MaintenanceTask schema.

Expected CSV columns:
  Equipment_ID, Corridor_Code, Start_Station, End_Station, Equipment_Type,
  Defect_Details, Criticality_Level, Target_Date, Estimated_Hours,
  Location_KM, Previous_Failure_Date
"""
import io
import uuid
from datetime import date, datetime

import pandas as pd

CRITICALITY_MAP = {
    "Critical": "critical",
    "High": "high",
    "Medium": "medium",
    "Low": "low",
    "CRITICAL": "critical",
    "HIGH": "high",
    "MEDIUM": "medium",
    "LOW": "low",
    "P1": "critical",
    "P2": "high",
    "P3": "medium",
    "P4": "low",
}

REQUIRED_COLS = {
    "Equipment_ID", "Corridor_Code", "Equipment_Type",
    "Defect_Details", "Criticality_Level", "Target_Date", "Estimated_Hours",
}


class TDMSAdapter:
    def parse(self, file_bytes: bytes) -> tuple[list[dict], list[str]]:
        try:
            df = pd.read_csv(io.BytesIO(file_bytes))
        except Exception as e:
            raise ValueError(f"Cannot read CSV: {e}")

        df.columns = [c.strip() for c in df.columns]
        missing = REQUIRED_COLS - set(df.columns)
        if missing:
            raise ValueError(f"Missing required columns: {missing}. Download template from /api/ingest/template/TDMS")

        rows, errors = [], []

        for i, row in df.iterrows():
            row_num = i + 2
            try:
                task_id = f"TDMS-{str(row['Equipment_ID']).strip()}"
                section_id = str(row["Corridor_Code"]).strip()
                crit_raw = str(row.get("Criticality_Level", "Medium")).strip()
                criticality = CRITICALITY_MAP.get(crit_raw, "medium")
                due_date = self._parse_date(str(row["Target_Date"]))
                duration_hrs = float(row["Estimated_Hours"])
                duration_min = max(15, int(duration_hrs * 60))
                km = float(row["Location_KM"]) if pd.notna(row.get("Location_KM")) else None
                prev_fail = self._parse_date(str(row.get("Previous_Failure_Date", ""))) if pd.notna(row.get("Previous_Failure_Date")) else None
                section_name = f"{row.get('Start_Station', '')} - {row.get('End_Station', '')}".strip(" -")
                insp_gap = (date.today() - prev_fail).days if prev_fail else 0

                rows.append({
                    "id": uuid.uuid4(),
                    "task_id": task_id,
                    "source_system": "TDMS",
                    "department": "Traction Distribution",
                    "section_id": section_id,
                    "section_name": section_name or section_id,
                    "defect_type": str(row.get("Equipment_Type", "OHE maintenance")).strip(),
                    "defect_description": str(row.get("Defect_Details", "")).strip(),
                    "criticality": criticality,
                    "reported_date": date.today(),
                    "due_date": due_date,
                    "estimated_duration": duration_min,
                    "location_km": km,
                    "recurrence_count": 0,
                    "last_occurrence": prev_fail,
                    "inspection_gap_days": insp_gap,
                    "status": "pending",
                })
            except Exception as e:
                errors.append(f"Row {row_num}: {e}")

        return rows, errors

    def _parse_date(self, val: str) -> date:
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y"):
            try:
                return datetime.strptime(val.strip(), fmt).date()
            except ValueError:
                continue
        raise ValueError(f"Cannot parse date: {val!r}")
