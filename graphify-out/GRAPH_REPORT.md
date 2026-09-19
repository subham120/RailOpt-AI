# Graph Report - SIH-Prototype  (2026-09-19)

## Corpus Check
- 86 files · ~76,510 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 621 nodes · 1359 edges · 36 communities (30 shown, 6 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 155 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fedcfed9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.jsx
- PrioritizationEngine
- test_api_endpoints.py
- timedelta
- dependencies
- CorridorBlock
- schedules.py
- MaintenanceTask
- client/package.json
- 🚆 RailOpt AI — AI-Powered Automatic Block Planning System
- scripts
- User
- Engineering & Autonomous Execution Standards
- .oxlintrc.json
- RailOpt AI — Indian Railways Maintenance Scheduling System
- RailOpt AI — Frontend Client
- rules/graphify.md
- workflows/graphify.md
- GEMINI.md
- import_csv
- Settings
- ux4g.md
- trainer.py
- ErrorBoundary
- Security & Privacy Policy
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `User` - 68 edges
2. `CorridorBlock` - 39 edges
3. `MaintenanceTask` - 35 edges
4. `useAuth()` - 28 edges
5. `AuditLog` - 25 edges
6. `BlockSchedule` - 23 edges
7. `Base` - 20 edges
8. `TrainTimetable` - 20 edges
9. `generate_schedule()` - 17 edges
10. `run_seed()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `_get_admin_token()` --uses--> `User`  [INFERRED]
  tests/test_api_endpoints.py → backend/models/user.py
- `_get_auth_token()` --uses--> `User`  [INFERRED]
  tests/test_assistant.py → backend/models/user.py
- `test_compute_availability_no_schedules()` --calls--> `compute_availability()`  [EXTRACTED]
  tests/test_availability.py → backend/ai/metrics/availability.py
- `test_compute_availability_with_booking()` --calls--> `compute_availability()`  [EXTRACTED]
  tests/test_availability.py → backend/ai/metrics/availability.py
- `test_prioritizer_feature_extraction()` --calls--> `PrioritizationEngine`  [EXTRACTED]
  tests/test_prioritizer.py → backend/ai/scoring/prioritizer.py

## Import Cycles
- None detected.

## Communities (36 total, 6 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.06
Nodes (56): App(), AppLayout(), Footer(), Header(), formatTimeAgo(), NotificationCenter(), playChime(), ProtectedRoute() (+48 more)

### Community 1 - "PrioritizationEngine"
Cohesion: 0.18
Nodes (9): PrioritizationEngine, ndarray, Weighted rule formula as fallback and as training label component., Score a list of task dicts. Returns scored list sorted by criticalityScore…, Return SHAP values for a single task (SQLAlchemy model instance or dict). Falls…, 5-feature vector: [safety_score, overdue_norm, traffic_score, recurrence_norm,…, Path, Verify 5-feature normalization ranges [0.0, 1.0]. (+1 more)

### Community 2 - "test_api_endpoints.py"
Cohesion: 0.05
Nodes (57): change_password(), ChangePasswordRequest, login(), LoginRequest, BaseModel, post, put, Request (+49 more)

### Community 3 - "timedelta"
Cohesion: 0.07
Nodes (31): BlockOptimizer, _minutes_to_datetime(), _parse_time(), date, Real CP-SAT Block Optimizer using Google OR-Tools. Replaces the fake greedy…, Group solved tasks by (section, time-slot) into merged schedule blocks., Simple greedy: sort by criticality, assign to first available window. Used when…, Convert BlockWindow records to (start_min, end_min) tuples in the planning… (+23 more)

### Community 4 - "dependencies"
Cohesion: 0.06
Nodes (35): axios, dependencies, axios, @fullcalendar/core, @fullcalendar/daygrid, @fullcalendar/interaction, @fullcalendar/react, @fullcalendar/resource-timeline (+27 more)

### Community 5 - "CorridorBlock"
Cohesion: 0.05
Nodes (70): compute_all_sections(), compute_availability(), Asset availability computation per section. Compares scheduled downtime against…, Returns availability metrics for a single section. availability_score =…, Compute availability for a list of sections., XGBoost + Rule hybrid prioritization engine with SHAP explanations. 5 features:…, _build_system_prompt(), chat() (+62 more)

### Community 6 - "schedules.py"
Cohesion: 0.19
Nodes (22): approve_schedule(), generate_schedule(), GenerateRequest, get_schedules(), get_stats(), override_schedule(), OverrideRequest, partial_approve() (+14 more)

### Community 7 - "MaintenanceTask"
Cohesion: 0.21
Nodes (22): create_task(), delete_task(), explain_task(), get_task(), get_task_stats(), get_tasks(), prioritize_tasks(), PrioritizeRequest (+14 more)

### Community 8 - "client/package.json"
Cohesion: 0.10
Nodes (20): devDependencies, oxlint, @types/react, @types/react-dom, vite, @vitejs/plugin-react, name, private (+12 more)

### Community 9 - "🚆 RailOpt AI — AI-Powered Automatic Block Planning System"
Cohesion: 0.11
Nodes (18): 1. UX4G & GIGW 3.0 Compliant Interface, 2. Multi-Department Telemetry Ingestion, 3. Explainable AI Prioritization (`PrioritizationEngine`), 4. Constraint-Satisfaction Optimization (`BlockScheduleOptimizer`), 5. Corridor Availability & Analytics, 🌟 Core System Modules, 🔑 Demo Credentials, 🔄 End-to-End Operational Workflow (+10 more)

### Community 11 - "scripts"
Cohesion: 0.12
Nodes (15): concurrently, description, devDependencies, concurrently, name, private, scripts, build:client (+7 more)

### Community 12 - "User"
Cohesion: 0.06
Nodes (65): _alert_to_dict(), delete_alert(), get_alerts(), mark_all_read(), mark_read(), delete, get, post (+57 more)

### Community 13 - "Engineering & Autonomous Execution Standards"
Cohesion: 0.33
Nodes (5): 1. Full-Output & Zero Placeholder Enforcement, 2. React & Frontend Craft, 3. GSD (Get Shit Done) & Autopilot Rigor, 4. Code Quality & CodeRabbit Standards, Engineering & Autonomous Execution Standards

### Community 14 - ".oxlintrc.json"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 15 - "RailOpt AI — Indian Railways Maintenance Scheduling System"
Cohesion: 0.25
Nodes (7): 1. Executive Overview & Problem Statement, 2. Architecture & Tech Stack, 3. Core Architectural Hubs (God Nodes), 4. Key Database Models (`backend/models/`), 5. Microservices & Local Ports, Complete System Context & Knowledge Graph Handoff, RailOpt AI — Indian Railways Maintenance Scheduling System

### Community 16 - "RailOpt AI — Frontend Client"
Cohesion: 0.33
Nodes (5): 🎨 Design System & Accessibility, 📂 Project Structure, RailOpt AI — Frontend Client, React 18 + Vite + TailwindCSS + UX4G Design System, 🚀 Running Locally

### Community 20 - "import_csv"
Cohesion: 0.08
Nodes (25): import_csv(), post, Request, Session, UploadFile, Seed the database with 80 realistic maintenance tasks + 12 NR corridors + block…, Parse and import maintenance task CSV from TMS, SMMS, or TDMS. Returns row-…, seed_data() (+17 more)

### Community 21 - "Settings"
Cohesion: 0.27
Nodes (7): Any, Ensure PostgreSQL URIs are formatted correctly for SQLAlchemy., Support comma-separated strings or JSON lists for CORS origins., Validate that SECRET_KEY is not a weak or placeholder value., Settings, BaseSettings, field_validator

### Community 24 - "trainer.py"
Cohesion: 0.40
Nodes (5): generate_sample(), ndarray, Offline ML training pipeline for the 5-feature criticality XGBoost model. Run…, Generate one training sample with label independent from rule formula., train()

### Community 27 - "Security & Privacy Policy"
Cohesion: 0.33
Nodes (5): 1. Secrets & Environment Isolation, 2. Telemetry & Data Privacy, 3. Web & API Security Standards, 4. GIGW 3.0 Auditability, Security & Privacy Policy

## Knowledge Gaps
- **102 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+97 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User` to `test_api_endpoints.py`, `CorridorBlock`, `schedules.py`, `MaintenanceTask`, `import_csv`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `PrioritizationEngine` connect `PrioritizationEngine` to `CorridorBlock`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `Settings` connect `Settings` to `User`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 47 inferred relationships involving `User` (e.g. with `delete_alert()` and `get_alerts()`) actually correct?**
  _`User` has 47 INFERRED edges - model-reasoned connections that need verification._
- **Are the 24 inferred relationships involving `CorridorBlock` (e.g. with `get_alerts()` and `mark_all_read()`) actually correct?**
  _`CorridorBlock` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 21 inferred relationships involving `MaintenanceTask` (e.g. with `get_alerts()` and `scan_alerts()`) actually correct?**
  _`MaintenanceTask` has 21 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _102 weakly-connected nodes found - possible documentation gaps or missing edges._