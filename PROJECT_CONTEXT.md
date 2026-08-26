# RailOpt AI — Indian Railways Maintenance Scheduling System
## Complete System Context & Knowledge Graph Handoff

> **Generated via Graphify Knowledge Graph (`graphify-out/graph.json` — 360 nodes, 515 edges, 23 communities)**

---

## 1. Executive Overview & Problem Statement
* **Project Name**: RailOpt AI (Indian Railways — Automatic Maintenance Scheduling & Block Planning)
* **Objective**: Automate multi-departmental railway maintenance block scheduling (Engineering/Track, Traction Distribution/TRD, Signal & Telecom/S&T) over high-density traffic corridors.
* **Core Value**:
  1. Multi-factor safety & urgency task prioritization with Explainable AI (XAI).
  2. Constraint-Satisfaction Optimization (Google OR-Tools CP-SAT) for conflict-free possession windows.
  3. Multi-department joint block bundling to reduce overall traffic line downtime.
  4. Real-time section utilization metrics, GIGW 3.0 audit trails, and Excel exports.

---

## 2. Architecture & Tech Stack

```
                               ┌─────────────────────────────┐
                               │  Vite + React 18 (Frontend) │  Port 3000
                               │  TailwindCSS + React-Icons  │
                               └──────────────┬──────────────┘
                                              │ REST / JSON
                               ┌──────────────▼──────────────┐
                               │ Node.js / Express (Backend) │  Port 5000
                               │  MongoDB / Mongoose + JWT   │
                               └──────────────┬──────────────┘
                                              │ HTTP Proxy
                               ┌──────────────▼──────────────┐
                               │  FastAPI AI Engine (Python) │  Port 8000
                               │  OR-Tools CP-SAT + Scikit   │
                               └─────────────────────────────┘
```

| Subsystem | Technologies & Frameworks | Key Modules |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, React Router 6, Recharts, FullCalendar, React-Icons (`Fi`), Axios | `Dashboard`, `DataIntegration`, `Prioritization`, `Schedules`, `Requests`, `Reports`, `Login` |
| **Backend API** | Node.js, Express, Mongoose (MongoDB), Sequelize/pg, JSON Web Tokens, XLSX | `authController`, `taskController`, `corridorController`, `scheduleController`, `reportController`, `mockDataController` |
| **AI Optimizer** | Python 3.10+, FastAPI, Google OR-Tools (CP-SAT), Scikit-learn, NumPy, Pandas | `PrioritizationEngine`, `BlockScheduleOptimizer`, `main.py` |

---

## 3. Core Communities & Architectural Hubs (God Nodes)

1. **`PrioritizationEngine` (`ai_engine/scoring/prioritizer.py`)**:
   - Multi-criteria decision model computing 0–100% urgency scores.
   - **Weights**: Safety Hazard (35%), Overdue Penalty (25%), Traffic Density (20%), Historical Recurrence (20%).
   - Classifies tasks into `Critical`, `High`, `Medium`, `Low` urgency tiers with human-readable XAI justifications.

2. **`BlockScheduleOptimizer` (`ai_engine/optimizer/scheduler.py`)**:
   - Google OR-Tools CP-SAT solver modeling non-overlapping maintenance block windows.
   - Objective: Maximize prioritized task throughput, enforce shadow-block bundling, minimize train disruption.
   - Generates Daily (24h horizon), Weekly (7-day), and Monthly (30-day) schedules with fallback heuristic generators.

3. **`formatDuration(totalMinutes)` (`client/src/utils/constants.js` & `server/controllers/reportController.js`)**:
   - Centralized duration formatter converting raw minutes to `Xhr Ymin` (e.g., `135` $\rightarrow$ `2hr 15min`).

4. **`useAuth()` / JWT Middleware (`server/middleware/auth.js` & `client/src/context/AuthContext.jsx`)**:
   - Role-Based Access Control: `admin` (System Administrator), `section_controller` (Approval Authority), `dept_engineer` (Request Submitter).

---

## 4. Key Data Models

* **`MaintenanceTask`** (`server/models/MaintenanceTask.js`):
  - Fields: `taskId`, `sourceSystem` (`TMS`, `SMMS`, `TDMS`), `department`, `sectionId`, `defectType`, `criticality`, `estimatedDuration`, `dueDate`, `criticalityScore`, `urgencyTier`, `status`.
* **`BlockSchedule`** (`server/models/BlockSchedule.js`):
  - Fields: `scheduleId`, `sectionId`, `planType` (`daily`, `weekly`, `monthly`), `assignedWindow` (`start`, `end`), `totalDurationMinutes`, `departments`, `taskIds`, `isMultiDepartment`, `status` (`proposed`, `approved`, `rejected`), `optimizerScore`.
* **`CorridorBlock`** (`server/models/CorridorBlock.js`):
  - 12 Northern/North-Central Railway corridors (e.g. `ALD-MGS`, `NDLS-GZB`, `CNB-PRYJ`, `DLI-UMB`).
* **`AuditLog`** (`server/models/AuditLog.js`):
  - Tracks user actions (`APPROVE_SCHEDULE`, `OPTIMIZE_PLAN`, `INGEST_DATA`, `AUTH_LOGIN`) with IP, timestamp, and metadata.

---

## 5. Active Microservices & Local Ports
* **Frontend**: `http://localhost:3000` (Vite dev server)
* **Backend**: `http://localhost:5000` (Express server)
* **AI Engine**: `http://localhost:8000` (FastAPI with `--reload`)
* **Default Credentials**: `admin@railways.gov.in` / `admin123`
