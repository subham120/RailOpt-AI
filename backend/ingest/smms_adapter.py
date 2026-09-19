"""
SMMS (Signalling Maintenance & Management System) CSV adapter.
Maps SMMS export format to internal MaintenanceTask schema.

Expected CSV columns:
  Work_Order_ID, Section_ID, Station_From, Station_To, Signal_Type,
  Fault_Description, Urgency, Due_Date, Duration_Minutes, KM_Marker, Last_Maintenance
"""
import io
import uuid
from datetime import date, datetime

import pandas as pd

URGENCY_MAP = {
    "Critical": "critical",
    "High": "high",
    "Medium": "medium",
    "Low": "low",
    "CRITICAL": "critical",
    "HIGH": "high",
    "MEDIUM": "medium",
    "LOW": "low",
    "1": "critical",
    "2": "high",
    "3": "medium",
    "4": "low",
}

REQUIRED_COLS = {"Work_Order_ID", "Section_ID", "Signal_Type", "Fault_Description", "Urgency", "Due_Date", "Duration_Minutes"}


class SMMSAdapter:
    def parse(self, file_bytes: bytes) -> tuple[list[dict], list[str]]:
        try:
            df = pd.read_csv(io.BytesIO(file_bytes))
        except Exception as e:
            raise ValueError(f"Cannot read CSV: {e}")

        df.columns = [c.strip() for c in df.columns]
        missing = REQUIRED_COLS - set(df.columns)
        if missing:
            raise ValueError(f"Missing required columns: {missing}. Download template from /api/ingest/template/SMMS")

        rows, errors = [], []

        for i, row in df.iterrows():
            row_num = i + 2
            try:
                task_id = f"SMMS-{str(row['Work_Order_ID']).strip()}"
                section_id = str(row["Section_ID"]).strip()
                urgency_raw = str(row.get("Urgency", "Medium")).strip()
                criticality = URGENCY_MAP.get(urgency_raw, "medium")
                due_date = self._parse_date(str(row["Due_Date"]))
                duration_min = max(15, int(float(row["Duration_Minutes"])))
                km = float(row["KM_Marker"]) if pd.notna(row.get("KM_Marker")) else None
                last_maint = self._parse_date(str(row.get("Last_Maintenance", ""))) if pd.notna(row.get("Last_Maintenance")) else None
                section_name = f"{row.get('Station_From', '')} - {row.get('Station_To', '')}".strip(" -")
                insp_gap = (date.today() - last_maint).days if last_maint else 0

                rows.append({
                    "id": uuid.uuid4(),
                    "task_id": task_id,
                    "source_system": "SMMS",
                    "department": "Signal & Telecom",
                    "section_id": section_id,
                    "section_name": section_name or section_id,
                    "defect_type": str(row.get("Signal_Type", "Signal failure")).strip(),
                    "defect_description": str(row.get("Fault_Description", "")).strip(),
                    "criticality": criticality,
                    "reported_date": date.today(),
                    "due_date": due_date,
                    "estimated_duration": duration_min,
                    "location_km": km,
                    "recurrence_count": 0,
                    "last_occurrence": last_maint,
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
