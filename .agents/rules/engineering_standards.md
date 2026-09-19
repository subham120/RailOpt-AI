# Engineering & Autonomous Execution Standards

## 1. Full-Output & Zero Placeholder Enforcement
- Never use placeholder comments (`// ...`, `// TODO`, `// rest of code`, `...`).
- Always deliver complete, unabridged, production-ready implementations for all files and components.

## 2. React & Frontend Craft
- Follow modern React 18 / Vite patterns with clean state management and memoization where appropriate.
- Maintain responsive layouts, crisp micro-interactions, and accessible interactive states.
- Avoid redundant re-renders and handle loading/error states cleanly.

## 3. GSD (Get Shit Done) & Autopilot Rigor
- Maintain systematic planning, execution, verification, and automated testing cycles.
- When performing multi-step features, execute atomically and verify against existing unit tests in `tests/`.

## 4. Code Quality & CodeRabbit Standards
- Verify all edge cases, input validation, type consistency, and security considerations (JWT auth, RBAC permissions, SQL injection prevention).
- Keep code modular, clean, and self-documenting with accurate docstrings and comments.
