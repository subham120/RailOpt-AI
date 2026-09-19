"""
TMS (Track Management System) CSV adapter.
Maps Indian Railways TMS export format to internal MaintenanceTask schema.

Expected CSV columns:
  Asset_ID, Section_Code, From_Station, To_Station, Defect_Category,
  Defect_Description, Priority, Scheduled_Date, Est_Duration_Hrs,
  Location_KM, Last_Inspection, Recurrence_Count
"""
import io
import uuid
from datetime import date, datetime

import pandas as pd

PRIORITY_MAP = {
    "P1": "critical",
    "P2": "high",
    "P3": "medium",
    "P4": "low",
    "Critical": "critical",
    "High": "high",
    "Medium": "medium",
    "Low": "low",
    "1": "critical",
    "2": "high",
    "3": "medium",
    "4": "low",
}

REQUIRED_COLS = {"Asset_ID", "Section_Code", "Defect_Category", "Priority", "Scheduled_Date", "Est_Duration_Hrs"}


class TMSAdapter:
    def parse(self, file_bytes: bytes) -> tuple[list[dict], list[str]]:
        """
        Parse TMS CSV bytes.
        Returns (list_of_task_dicts, list_of_error_strings).
        """
        try:
            df = pd.read_csv(io.BytesIO(file_bytes))
        except Exception as e:
            raise ValueError(f"Cannot read CSV: {e}")

        df.columns = [c.strip() for c in df.columns]
        missing = REQUIRED_COLS - set(df.columns)
        if missing:
            raise ValueError(f"Missing required columns: {missing}. Download the template from /api/ingest/template/TMS")

        rows, errors = [], []

        for i, row in df.iterrows():
            row_num = i + 2  # 1-indexed with header
            try:
                task_id = f"TMS-{str(row['Asset_ID']).strip()}"
                section_id = str(row["Section_Code"]).strip()
                defect = str(row["Defect_Category"]).strip()
                priority_raw = str(row.get("Priority", "P3")).strip()
                criticality = PRIORITY_MAP.get(priority_raw, "medium")
                due_date = self._parse_date(str(row["Scheduled_Date"]))
                duration_hrs = float(row["Est_Duration_Hrs"])
                duration_min = max(15, int(duration_hrs * 60))
                location_km = float(row["Location_KM"]) if pd.notna(row.get("Location_KM")) else None
                last_insp = self._parse_date(str(row.get("Last_Inspection", ""))) if pd.notna(row.get("Last_Inspection")) else None
                recurrence = int(row["Recurrence_Count"]) if pd.notna(row.get("Recurrence_Count")) else 0
                section_name = f"{row.get('From_Station', '')} - {row.get('To_Station', '')}".strip(" -")

                # Compute inspection gap
                insp_gap = (date.today() - last_insp).days if last_insp else 0

                rows.append({
                    "id": uuid.uuid4(),
                    "task_id": task_id,
                    "source_system": "TMS",
                    "department": "Engineering",
                    "section_id": section_id,
                    "section_name": section_name or section_id,
                    "defect_type": defect,
                    "defect_description": str(row.get("Defect_Description", "")).strip(),
                    "criticality": criticality,
                    "reported_date": date.today(),
                    "due_date": due_date,
                    "estimated_duration": duration_min,
                    "location_km": location_km,
                    "recurrence_count": recurrence,
                    "last_occurrence": last_insp,
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
