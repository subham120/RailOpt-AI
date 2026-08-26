# Graph Report - SIH-Prototype  (2026-08-26)

## Corpus Check
- 55 files · ~27,493 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 399 nodes · 547 edges · 23 communities (20 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App.jsx
- middleware/auth.js
- dependencies
- dependencies
- main.py
- index.js
- client/package.json
- PrioritizationEngine
- scheduleController.js
- scripts
- 🚆 AI-Powered Automatic Block Planning System — Indian Railways
- server/package.json
- reportController.js
- taskController.js
- RailOpt AI — Indian Railways Maintenance Scheduling System
- .oxlintrc.json
- React + Vite
- rules/graphify.md
- workflows/graphify.md
- GEMINI.md

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 19 edges
2. `react` - 12 edges
3. `PrioritizationEngine` - 11 edges
4. `formatDuration()` - 11 edges
5. `🚆 AI-Powered Automatic Block Planning System — Indian Railways` - 8 edges
6. `DEPARTMENTS` - 7 edges
7. `scripts` - 7 edges
8. `protect()` - 7 edges
9. `RailOpt AI — Indian Railways Maintenance Scheduling System` - 7 edges
10. `🌟 Key Features` - 7 edges

## Surprising Connections (you probably didn't know these)
- `AppLayout()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/App.jsx → client/src/context/AuthContext.jsx
- `Header()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/components/layout/Header.jsx → client/src/context/AuthContext.jsx
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/components/layout/ProtectedRoute.jsx → client/src/context/AuthContext.jsx
- `Sidebar()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/components/layout/Sidebar.jsx → client/src/context/AuthContext.jsx
- `Dashboard()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/pages/Dashboard.jsx → client/src/context/AuthContext.jsx

## Import Cycles
- None detected.

## Communities (23 total, 3 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.12
Nodes (34): App(), AppLayout(), Footer(), Header(), ProtectedRoute(), ICONS, Sidebar(), AuthContext (+26 more)

### Community 1 - "middleware/auth.js"
Cohesion: 0.07
Nodes (28): jwt, protect(), requireRole(), User, authController, express, { protect }, router (+20 more)

### Community 2 - "dependencies"
Cohesion: 0.06
Nodes (33): dependencies, axios, @fullcalendar/core, @fullcalendar/daygrid, @fullcalendar/interaction, @fullcalendar/react, @fullcalendar/resource-timeline, @fullcalendar/timegrid (+25 more)

### Community 3 - "dependencies"
Cohesion: 0.06
Nodes (33): bcryptjs, cors, dotenv, express, express-validator, jsonwebtoken, mongoose, morgan (+25 more)

### Community 4 - "main.py"
Cohesion: 0.11
Nodes (21): CorridorInput, health(), optimize_schedule(), OptimizeRequest, prioritize_tasks(), PrioritizeRequest, Generate optimized block schedule using constraint programming., Score and rank maintenance tasks by criticality/urgency. (+13 more)

### Community 5 - "index.js"
Cohesion: 0.10
Nodes (20): mongoose, { Sequelize }, testConnection(), app, connectMongo, cors, dotenv, express (+12 more)

### Community 6 - "client/package.json"
Cohesion: 0.10
Nodes (20): devDependencies, oxlint, @types/react, @types/react-dom, vite, @vitejs/plugin-react, name, private (+12 more)

### Community 7 - "PrioritizationEngine"
Cohesion: 0.15
Nodes (10): PrioritizationEngine, Compute rule-based score with full breakdown., Get ML model's predicted urgency as a 0–1 score., Map composite score to urgency tier., Score and rank a list of maintenance tasks., Generate human-readable explanation for the score., Hybrid rule-based + ML criticality scoring engine., Load pre-trained model or train a new one on synthetic data. (+2 more)

### Community 8 - "scheduleController.js"
Cohesion: 0.07
Nodes (26): { CorridorBlock, BlockWindow, TrafficData }, FALLBACK_SECTIONS, generateFallbackWindows(), getAllWindows(), getCorridor(), getCorridors(), AuditLog, { CorridorBlock, BlockWindow, TrafficData } (+18 more)

### Community 9 - "scripts"
Cohesion: 0.13
Nodes (14): concurrently, description, devDependencies, concurrently, name, private, scripts, dev (+6 more)

### Community 10 - "🚆 AI-Powered Automatic Block Planning System — Indian Railways"
Cohesion: 0.10
Nodes (19): 1. UX4G & GIGW Compliant Interface, 2. Multi-Department Data Ingestion, 3. Explainable Hybrid AI Prioritization, 4. Constraint-Based Block Schedule Optimizer (OR-Tools CP-SAT), 5. Interactive Gantt Timeline & Multi-Horizon Views, 6. Role-Based Access Control (RBAC) & Transparent Audit Log, 🚆 AI-Powered Automatic Block Planning System — Indian Railways, 🔀 Application Flowchart (+11 more)

### Community 11 - "server/package.json"
Cohesion: 0.17
Nodes (11): nodemon, description, devDependencies, nodemon, main, name, scripts, dev (+3 more)

### Community 12 - "reportController.js"
Cohesion: 0.14
Nodes (9): AuditLog, BlockSchedule, { CorridorBlock }, exportReport(), formatDuration(), MaintenanceTask, XLSX, blockScheduleSchema (+1 more)

### Community 13 - "taskController.js"
Cohesion: 0.07
Nodes (13): AuditLog, { body, validationResult }, jwt, User, AuditLog, MaintenanceTask, auditLogSchema, mongoose (+5 more)

### Community 14 - "RailOpt AI — Indian Railways Maintenance Scheduling System"
Cohesion: 0.25
Nodes (7): 1. Executive Overview & Problem Statement, 2. Architecture & Tech Stack, 3. Core Communities & Architectural Hubs (God Nodes), 4. Key Data Models, 5. Active Microservices & Local Ports, Complete System Context & Knowledge Graph Handoff, RailOpt AI — Indian Railways Maintenance Scheduling System

### Community 15 - ".oxlintrc.json"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 16 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + Vite

## Knowledge Gaps
- **177 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+172 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `client/package.json`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `server/package.json`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _177 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12163265306122449 - nodes in this community are weakly interconnected._
- **Should `middleware/auth.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06984126984126984 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._