"""
Asset availability computation per section.
Compares scheduled downtime against total available window time.
"""
from datetime import date


def compute_availability(
    section_id: str,
    windows: list,           # list of BlockWindow SQLAlchemy objects or dicts
    schedules: list,         # list of BlockSchedule SQLAlchemy objects or dicts (can be empty)
) -> dict:
    """
    Returns availability metrics for a single section.

    availability_score = (total_window_min - scheduled_downtime_min) / total_window_min
    """
    # Sum all active window capacity for this section
    total_window_min = 0
    for w in windows:
        if hasattr(w, "section_id"):
            # SQLAlchemy object
            if w.section_id == section_id and w.is_active:
                total_window_min += w.max_duration_minutes or 0
        else:
            # dict
            if w.get("sectionId") == section_id and w.get("isActive", True):
                total_window_min += w.get("maxDurationMinutes", 0)

    if total_window_min == 0:
        total_window_min = 1680  # 7 × 240min default (one nightly block per day)

    # Sum scheduled downtime for this section
    scheduled_downtime = 0
    for s in schedules:
        if hasattr(s, "section_id"):
            if s.section_id == section_id and s.status in ("proposed", "approved", "executed"):
                scheduled_downtime += s.total_duration_min or 0
        else:
            if s.get("sectionId") == section_id and s.get("status") in ("proposed", "approved", "executed"):
                scheduled_downtime += s.get("totalDurationMinutes", 0)

    # Clamp — downtime can't exceed window
    scheduled_downtime = min(scheduled_downtime, total_window_min)
    avail_score = (total_window_min - scheduled_downtime) / total_window_min

    return {
        "section_id": section_id,
        "availability_score": round(avail_score, 4),
        "availability_pct": round(avail_score * 100, 2),
        "scheduled_downtime_min": scheduled_downtime,
        "total_window_min": total_window_min,
    }


def compute_all_sections(
    section_ids: list[str],
    windows: list,
    schedules: list,
) -> list[dict]:
    """Compute availability for a list of sections."""
    return [compute_availability(sid, windows, schedules) for sid in section_ids]
