"""
Unit tests for XGBoost + Rule Hybrid Prioritizer & SHAP Explanation.
"""
from datetime import date, timedelta
from backend.ai.scoring.prioritizer import PrioritizationEngine, prioritization_engine


def test_prioritizer_feature_extraction():
    """Verify 5-feature normalization ranges [0.0, 1.0]."""
    engine = PrioritizationEngine()
    today = date.today()
    task = {
        "taskId": "TMS-TEST-100",
        "defectType": "Rail fracture",  # Safety 1.0
        "dueDate": (today - timedelta(days=15)).isoformat(),  # 15 days overdue -> 0.5
        "recurrenceCount": 2,  # 2/5 -> 0.4
        "inspectionGapDays": 45,  # 45/90 -> 0.5
        "sectionId": "NDLS-GZB",
    }
    features = engine._extract_features(task, traffic_density="high")
    assert features.shape == (1, 5)
    safety, overdue, traffic, recurrence, gap = features[0]
    assert safety == 1.0
    assert 0.45 <= overdue <= 0.55
    assert traffic == 1.0
    assert recurrence == 0.4
    assert gap == 0.5


def test_prioritizer_score_tasks_output():
    """Score tasks returns valid score, urgency tier, and breakdown."""
    tasks = [
        {
            "taskId": "T1",
            "defectType": "Rail fracture",
            "criticality": "critical",
            "sectionId": "SEC-A",
            "dueDate": (date.today() - timedelta(days=10)).isoformat(),
        },
        {
            "taskId": "T2",
            "defectType": "Vegetation clearance",
            "criticality": "low",
            "sectionId": "SEC-B",
            "dueDate": (date.today() + timedelta(days=10)).isoformat(),
        },
    ]
    corridor_map = {"SEC-A": "high", "SEC-B": "low"}
    scored = prioritization_engine.score_tasks(tasks, corridor_map)

    assert len(scored) == 2
    # Rail fracture should have higher criticality score than vegetation clearance
    assert scored[0]["taskId"] == "T1"
    assert scored[0]["criticalityScore"] > scored[1]["criticalityScore"]
    assert scored[0]["urgencyTier"] in ("Critical", "High")
    assert "scoreBreakdown" in scored[0]
    assert "safety" in scored[0]["scoreBreakdown"]


def test_prioritizer_explain_task():
    """SHAP or rule-proportional explanation returns non-empty dict."""
    task = {
        "taskId": "T-EXPLAIN",
        "defectType": "Signal failure",
        "criticality": "critical",
        "dueDate": date.today().isoformat(),
        "recurrenceCount": 1,
        "inspectionGapDays": 30,
        "sectionId": "NDLS-GZB",
    }
    explanation = prioritization_engine.explain_task(task)
    assert isinstance(explanation, dict)
    expected_keys = {"safety", "overdue", "traffic", "recurrence", "inspectionGap"}
    assert set(explanation.keys()) == expected_keys
    for k, v in explanation.items():
        assert isinstance(v, (float, int))
