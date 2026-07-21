# Product documentation

**Project lifecycle artifacts** — what you build, how you plan it, and what you ship. Created and updated by the SDLC (`/spec`, `/plan`, `/release`, `/gc`).

This folder is **not** for harness or agent setup guides — those live in [`harness/knowledge/`](../harness/knowledge/README.md) and [`harness/knowledge/harness/`](../harness/knowledge/harness/README.md).

## Layout

| Path | Purpose | Typical command |
|------|---------|-----------------|
| [`specs/`](specs/README.md) | What to build | `/spec` |
| [`exec-plans/`](exec-plans/README.md) | How to build (active plans, tech debt) | `/plan`, `/build` |
| `releases/` | User + deploy notes per release | `/release` |
| [`coding-standard/`](../coding-standard/README.md) | Org coding rules (vendor after fork) | `/spec`, `/build`, `/review` |
| `golden-principles.md` | Mechanical invariants (create when project grows) | `/gc` |
| `QUALITY_SCORE.md` | Domain quality grades (optional) | `/gc` |

## Rules

- Specs: `docs/specs/<slug>.md` — never `SPEC.md` at repo root
- Plans: `docs/exec-plans/active/<slug>.md` — never `tasks/plan.md`
- Code layout: [`harness/knowledge/harness/adopt.md`](../harness/knowledge/harness/adopt.md) + [`harness.config.yaml`](../harness.config.yaml)

Start navigation at [AGENTS.md](../AGENTS.md).
