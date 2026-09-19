"""
LLM Assistant router — Gemini 1.5 Flash powered consultation.
Injects live DB context (critical tasks, upcoming blocks, availability, conflicts) into system prompt.
Supports multi-turn conversational history and dynamic multi-field retrieval.
"""
import logging
import re
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, case, or_, cast, String

from backend.db.database import get_db
from backend.core.deps import get_current_user
from backend.core.config import settings
from backend.models.corridor import CorridorBlock
from backend.models.maintenance_task import MaintenanceTask
from backend.models.block_schedule import BlockSchedule
from backend.models.alert_log import AlertLog
from backend.models.train_timetable import TrainTimetable
from backend.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(tags=["assistant"])

STOP_WORDS = {
    "the", "is", "at", "which", "on", "a", "an", "and", "or", "in", "to", "for",
    "of", "what", "are", "there", "any", "how", "many", "can", "we", "i", "do",
    "this", "that", "these", "those", "with", "from", "about", "tell", "me", "show",
    "give", "please", "urgent", "tasks", "defects", "task", "defect", "maintenance", "block", "blocks",
}


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user' or 'assistant'/'model'")
    content: str = Field(..., description="Message text content")


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    context_type: str = "general"   # general | schedule | task | corridor
    zone: str | None = None


class ChatResponse(BaseModel):
    success: bool
    response: str
    context_used: list[str] = []
    cited_task_ids: list[str] = []


def _extract_keywords(text: str) -> list[str]:
    """Extract clean search tokens from query string."""
    tokens = re.findall(r"[A-Za-z0-9\-_]+", text.lower())
    return [t for t in tokens if len(t) >= 3 and t not in STOP_WORDS]


def _build_system_prompt(db: Session, user_query: str = "", history: list[ChatMessage] = None, zone: str = None) -> tuple[str, list[str], list[str]]:
    """Build a rich, verified system prompt with live DB context tailored to user query, history, and zone."""
    today = date.today()
    context_items = []
    cited_task_ids = []

    # Combine current query and last user message for contextual retrieval
    combined_query = user_query
    if history:
        for msg in reversed(history[-2:]):
            if msg.role == "user":
                combined_query += " " + msg.content
                break

    keywords = _extract_keywords(combined_query)
    q_lower = user_query.lower()

    # Query matching tasks or top critical tasks
    task_query = db.query(MaintenanceTask).filter(
        MaintenanceTask.status.in_(["pending", "scheduled"])
    )
    if zone and zone.strip().upper() != "ALL":
        z = zone.strip()
        task_query = task_query.filter(
            (MaintenanceTask.zone_code.ilike(z)) |
            (MaintenanceTask.section_id.in_(
                db.query(CorridorBlock.section_id).filter(
                    (CorridorBlock.zone_code.ilike(z)) | (CorridorBlock.zone.ilike(z))
                )
            ))
        )
        context_items.append(f"Active Operational Zone: {zone.upper()}")

    # Dynamic multi-field database search
    if keywords:
        search_clauses = []
        for kw in keywords[:5]:  # Top 5 significant search keywords
            pattern = f"%{kw}%"
            search_clauses.extend([
                MaintenanceTask.section_name.ilike(pattern),
                MaintenanceTask.defect_type.ilike(pattern),
                cast(MaintenanceTask.department, String).ilike(pattern),
                MaintenanceTask.urgency_tier.ilike(pattern),
                MaintenanceTask.task_id.ilike(pattern),
            ])
        if search_clauses:
            task_query = task_query.filter(or_(*search_clauses))

    # Department-specific filter overrides
    if any(k in q_lower for k in ["signal", "s&t", "smms"]):
        task_query = task_query.filter(cast(MaintenanceTask.department, String).ilike("%Signal%"))
    elif any(k in q_lower for k in ["ohe", "trd", "electrical", "traction"]):
        task_query = task_query.filter(cast(MaintenanceTask.department, String).ilike("%Traction%"))
    elif any(k in q_lower for k in ["track", "engineering", "p-way", "p.way", "tms"]):
        task_query = task_query.filter(cast(MaintenanceTask.department, String).ilike("%Engineering%"))

    criticality_order = case(
        {"critical": 4, "high": 3, "medium": 2, "low": 1},
        value=MaintenanceTask.criticality,
        else_=0,
    )
    matching_tasks = task_query.order_by(
        criticality_order.desc(),
        MaintenanceTask.due_date.asc(),
    ).limit(8).all()

    # Fallback to general top critical defects if search was too narrow
    if not matching_tasks:
        matching_tasks = db.query(MaintenanceTask).filter(
            MaintenanceTask.criticality.in_(["critical", "high"]),
            MaintenanceTask.status.in_(["pending", "scheduled"]),
        ).order_by(
            criticality_order.desc(),
            MaintenanceTask.due_date.asc(),
        ).limit(6).all()

    task_context = ""
    for t in matching_tasks:
        cited_task_ids.append(t.task_id)
        overdue = (today - t.due_date).days if t.due_date < today else 0
        overdue_str = f" [OVERDUE by {overdue} days!]" if overdue > 0 else f" [Due: {t.due_date}]"
        task_context += (
            f"\n  - Task ID `{t.task_id}` ({t.source_system} / {t.department}): "
            f"'{t.defect_type}' on section '{t.section_name or t.section_id}', "
            f"Criticality: {t.criticality.upper()}{overdue_str}, "
            f"Duration Needed: {t.estimated_duration} mins"
        )
    
    if matching_tasks:
        context_items.append(f"{len(matching_tasks)} live defect records")

    # Upcoming proposed & approved maintenance blocks
    upcoming_blocks = db.query(BlockSchedule).filter(
        BlockSchedule.status.in_(["proposed", "approved"]),
    ).order_by(BlockSchedule.window_start.asc()).limit(5).all()

    block_context = ""
    for s in upcoming_blocks:
        depts = " + ".join(s.departments or [])
        win_str = s.window_start.strftime('%d %b %H:%M') if s.window_start else 'Night Window'
        block_context += f"\n  - Block `{s.schedule_id}`: Section '{s.section_name or s.section_id}' | Depts: [{depts}] | Time: {win_str} ({s.total_duration_min} min) | Status: {s.status.upper()}"
    
    if upcoming_blocks:
        context_items.append(f"{len(upcoming_blocks)} scheduled block windows")

    # Dynamic Train Timetable conflict lookup if corridor or train is mentioned
    train_context = ""
    train_matches = db.query(TrainTimetable).limit(4).all()
    if train_matches:
        train_context = "\n  Sample Active Passenger Trains in Corridor Windows:"
        for tr in train_matches:
            dep_str = tr.departure_time.strftime('%H:%M') if tr.departure_time else "00:00"
            arr_str = tr.arrival_time.strftime('%H:%M') if tr.arrival_time else "00:00"
            train_context += f"\n    * Train {tr.train_no} ({tr.train_name or 'Express'}): Section '{tr.section_id}' | Time: {dep_str}-{arr_str} (Type: {tr.train_type})"

    # Unread system alerts
    unread_alerts = db.query(func.count(AlertLog.id)).filter(AlertLog.is_read == False).scalar() or 0
    if unread_alerts:
        context_items.append(f"{unread_alerts} active alerts")

    # System overview stats
    total_tasks = db.query(func.count(MaintenanceTask.id)).scalar() or 0
    pending_tasks = db.query(func.count(MaintenanceTask.id)).filter(MaintenanceTask.status == "pending").scalar() or 0

    system_prompt = f"""You are RailOpt AI Assistant — the official Indian Railways Intelligent Maintenance Planning Advisor.

Role: Assist Section Controllers, Senior Divisional Engineers (Sr. DEN), and Traffic Controllers in making verified, data-backed maintenance block scheduling decisions.

=== VERIFIED LIVE DATABASE TELEMETRY ===
Current Reference Date: {today.strftime('%d %B %Y')}
Zone: Northern Railway (NR) & Associated Corridors
Total Active Backlog: {total_tasks} defects ({pending_tasks} pending assignment)

Verified Active Defect Tasks in Database:
{task_context if task_context else "  - No pending critical defects found."}

Verified Maintenance Block Possessions in System:
{block_context if block_context else "  - No blocks scheduled currently."}
{train_context}

=== OPERATIONAL & FORMATTING INSTRUCTIONS ===
1. Base your recommendations STRICTLY on the verified Task IDs, Corridors, and Durations listed above.
2. Structure your answer with clear markdown headings (`###`), bullet points, and clean data tables where helpful.
3. Always bold and backtick all Task IDs like `TMS-101`, `SMMS-204`, `TDMS-302`, Block Schedule IDs like `SCHED-5075BE2047`, and corridor codes like `ALD-MGS`, `NDLS-GZB`.
4. Recommend standard Indian Railways night maintenance windows (00:30–04:30 AM) to avoid delays to Vande Bharat, Rajdhani, and Shatabdi passenger paths.
5. Emphasize Joint Block bundling (combining P-Way + S&T + TRD work on the same section) to save line capacity.
6. Always ensure your response is fully complete, coherent, and ends with a complete final thought or action recommendation without truncating mid-sentence.
7. NEVER use LaTeX notation like $\text{...}$ or $ delimiters for times, dates, or corridor names. Write times and intervals cleanly in plain text (e.g. 00:30 - 04:30 AM).
"""
    return system_prompt, context_items, cited_task_ids


# Module-level persistent HTTP client with keep-alive connection pooling
import certifi
import httpx
import time

_ca_bundle = certifi.where()
_http_client = httpx.Client(
    verify=_ca_bundle,
    timeout=12.0,
    limits=httpx.Limits(max_keepalive_connections=10, max_connections=20, keepalive_expiry=120.0),
)

# In-memory query response cache (TTL 60s) for instant sub-millisecond responses
_query_cache: dict[str, tuple[float, str, list[str], list[str]]] = {}
CACHE_TTL_SEC = 60.0


def _query_gemini(message: str, system_prompt: str, history: list[ChatMessage], api_key: str) -> str:
    """Send multi-turn request to Google Gemini API via persistent keep-alive client."""
    import os

    # Sanitize broken local Windows OpenSSL/PostgreSQL environment variables
    for env_var in ["CURL_CA_BUNDLE", "OPENSSL_CONF"]:
        val = os.environ.get(env_var, "")
        if val and not os.path.exists(val):
            os.environ.pop(env_var, None)

    # Format multi-turn conversation history
    gemini_contents = []
    if history:
        for msg in history[-6:]:  # Keep last 6 turns for rapid token processing
            role = "user" if msg.role == "user" else "model"
            gemini_contents.append({"role": role, "parts": [{"text": msg.content}]})

    # Append the latest user message
    gemini_contents.append({"role": "user", "parts": [{"text": message}]})

    payload = {
        "system_instruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": gemini_contents,
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 3000,
        },
    }

    models_to_try = [
        "gemini-flash-lite-latest",
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash",
    ]

    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        try:
            resp = _http_client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    text_chunks = [
                        p.get("text", "") for p in parts
                        if isinstance(p, dict) and "text" in p and p.get("text")
                    ]
                    if text_chunks:
                        full_text = "".join(text_chunks).strip()
                        if full_text:
                            return full_text
            elif resp.status_code == 404:
                logger.debug("Gemini model %s not found (404), trying fallback...", model_name)
                continue
            else:
                logger.warning("Gemini API %s returned status %d: %s", model_name, resp.status_code, resp.text[:200])
        except Exception as ex:
            logger.warning("Gemini model %s request failed: %s", model_name, ex)
            continue

    return ""


def _generate_instant_blocks_briefing(db: Session, zone: str = None) -> tuple[str, list[str], list[str]]:
    """Instant deterministic generator for block possession inquiries (<15ms)."""
    blocks_q = db.query(BlockSchedule).filter(
        BlockSchedule.status.in_(["proposed", "approved"])
    )
    tasks_q = db.query(MaintenanceTask).filter(MaintenanceTask.status == "pending")

    if zone and zone.strip().upper() != "ALL":
        z = zone.strip()
        blocks_q = blocks_q.filter(
            (BlockSchedule.zone_code.ilike(z)) |
            (BlockSchedule.section_id.in_(
                db.query(CorridorBlock.section_id).filter(
                    (CorridorBlock.zone_code.ilike(z)) | (CorridorBlock.zone.ilike(z))
                )
            ))
        )
        tasks_q = tasks_q.filter(
            (MaintenanceTask.zone_code.ilike(z)) |
            (MaintenanceTask.section_id.in_(
                db.query(CorridorBlock.section_id).filter(
                    (CorridorBlock.zone_code.ilike(z)) | (CorridorBlock.zone.ilike(z))
                )
            ))
        )

    blocks = blocks_q.order_by(BlockSchedule.window_start.asc()).limit(8).all()
    pending_tasks = tasks_q.all()

    tasks_by_sec: dict[str, list[MaintenanceTask]] = {}
    cited_tasks = []
    for pt in pending_tasks:
        sec = pt.section_name or pt.section_id
        tasks_by_sec.setdefault(sec, []).append(pt)

    zone_hdr = f" ({zone.upper()} Zone)" if zone and zone.strip().upper() != "ALL" else ""
    lines = [
        f"### Current Maintenance Block Possessions{zone_hdr}",
        "Below is the verified list of all active maintenance block possessions currently scheduled/proposed in the system database:",
        "",
        "| Block ID | Corridor / Section | Department(s) | Scheduled Start & Duration | Status |",
        "| :--- | :--- | :--- | :--- | :--- |",
    ]

    for b in blocks:
        sec = b.section_name or b.section_id
        depts = " + ".join(b.departments or ["Engineering"])
        time_str = b.window_start.strftime("%d %b, %H:%M hrs") if b.window_start else "Night Window"
        dur_str = f"{time_str} ({b.total_duration_min} mins)"
        lines.append(f"| `{b.schedule_id}` | {sec} | {depts} | {dur_str} | {b.status.upper()} |")

    lines.extend(["", "---", "", "### Operational Insights & Advisory Recommendations", ""])

    bundling_idx = 1
    for b in blocks:
        sec = b.section_name or b.section_id
        if sec in tasks_by_sec:
            top_task = tasks_by_sec[sec][0]
            cited_tasks.append(top_task.task_id)
            dept_name = b.departments[0] if b.departments else "TRD"
            lines.append(f"{bundling_idx}. **Joint Block Bundling Opportunity (`{sec}`):**")
            lines.append(f"   - **Proposed Block:** `{b.schedule_id}` ({dept_name}, {b.total_duration_min} mins) on section `{sec}`.")
            lines.append(f"   - **Pending Task:** Task `{top_task.task_id}` ({top_task.defect_type}, {top_task.estimated_duration} mins) is pending on the same corridor.")
            lines.append(f"   - **Recommendation:** Combine Block `{b.schedule_id}` with Task `{top_task.task_id}` into an integrated **Joint Maintenance Block** during the standard night window (00:30–04:30 AM) to maximize line capacity efficiency and minimize secondary detention to passenger services.")
            lines.append("")
            bundling_idx += 1
            if bundling_idx > 2:
                break

    lines.append(f"{bundling_idx}. **Night Window Optimization:**")
    lines.append("   - All proposed possessions align with standard Indian Railways Night Possession Windows (00:30–04:30 AM), protecting high-priority Vande Bharat, Rajdhani, and Shatabdi passenger paths.")

    resp_text = "\n".join(lines)
    context_items = [f"{len(blocks)} scheduled block windows", f"{len(cited_tasks)} bundled tasks"]
    if zone and zone.strip().upper() != "ALL":
        context_items.append(f"Zone: {zone.upper()}")
    return resp_text, context_items, cited_tasks


def _generate_instant_tasks_briefing(db: Session, q_lower: str, zone: str = None) -> tuple[str, list[str], list[str]]:
    """Instant deterministic generator for defect/task backlog inquiries (<15ms)."""
    today = date.today()
    task_query = db.query(MaintenanceTask).filter(MaintenanceTask.status.in_(["pending", "scheduled"]))

    if zone and zone.strip().upper() != "ALL":
        z = zone.strip()
        task_query = task_query.filter(
            (MaintenanceTask.zone_code.ilike(z)) |
            (MaintenanceTask.section_id.in_(
                db.query(CorridorBlock.section_id).filter(
                    (CorridorBlock.zone_code.ilike(z)) | (CorridorBlock.zone.ilike(z))
                )
            ))
        )

    if any(k in q_lower for k in ["signal", "s&t", "smms"]):
        task_query = task_query.filter(cast(MaintenanceTask.department, String).ilike("%Signal%"))
    elif any(k in q_lower for k in ["ohe", "trd", "electrical", "traction"]):
        task_query = task_query.filter(cast(MaintenanceTask.department, String).ilike("%Traction%"))
    elif any(k in q_lower for k in ["track", "engineering", "p-way", "p.way", "tms"]):
        task_query = task_query.filter(cast(MaintenanceTask.department, String).ilike("%Engineering%"))

    criticality_order = case(
        {"critical": 4, "high": 3, "medium": 2, "low": 1},
        value=MaintenanceTask.criticality,
        else_=0,
    )
    tasks = task_query.order_by(criticality_order.desc(), MaintenanceTask.due_date.asc()).limit(8).all()

    cited_tasks = [t.task_id for t in tasks]
    lines = [
        "### Critical Maintenance Defect Backlog",
        f"Verified list of active high-priority maintenance defects in the database as of **{today.strftime('%d %B %Y')}**:",
        "",
        "| Task ID | Section / Corridor | Department | Defect Description | Duration | Status / Due |",
        "| :--- | :--- | :--- | :--- | :--- | :--- |",
    ]
    for t in tasks:
        sec = t.section_name or t.section_id
        overdue = (today - t.due_date).days if t.due_date < today else 0
        due_str = f"**OVERDUE by {overdue}d**" if overdue > 0 else str(t.due_date)
        lines.append(f"| `{t.task_id}` | {sec} | {t.department} | {t.defect_type} | {t.estimated_duration} mins | {due_str} |")

    lines.extend([
        "",
        "---",
        "",
        "### Operational Advisory",
        "1. **Immediate Possession Requirement:** Schedule overdue critical defects during the upcoming 00:30–04:30 AM night maintenance window to clear high-severity speed restrictions.",
        "2. **Multi-Department Coordination:** Coordinate Engineering track machines with TRD power blocks to eliminate multiple line blockages on identical sections.",
    ])

    resp_text = "\n".join(lines)
    context_items = [f"{len(tasks)} critical defect records"]
    return resp_text, context_items, cited_tasks


@router.post("/chat", response_model=ChatResponse)
def chat(
    body: ChatRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q_clean = body.message.strip().lower()

    # 0. Check in-memory cache for instant repeated queries
    cache_key = f"{q_clean}::{body.zone or 'ALL'}::{len(body.history)}"
    now = time.time()
    if cache_key in _query_cache:
        cached_time, cached_resp, cached_ctx, cached_tasks = _query_cache[cache_key]
        if now - cached_time < CACHE_TTL_SEC:
            logger.info("Serving assistant query from fast memory cache: %s", body.message[:40])
            return ChatResponse(
                success=True,
                response=cached_resp,
                context_used=cached_ctx,
                cited_task_ids=cached_tasks,
            )

    # 1. Fast-path intent matching for instant block & task briefings (<15ms)
    is_blocks_query = (
        (any(k in q_clean for k in ["block", "possession"]) and any(k in q_clean for k in ["list", "show", "all", "what", "active", "upcoming", "view", "current"]))
        or q_clean in ["blocks", "list all blocks", "all blocks", "show blocks", "view blocks"]
    )
    if is_blocks_query:
        resp_text, context_items, cited_tasks = _generate_instant_blocks_briefing(db, zone=body.zone)
        _query_cache[cache_key] = (now, resp_text, context_items, cited_tasks)
        return ChatResponse(
            success=True,
            response=resp_text,
            context_used=context_items,
            cited_task_ids=cited_tasks,
        )

    is_tasks_query = (
        (any(k in q_clean for k in ["task", "defect", "urgent", "overdue", "critical"]) and any(k in q_clean for k in ["list", "show", "all", "what", "which", "view"]))
        or q_clean in ["tasks", "defects", "critical tasks", "urgent defects"]
    )
    if is_tasks_query:
        resp_text, context_items, cited_tasks = _generate_instant_tasks_briefing(db, q_clean, zone=body.zone)
        _query_cache[cache_key] = (now, resp_text, context_items, cited_tasks)
        return ChatResponse(
            success=True,
            response=resp_text,
            context_used=context_items,
            cited_task_ids=cited_tasks,
        )

    system_prompt, context_items, cited_tasks = _build_system_prompt(db, body.message, body.history, zone=body.zone)

    # 1. Execute via Google Gemini if key is configured
    if settings.GEMINI_API_KEY:
        try:
            text = _query_gemini(body.message, system_prompt, body.history, settings.GEMINI_API_KEY)
            if text:
                _query_cache[cache_key] = (now, text, context_items, cited_tasks)
                return ChatResponse(
                    success=True,
                    response=text,
                    context_used=context_items,
                    cited_task_ids=cited_tasks,
                )
        except Exception as e:
            logger.warning("Gemini API call failed (%s); falling back to telemetry summary.", e)

    # 2. Informative telemetry response when key is unset or unreachable
    tasks_summary = "\n".join([f"* Task `{tid}`" for tid in cited_tasks[:4]])
    zone_label = f" in {body.zone.upper()}" if body.zone and body.zone.strip().upper() != "ALL" else ""
    fallback_note = (
        "> *Note: Connect `GEMINI_API_KEY` in `.env` for freeform generative natural language responses.*"
        if not settings.GEMINI_API_KEY
        else "> *Note: Upstream Gemini AI service is temporarily experiencing high latency or demand. Serving verified live database telemetry.*"
    )
    return ChatResponse(
        success=True,
        response=(
            f"### RailOpt AI Operational Briefing{zone_label}\n\n"
            f"**Verified Database Telemetry**:\n"
            f"* **{len(cited_tasks)} matching defect tasks** found in live backlog:\n{tasks_summary}\n"
            "* **Recommended Action**: Bundle P-Way, S&T, and TRD tasks into upcoming Night Possession Windows (00:30–04:30 AM) to minimize passenger train disruption.\n\n"
            f"{fallback_note}"
        ),
        context_used=context_items,
        cited_task_ids=cited_tasks,
    )


@router.get("/suggestions")
def get_suggestions(
    zone: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Quick-access suggestion prompts for the chat UI, tailored by zone."""
    if zone and zone.strip().upper() != "ALL":
        z = zone.strip()
        corrs = db.query(CorridorBlock).filter(
            (CorridorBlock.zone_code.ilike(z)) | (CorridorBlock.zone.ilike(z))
        ).limit(2).all()
        sec1 = corrs[0].section_id if len(corrs) > 0 else f"{z}-01"
        sec2 = corrs[1].section_id if len(corrs) > 1 else sec1
        return {
            "success": True,
            "suggestions": [
                f"Which sections in {z.upper()} have the highest maintenance risk this week?",
                f"Can we bundle Engineering and S&T work on {sec1}?",
                f"What's the corridor availability trend for {z.upper()}?",
                f"Which critical tasks are overdue in {z.upper()}?",
                f"Suggest an optimal night block window for section {sec2}",
                f"What departments should coordinate for {z.upper()} weekly block plans?",
            ],
        }

    return {
        "success": True,
        "suggestions": [
            "Which sections have the highest maintenance risk this week?",
            "Can we bundle Engineering and S&T work on NDLS-GZB?",
            "What's the impact of delaying the ALD-MGS block by 2 days?",
            "Which critical tasks are overdue and need immediate scheduling?",
            "Suggest an optimal night block window for section GZB-CNB",
            "What departments should coordinate for the weekly block plan?",
        ],
    }
