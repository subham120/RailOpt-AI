"""
Unit tests for Corridor Block Window Availability Metrics.
"""
from datetime import time
from backend.ai.metrics.availability import compute_availability


class MockWindow:
    def __init__(self, section_id, day_of_week, start_time, end_time, max_duration):
        self.section_id = section_id
        self.day_of_week = day_of_week
        self.start_time = start_time
        self.end_time = end_time
        self.max_duration_minutes = max_duration
        self.is_active = True


def test_compute_availability_no_schedules():
    """When no schedules exist, available minutes equals total window capacity."""
    windows = [
        MockWindow("NDLS-GZB", 0, time(1, 0), time(4, 0), 180),
        MockWindow("NDLS-GZB", 1, time(1, 0), time(4, 0), 180),
    ]
    result = compute_availability("NDLS-GZB", windows, schedules=[])

    assert result["total_window_min"] == 360
    assert result["scheduled_downtime_min"] == 0
    assert result["availability_score"] == 1.0
    assert result["availability_pct"] == 100.0


def test_compute_availability_with_booking():
    """Booked schedule reduces available minutes and score proportionally."""
    windows = [
        MockWindow("NDLS-GZB", 0, time(1, 0), time(4, 0), 180),
    ]

    class MockSchedule:
        section_id = "NDLS-GZB"
        total_duration_min = 90
        status = "approved"

    result = compute_availability("NDLS-GZB", windows, schedules=[MockSchedule()])

    assert result["total_window_min"] == 180
    assert result["scheduled_downtime_min"] == 90
    assert result["availability_score"] == 0.5
    assert result["availability_pct"] == 50.0
