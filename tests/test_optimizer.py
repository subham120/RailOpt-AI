"""
Unit tests for OR-Tools CP-SAT Block Optimizer.
"""
from datetime import date
from backend.ai.optimizer.scheduler import BlockOptimizer, block_optimizer


def test_optimizer_no_tasks():
    """Optimizer handles empty task list gracefully."""
    result = block_optimizer.optimize(
        tasks=[],
        windows=[],
        ttt_blocked={},
        plan_type="weekly",
        base_date=date(2026, 9, 15),
    )
    assert result == []


def test_optimizer_single_task_scheduled():
    """Single task placed inside available block window."""
    tasks = [
        {
            "taskId": "TMS-TEST-001",
            "sectionId": "NDLS-GZB",
            "department": "Engineering",
            "estimatedDuration": 60,
            "criticality": "high",
            "criticalityScore": 0.85,
        }
    ]
    windows = [
        {
            "sectionId": "NDLS-GZB",
            "dayOfWeek": 2,  # Tuesday
            "startTime": "01:00",
            "endTime": "04:00",
            "maxDurationMinutes": 180,
        }
    ]
    ttt_blocked = {"NDLS-GZB": []}

    # 2026-09-15 is Tuesday (weekday 1 in Python, dow 2 in 0=Sun system)
    results = block_optimizer.optimize(
        tasks=tasks,
        windows=windows,
        ttt_blocked=ttt_blocked,
        plan_type="weekly",
        base_date=date(2026, 9, 13),  # Sunday base
    )

    assert len(results) >= 1
    sched = results[0]
    assert sched["sectionId"] == "NDLS-GZB"
    assert "TMS-TEST-001" in sched["taskIdStrings"]
    assert sched["totalDurationMinutes"] >= 60
    assert "optimizerMode" in sched


def test_optimizer_ttt_conflict_avoidance():
    """Tasks should not be scheduled during TTT-blocked train intervals."""
    tasks = [
        {
            "taskId": "TMS-TTT-001",
            "sectionId": "GZB-CNB",
            "department": "Signal & Telecom",
            "estimatedDuration": 60,
            "criticality": "critical",
            "criticalityScore": 0.95,
        }
    ]
    # Window is 01:00 to 04:00 (min 60 to 240)
    windows = [
        {
            "sectionId": "GZB-CNB",
            "dayOfWeek": 0,  # Sunday (Day 0)
            "startTime": "01:00",
            "endTime": "04:00",
            "maxDurationMinutes": 180,
        }
    ]
    # Train blocks 01:00 to 02:30 (min 60 to 150)
    # Task (60 min) must be scheduled in 02:30-04:00 (min 150 to 240)
    ttt_blocked = {
        "GZB-CNB": [(60, 150)]
    }

    results = block_optimizer.optimize(
        tasks=tasks,
        windows=windows,
        ttt_blocked=ttt_blocked,
        plan_type="daily",
        base_date=date(2026, 9, 13),
    )

    assert len(results) >= 1
    sched = results[0]
    assert "TMS-TTT-001" in sched["taskIdStrings"]
    # Check that start time is >= 150 min (02:30)
    start_dt = sched["windowStart"]
    start_minutes = start_dt.hour * 60 + start_dt.minute
    assert start_minutes >= 150


def test_optimizer_multi_department_bundling():
    """Tasks on the same section in the same window are bundled together."""
    tasks = [
        {
            "taskId": "TASK-ENG",
            "sectionId": "NDLS-GZB",
            "department": "Engineering",
            "estimatedDuration": 60,
            "criticality": "high",
            "criticalityScore": 0.8,
        },
        {
            "taskId": "TASK-SIG",
            "sectionId": "NDLS-GZB",
            "department": "Signal & Telecom",
            "estimatedDuration": 45,
            "criticality": "critical",
            "criticalityScore": 0.9,
        },
    ]
    windows = [
        {
            "sectionId": "NDLS-GZB",
            "dayOfWeek": 0,
            "startTime": "01:00",
            "endTime": "04:00",
            "maxDurationMinutes": 180,
        }
    ]
    ttt_blocked = {"NDLS-GZB": []}

    results = block_optimizer.optimize(
        tasks=tasks,
        windows=windows,
        ttt_blocked=ttt_blocked,
        plan_type="daily",
        base_date=date(2026, 9, 13),
    )

    assert len(results) >= 1
    # Check that both departments were included
    all_depts = set()
    for s in results:
        all_depts.update(s["departments"])
    assert "Engineering" in all_depts
    assert "Signal & Telecom" in all_depts
