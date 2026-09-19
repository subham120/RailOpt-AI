# RailOpt AI — Indian Railways Maintenance Scheduling System
## Complete System Context & Knowledge Graph Handoff

> **Indexed via Graphify Knowledge Graph (`graphify-out/graph.json` — 541 nodes, 1156 edges, 34 communities)**

---

## 1. Executive Overview & Problem Statement
* **Project Name**: RailOpt AI (Indian Railways — Automatic Maintenance Scheduling & Block Planning System)
* **Problem Statement**: PS-26027 (SIH 2026)
* **Objective**: Automate multi-departmental railway maintenance block scheduling (Engineering/Track, Traction Distribution/TRD, Signal & Telecom/S&T) over high-density Golden Quadrilateral / Golden Diagonal traffic corridors.
* **Core Value Pillars**:
  1. **Multi-Factor Safety & Urgency Prioritization with Explainable AI (XAI)**: XGBoost + Domain Rules + SHAP breakdowns.
  2. **Constraint-Satisfaction Optimization**: Google OR-Tools CP-SAT solver modeling possession windows, safety margins, and train disruption minimization.
  3. **Multi-Department Joint Block Bundling**: Groups overlapping possession requests to drastically reduce total track downtime.
  4. **Dynamic Section Utilization & GIGW 3.0 Audit Trails**: Complete immutable audit logging and multi-sheet Excel reports.

---

## 2. Architecture & Tech Stack

```
┌─────────────────────────────────────────┐
│     React 18 + Vite Client (Frontend)   │  Port 3000
│  TailwindCSS + UX4G + FullCalendar + Recharts
└────────────────────┬────────────────────┘
                     │ REST API / JWT Bearer
┌────────────────────▼────────────────────┐
│      FastAPI Python Backend & AI Engine │  Port 8000
│  SQLAlchemy + SQLite (railopt.db)       │
│  Google OR-Tools CP-SAT + Scikit + SHAP │
└─────────────────────────────────────────┘
```

| Layer | Technologies & Libraries | Key Modules |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, React Router 6, Recharts, FullCalendar, React-Icons (`Fi`), Axios | `Dashboard`, `DataIntegration`, `Prioritization`, `Schedules`, `Requests`, `CorridorMapPage`, `AssistantPage`, `Reports`, `Login` |
| **Backend API** | Python 3.10+, FastAPI, SQLAlchemy, SQLite, PyJWT, Pydantic v2, XlsxWriter | `api.auth`, `api.tasks`, `api.corridors`, `api.schedules`, `api.reports`, `api.timetable`, `api.alerts`, `api.assistant`, `api.ingest` |
| **AI Optimizer** | Google OR-Tools (CP-SAT), Scikit-learn, XGBoost, NumPy, Pandas, SHAP | `PrioritizationEngine`, `BlockOptimizer`, `compute_availability` |

---

## 3. Core Architectural Hubs (God Nodes)

1. **`PrioritizationEngine` (`backend/ai/scoring/prioritizer.py`)**:
   - Hybrid decision model computing 0–100% urgency scores.
   - **Features**: Safety Hazard (35%), Overdue Penalty (25%), Traffic Density (20%), Historical Recurrence (20%), Track Class multiplier.
   - Classifies tasks into `Critical`, `High`, `Medium`, and `Low` urgency tiers with human-readable SHAP XAI justifications.

2. **`BlockOptimizer` (`backend/ai/optimizer/scheduler.py`)**:
   - Google OR-Tools CP-SAT solver modeling non-overlapping maintenance block windows.
   - Objective: Maximize prioritized task throughput, enforce shadow-block bundling, minimize train disruption.
   - Generates Daily (24h horizon), Weekly (7-day), and Monthly (30-day) schedules with fallback greedy heuristic generators.

3. **`compute_availability` (`backend/ai/metrics/availability.py`)**:
   - Computes corridor uptime, maintenance downtime percentage, and section availability scores across corridor windows.

4. **`useAuth()` / JWT Security (`backend/core/security.py` & `client/src/context/AuthContext.jsx`)**:
   - Role-Based Access Control: `admin` (System Administrator), `section_controller` (Approval Authority), `dept_engineer` (Request Submitter).

---

## 4. Key Database Models (`backend/models/`)

* **`MaintenanceTask`** (`backend/models/maintenance_task.py`):
  - Fields: `taskId`, `sourceSystem` (`TMS`, `SMMS`, `TDMS`), `department`, `sectionId`, `defectType`, `criticality`, `estimatedDuration`, `dueDate`, `criticalityScore`, `urgencyTier`, `status`.
* **`BlockSchedule`** (`backend/models/block_schedule.py`):
  - Fields: `scheduleId`, `sectionId`, `planType` (`daily`, `weekly`, `monthly`), `assignedWindow`, `totalDurationMinutes`, `departments`, `taskIds`, `isMultiDepartment`, `status` (`proposed`, `approved`, `rejected`), `optimizerScore`.
* **`CorridorBlock`** (`backend/models/corridor.py`):
  - 12 Northern Railway corridors (e.g. `ALD-MGS`, `NDLS-GZB`, `CNB-PRYJ`, `DLI-UMB`).
* **`TrainTimetable`** (`backend/models/train_timetable.py`):
  - Dynamic train traffic records for slot conflict detection.
* **`AuditLog`** (`backend/models/audit_log.py`):
  - Tracks user actions (`APPROVE_SCHEDULE`, `OPTIMIZE_PLAN`, `INGEST_DATA`, `AUTH_LOGIN`) with IP, timestamp, and metadata.

---

## 5. Microservices & Local Ports
* **Frontend**: `http://localhost:3000` (Vite dev server)
* **Backend API & AI Engine**: `http://localhost:8000` (FastAPI with `--reload`)
* **Default Credentials**: `admin@railways.gov.in` / `admin123`
