# AGENTS.md — Repository map for agents

> **Humans steer. Agents execute.** This file is the table of contents — not the encyclopedia. Follow links for depth.

## Repository zones

| Zone | Paths | Purpose |
|------|-------|---------|
| **Code** | `backend/`, `frontend/backoffice-next/` | Runnable applications |
| **Product docs** | `docs/specs/` | What to build (per-service specs) |
| **Execution plans** | `docs/exec-plans/` | Active/completed work, tech debt |
| **Domain standards** | `coding-standard/` | How to build (org rules) |
| **Harness** | `harness-engineering/` | Working philosophy — beliefs, skills integration, tooling |
| **Agent tooling** | `scripts/`, `.cursor/`, `.claude/`, `references/` | Skills, commands, checklists (Cursor + Claude Code) |

## Document map

| Area | Entry | Content |
|------|-------|---------|
| **Local ops (start here)** | [RUNBOOK.md](RUNBOOK.md) | Boot harness, manual, seed, smoke, CI |
| **Environment files** | [backend/ENV.md](backend/ENV.md) | `.env.harness` (dev-up) · `.env` (manual) · `.env.prod` (PM2 prod) · `.env.staging` (PM2 staging) |
| **System architecture** | [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md) | Trust boundary, gateway mesh |
| **Backend ops (deep)** | [backend/RUNBOOK.md](backend/RUNBOOK.md) | Docker, seed, deploy checklist |
| **Product specs** | [docs/README.md](docs/README.md) | Spec index under `docs/specs/` |
| **Golden principles** | [docs/golden-principles.md](docs/golden-principles.md) | Mechanical invariants agents must keep |
| **Quality score** | [docs/QUALITY_SCORE.md](docs/QUALITY_SCORE.md) | Domain grades and gaps |
| **Observability** | [docs/observability.md](docs/observability.md) | Logs/metrics query for agents |
| **Harness (how we work)** | [harness-engineering/README.md](harness-engineering/README.md) | Beliefs, agent-skills ↔ harness, boot/smoke |
| **Cursor SDLC** | [.cursor/USAGE.md](.cursor/USAGE.md) | `/spec` … `/ship`, subagents |
| **Claude Code SDLC** | [.claude/USAGE.md](.claude/USAGE.md) | Same skills/commands, native Claude Code format |
| **Claude Code orchestration** | [CLAUDE.md](CLAUDE.md) | Auto-loaded every session — skill/command routing (generated) |
| **Coding standards** | [coding-standard/](coding-standard/) | Auth, gateway, backend, frontend, testing |

## Agent workflow (SDLC)

```
/spec → /plan → /build → /test → /review → /code-simplify → /ship → /release
```

`/release` — after ship GO: user + deploy notes in `docs/releases/`, confirm, docs-lint, PR ([local skill](scripts/agent/local-skills/release-notes-and-handoff/SKILL.md)). Does not re-run `ci-all` (`/ship` already did).

Garbage collection: `/gc` — scan drift, update quality score, open small fixes.

Do **not** improvise workflows when a matching skill exists — read `.claude/skills/<name>/SKILL.md` (or `.cursor/skills/<name>/SKILL.md` in Cursor) completely.

## Boot and verify (local)

```bash
# One-command stack — boot + seed all services + smoke
./scripts/dev/dev-up.sh
./scripts/dev/smoke.sh
./scripts/dev/dev-down.sh

# Re-seed without restarting services
./scripts/dev/seed-all.sh
```

Manual fallback: [RUNBOOK.md](RUNBOOK.md).

## Quality gates

| Gate | Command |
|------|---------|
| All services (local) | `./scripts/ci/ci-all.sh` |
| Docs structure | `node scripts/ci/docs-lint.mjs` |
| Per-service CI | `npm run ci` in each package directory |
| GitHub Actions | `.github/workflows/ci-check.yml` |

## Progressive disclosure

1. Start here (`AGENTS.md`) for orientation.
2. Read [harness-engineering/README.md](harness-engineering/README.md) for how skills and harness work together.
3. Read the service spec in `docs/specs/backend/<service>/` before changing that service.
4. Read `docs/golden-principles.md` before proposing architecture changes.
5. Check `docs/exec-plans/active/` for in-flight work — avoid duplicating effort.
6. Use `coding-standard/` for domain rules; use `references/` for agent checklists.

## What agents cannot see

Knowledge outside this repository (Slack, Google Docs, tacit human context) is **illegible**. Encode decisions into versioned markdown, specs, or tooling in-repo.
