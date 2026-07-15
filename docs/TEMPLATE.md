# Repository template conventions

This document freezes the **zero-platform** repository skeleton for reuse as a future template or fork baseline. Product-specific services and specs change per instance; the zones and harness rules stay stable.

## Repository zones

| Zone | Paths | Purpose |
|------|-------|---------|
| **Code** | `backend/`, `frontend/backoffice-next/` | Runnable applications |
| **Product docs** | `docs/specs/` | What to build (per-service specs) |
| **Execution plans** | `docs/exec-plans/` | Active/completed work, tech debt |
| **Domain standards** | `coding-standard/` | How to build (org rules, vendored) |
| **Knowledge** | `knowledge/` | Harness philosophy + testing standards |
| **Agent tooling** | `scripts/`, `.cursor/`, `.claude/`, `references/` | Skills, commands, checklists |
| **Dev ops** | `dev-ops/` | Staging/production server runbooks |

Start navigation at [AGENTS.md](../AGENTS.md) — progressive disclosure, not an encyclopedia.

## Root allowlist

Intentional top-level entries:

| Entry | Role |
|-------|------|
| `README.md`, `AGENTS.md`, `RUNBOOK.md`, `CHANGELOG.md` | Human + agent entry |
| `CLAUDE.md` | Generated orchestration (Claude Code) |
| `backend/`, `frontend/`, `docs/`, `coding-standard/`, `knowledge/`, `scripts/`, `references/`, `dev-ops/` | Zones |
| `.cursor/`, `.claude/`, `.github/`, `.dev-run/` | Tooling / runtime |

## Forbidden (tracked in git)

| Pattern | Why |
|---------|-----|
| `**/_mission-control/` | Shipped specs belong in `docs/specs/` or `service/.../docs/` |
| Second production frontend app | One UI: `frontend/backoffice-next/` |
| Tracked `tasks/*.md` | Durable plans live in `docs/exec-plans/` only |
| Empty `code-base/` or custom code root | Use zone table; do not nest `backend/` under another folder |

## Plans (source of truth)

All multi-step work uses **`docs/exec-plans/`** only. `/plan` and `/build` (local commands) write and read **`docs/exec-plans/active/<slug>.md`** directly.

Do **not** create `tasks/plan.md` or `tasks/todo.md`. The `tasks/` directory remains in `.gitignore` as a safety net if an agent ignores harness overrides; `docs-lint` fails if `tasks/*` is tracked.

## Execution plans

All multi-step work → [docs/exec-plans/](exec-plans/README.md):

```yaml
---
status: active | completed | cancelled
created: YYYY-MM-DD
updated: YYYY-MM-DD
services: [auth, gateway, staff]
---
```

## Service bootstrap checklist

When adding a backend internal API (clone from **staff** reference):

1. `backend/service/<name>/` — package layout matching staff
2. `docs/specs/backend/<name>/` — central product spec
3. `openapi.yaml` + `npm run ci` scripts in package
4. Gateway route in `backend/gateway/routes.json`
5. Seed script wired in `scripts/dev/seed-all.sh`
6. Boot + smoke path in `scripts/dev/dev-up.sh` / `smoke.sh`
7. Row in [QUALITY_SCORE.md](QUALITY_SCORE.md)
8. (Optional) Frontend menu + page in `frontend/backoffice-next/`

## Template vs product instance

| Keep in template | Replace per product |
|------------------|---------------------|
| auth + gateway + demo-service (or staff skeleton) | Domain services |
| Harness scripts, golden principles, agent-skills sync | Ports, domains, secrets |
| `coding-standard/` layout | Org-specific standard content |
| docs zone structure | Specs, exec-plans, releases |
| One backoffice-next shell | Branding, menus, features |

Do not ship production credentials or environment-specific secrets in a template repo.

## Recovering removed artifacts

- Legacy Vite backoffice: `git checkout 6a3353b -- frontend/backoffice`
- Old `_mission-control/` specs: git history under `backend/service/*/`

## Related

- [golden-principles.md](golden-principles.md) — mechanical invariants
- [knowledge/harness/README.md](../knowledge/harness/README.md) — how skills and harness work together
- [exec-plans/README.md](exec-plans/README.md) — plan lifecycle
