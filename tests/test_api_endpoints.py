"""
End-to-end integration tests for all RailOpt AI FastAPI routers against active database.
"""
from fastapi.testclient import TestClient
from backend.main import app
from backend.core.security import create_access_token
from backend.db.database import SessionLocal
from backend.models.user import User

client = TestClient(app)


def _get_admin_token() -> str:
    with SessionLocal() as db:
        admin_user = db.query(User).filter(User.email == "admin@railways.gov.in").first()
        if admin_user:
            return create_access_token({"sub": str(admin_user.id), "role": admin_user.role})
    return create_access_token({"sub": "admin-test", "role": "admin"})


def test_auth_login_and_me():
    """Verify login authentication and user profile retrieval."""
    login_res = client.post(
        "/api/auth/login",
        json={"email": "admin@railways.gov.in", "password": "RailAdmin@120"},
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["success"] is True
    token = login_data["data"]["token"]
    assert token

    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["success"] is True
    assert me_data["data"]["email"] == "admin@railways.gov.in"
    assert me_data["data"]["role"] == "admin"


def test_corridors_list_and_detail():
    """Verify corridor blocks endpoints."""
    token = _get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/corridors", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    corridors = data["data"]
    assert len(corridors) >= 12

    first_id = corridors[0]["sectionId"]
    detail_res = client.get(f"/api/corridors/{first_id}", headers=headers)
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["success"] is True
    assert detail_data["data"]["sectionId"] == first_id


def test_tasks_list():
    """Verify maintenance tasks retrieval and telemetry."""
    token = _get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/tasks", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["data"]) > 0


def test_schedules_list_and_generation():
    """Verify block schedules list and CP-SAT generation."""
    token = _get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/schedules?planType=weekly", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "data" in data

    gen_res = client.post("/api/schedules/generate", json={"plan_type": "daily"}, headers=headers)
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    assert gen_data["success"] is True
    assert len(gen_data["data"]) > 0


def test_reports_dashboard_stats():
    """Verify reports executive KPI aggregations."""
    token = _get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/reports/dashboard-stats", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "assetAvailability" in data["data"]
    assert "totalTasks" in data["data"]
    assert data["data"]["assetAvailability"] >= 80.0


def test_reports_downtime_and_utilization():
    """Verify downtime shift leveling and utilization statistics."""
    token = _get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    dt_res = client.get("/api/reports/downtime?planType=weekly", headers=headers)
    assert dt_res.status_code == 200
    dt_data = dt_res.json()
    assert dt_data["success"] is True
    assert len(dt_data["data"]) >= 12

    ut_res = client.get("/api/reports/utilization?planType=weekly", headers=headers)
    assert ut_res.status_code == 200
    ut_data = ut_res.json()
    assert ut_data["success"] is True
    assert "shiftUtilization" in ut_data["data"]
    assert len(ut_data["data"]["shiftUtilization"]) == 4


def test_reports_audit_and_export():
    """Verify audit log retrieval and Excel report streaming export."""
    token = _get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    audit_res = client.get("/api/reports/audit-log?limit=10", headers=headers)
    assert audit_res.status_code == 200
    audit_data = audit_res.json()
    assert audit_data["success"] is True

    export_res = client.get("/api/reports/export?reportType=schedules", headers=headers)
    assert export_res.status_code == 200
    assert len(export_res.content) > 100


def test_alerts_endpoint():
    """Verify real-time system alerts endpoint."""
    token = _get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/alerts", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert isinstance(data["data"], list)
    assert "count" in data


def test_zone_scoping_across_endpoints():
    """Verify all 18-zone endpoints properly filter data when zone is specified."""
    token = _get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Corridors zone filter
    res_nr = client.get("/api/corridors?zone=NR", headers=headers)
    assert res_nr.status_code == 200
    data_nr = res_nr.json()["data"]
    assert len(data_nr) > 0
    assert all(c["zoneCode"] == "NR" for c in data_nr)

    res_cr = client.get("/api/corridors?zone=CR", headers=headers)
    assert res_cr.status_code == 200
    data_cr = res_cr.json()["data"]
    assert len(data_cr) > 0
    assert all(c["zoneCode"] == "CR" for c in data_cr)

    # 2. Tasks zone filter
    tasks_wr = client.get("/api/tasks?zone=WR&limit=50", headers=headers)
    assert tasks_wr.status_code == 200
    wr_items = tasks_wr.json()["data"]
    assert len(wr_items) > 0
    assert all(t["zoneCode"] == "WR" for t in wr_items)

    # 3. Schedules zone filter
    sched_sr = client.get("/api/schedules?zone=SR&limit=50", headers=headers)
    assert sched_sr.status_code == 200
    sr_scheds = sched_sr.json()["data"]
    assert len(sr_scheds) > 0
    assert all(s["zoneCode"] == "SR" for s in sr_scheds)

    # 4. Reports dashboard-stats zone filter
    stats_ecr = client.get("/api/reports/dashboard-stats?zone=ECR", headers=headers)
    assert stats_ecr.status_code == 200
    ecr_stats = stats_ecr.json()["data"]
    assert ecr_stats["totalTasks"] > 0

    # 5. Assistant suggestions zone filter
    sug_nwr = client.get("/api/assistant/suggestions?zone=NWR", headers=headers)
    assert sug_nwr.status_code == 200
    nwr_sugs = sug_nwr.json()["suggestions"]
    assert len(nwr_sugs) > 0

