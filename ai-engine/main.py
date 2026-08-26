from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import json

from scoring.prioritizer import PrioritizationEngine
from optimizer.scheduler import BlockScheduleOptimizer

app = FastAPI(
    title="AI Block Planning Engine",
    description="AI/ML engine for Indian Railways maintenance block scheduling",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize engines
prioritizer = PrioritizationEngine()
optimizer = BlockScheduleOptimizer()


# ─── Request/Response Models ───

class TaskInput(BaseModel):
    id: str
    taskId: str
    sourceSystem: str
    department: str
    sectionId: str
    defectType: str
    criticality: str
    reportedDate: str
    dueDate: str
    estimatedDuration: int
    recurrenceCount: int = 0

class CorridorInput(BaseModel):
    sectionId: str
    trafficDensity: str = "medium"

class WindowInput(BaseModel):
    sectionId: str
    dayOfWeek: int
    startTime: str
    endTime: str
    maxDurationMinutes: int = 240

class PrioritizeRequest(BaseModel):
    tasks: List[TaskInput]
    corridors: List[CorridorInput] = []

class OptimizeRequest(BaseModel):
    tasks: List[Dict[str, Any]]
    windows: List[Dict[str, Any]] = []
    corridors: List[Dict[str, Any]] = []
    planType: str = "weekly"
    targetDate: str = ""


# ─── Endpoints ───

@app.get("/")
def health():
    return {"status": "ok", "service": "AI Block Planning Engine", "version": "1.0.0"}


@app.post("/api/prioritize")
def prioritize_tasks(request: PrioritizeRequest):
    """Score and rank maintenance tasks by criticality/urgency."""
    try:
        corridor_map = {c.sectionId: c.trafficDensity for c in request.corridors}

        scored_tasks = prioritizer.score_tasks(
            [t.model_dump() for t in request.tasks],
            corridor_map
        )

        return {
            "success": True,
            "tasks": scored_tasks,
            "summary": {
                "total": len(scored_tasks),
                "critical": sum(1 for t in scored_tasks if t.get("urgencyTier") == "Critical"),
                "high": sum(1 for t in scored_tasks if t.get("urgencyTier") == "High"),
                "medium": sum(1 for t in scored_tasks if t.get("urgencyTier") == "Medium"),
                "low": sum(1 for t in scored_tasks if t.get("urgencyTier") == "Low"),
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e), "tasks": []}


@app.post("/api/optimize")
def optimize_schedule(request: OptimizeRequest):
    """Generate optimized block schedule using constraint programming."""
    try:
        schedules = optimizer.optimize(
            tasks=request.tasks,
            windows=request.windows,
            corridors=request.corridors,
            plan_type=request.planType,
            target_date=request.targetDate or datetime.now().isoformat()
        )

        return {
            "success": True,
            "schedules": schedules,
            "summary": {
                "totalBlocks": len(schedules),
                "multiDeptBlocks": sum(1 for s in schedules if len(s.get("departments", [])) > 1),
                "totalDowntimeMinutes": sum(s.get("totalDurationMinutes", 0) for s in schedules)
            }
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e), "schedules": []}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
