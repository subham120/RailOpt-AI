## graphify

This project has a knowledge graph at `graphify-out/` with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or raw grep output.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation instead of raw source browsing.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Design & Engineering Standards

- **UX4G & GIGW 3.0**: Follow Indian Railways / UX4G design tokens (`#003366`, `#FF671F`, `#046A38`) and WCAG accessibility standards.
- **Full Output Enforcement**: Zero placeholder comments (`// TODO`, `...`). Always deliver full, production-ready code.
- **Testing & Verification**: Verify changes with `python -m pytest tests` and ensure all test suites pass.
