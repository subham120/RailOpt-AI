"""
RailOpt AI — FastAPI Application Entry Point (v2.0)
Replaces Node.js/Express server entirely.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("railopt")

from backend.core.config import settings
from backend.db.database import engine
from backend.db.base import Base
# Import all models so SQLAlchemy sees them for create_all
import backend.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all tables on startup and seed initial demo data if empty."""
    try:
        Base.metadata.create_all(bind=engine, checkfirst=True)
        logger.info(f"[*] RailOpt AI v{settings.VERSION} — DB tables verified/created")

        # Auto-seed if database is brand new
        from backend.db.database import SessionLocal
        from backend.models.user import User
        from backend.seed.seed_data import run_seed

        with SessionLocal() as db:
            if db.query(User).count() == 0:
                logger.info("[*] Seeding default demo data (corridors, tasks, timetable, users)...")
                seeded = run_seed(db)
                logger.info(f"[*] Default demo data seeded: {seeded}")
    except Exception as e:
        logger.critical(f"[!] Database startup verification failed: {e}")
    yield
    logger.info("[*] RailOpt AI shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description=(
        "AI-Powered Automatic Block Planning for Indian Railways. "
        "PS-26027 — SIH 2026 Prototype."
    ),
    lifespan=lifespan,
)

# ─── Security Headers Middleware ─────────────────────────
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

# ─── CORS ────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────
from backend.api.auth import router as auth_router
from backend.api.tasks import router as tasks_router
from backend.api.schedules import router as schedules_router
from backend.api.corridors import router as corridors_router
from backend.api.timetable import router as timetable_router
from backend.api.reports import router as reports_router
from backend.api.alerts import router as alerts_router
from backend.api.assistant import router as assistant_router
from backend.api.ingest import router as ingest_router

API_PREFIX = "/api"

app.include_router(auth_router,       prefix=f"{API_PREFIX}/auth")
app.include_router(tasks_router,      prefix=f"{API_PREFIX}/tasks")
app.include_router(schedules_router,  prefix=f"{API_PREFIX}/schedules")
app.include_router(corridors_router,  prefix=f"{API_PREFIX}/corridors")
app.include_router(timetable_router,  prefix=f"{API_PREFIX}/timetable")
app.include_router(reports_router,    prefix=f"{API_PREFIX}/reports")
app.include_router(alerts_router,     prefix=f"{API_PREFIX}/alerts")
app.include_router(assistant_router,  prefix=f"{API_PREFIX}/assistant")
app.include_router(ingest_router,     prefix=f"{API_PREFIX}/ingest")


@app.get("/health")
@app.get("/api/health")
def health():
    db_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        logger.error("Health check DB probe failed: %s", e)
        db_status = f"unhealthy: {e}"
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "degraded",
                "app": settings.APP_NAME,
                "version": settings.VERSION,
                "database": db_status,
            },
        )

    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "database": db_status,
    }


@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} v{settings.VERSION}",
        "docs": "/docs",
        "health": "/health",
    }
