"""
Unit tests for data ingest CSV adapters (TMS, SMMS, TDMS).
"""
from backend.ingest.tms_adapter import TMSAdapter
from backend.ingest.smms_adapter import SMMSAdapter
from backend.ingest.tdms_adapter import TDMSAdapter


def test_tms_adapter_parsing():
    """Verify TMS CSV parsing, field normalization, and duration calculation."""
    csv_data = (
        "Asset_ID,Section_Code,From_Station,To_Station,Defect_Category,Defect_Description,"
        "Priority,Scheduled_Date,Est_Duration_Hrs,Location_KM,Last_Inspection,Recurrence_Count\n"
        "TEST-001,NDLS-GZB,New Delhi,Ghaziabad,Rail fracture,Crack at km 12.4,P1,2026-09-15,2.5,12.4,2026-08-01,2\n"
    ).encode("utf-8")

    adapter = TMSAdapter()
    rows, errors = adapter.parse(csv_data)

    assert len(errors) == 0
    assert len(rows) == 1
    row = rows[0]
    assert row["task_id"] == "TMS-TEST-001"
    assert row["section_id"] == "NDLS-GZB"
    assert row["department"] == "Engineering"
    assert row["criticality"] == "critical"  # P1 -> critical
    assert row["estimated_duration"] == 150  # 2.5 hrs * 60 = 150 mins
    assert row["location_km"] == 12.4
    assert row["recurrence_count"] == 2


def test_smms_adapter_parsing():
    """Verify SMMS CSV parsing and signal defect mapping."""
    csv_data = (
        "Work_Order_ID,Section_ID,Station_From,Station_To,Signal_Type,Fault_Description,"
        "Urgency,Due_Date,Duration_Minutes,KM_Marker,Last_Maintenance\n"
        "TEST-001,NDLS-GZB,New Delhi,Ghaziabad,Track circuit,Shunting failure,High,2026-09-20,90,8.2,2026-07-15\n"
    ).encode("utf-8")

    adapter = SMMSAdapter()
    rows, errors = adapter.parse(csv_data)

    assert len(errors) == 0
    assert len(rows) == 1
    row = rows[0]
    assert row["task_id"] == "SMMS-TEST-001"
    assert row["department"] == "Signal & Telecom"
    assert row["criticality"] == "high"
    assert row["estimated_duration"] == 90


def test_tdms_adapter_parsing():
    """Verify TDMS CSV parsing and traction distribution mapping."""
    csv_data = (
        "Equipment_ID,Corridor_Code,Start_Station,End_Station,Equipment_Type,Defect_Details,"
        "Criticality_Level,Target_Date,Estimated_Hours,Location_KM,Previous_Failure_Date\n"
        "TEST-001,NDLS-GZB,New Delhi,Ghaziabad,OHE,Insulator flashover,Critical,2026-09-10,3.0,18.0,2026-08-20\n"
    ).encode("utf-8")

    adapter = TDMSAdapter()
    rows, errors = adapter.parse(csv_data)

    assert len(errors) == 0
    assert len(rows) == 1
    row = rows[0]
    assert row["task_id"] == "TDMS-TEST-001"
    assert row["department"] == "Traction Distribution"
    assert row["criticality"] == "critical"
    assert row["estimated_duration"] == 180  # 3.0 hrs * 60 = 180 mins
