# AGENTS.md — Repository map for agents

> **Humans steer. Agents execute.** This file is the table of contents — not the encyclopedia. Follow links for depth.

**ai-agent-template** — skeleton repo for Cursor agent workflows. No runnable application stack is shipped; add code per [`harness.config.yaml`](harness.config.yaml) (`code-base/` or root layout) and docs under `docs/` after fork.

Human overview: [README.md](README.md) · Harness ops: [harness/HARNESS-RUNBOOK.md](harness/HARNESS-RUNBOOK.md) · Layouts: [harness/knowledge/harness/adopt.md](harness/knowledge/harness/adopt.md)

## Repository zones

| Zone | Paths | Purpose |
|------|-------|---------|
| **Code** | [`harness.config.yaml`](harness.config.yaml) → `code.backend`, `code.frontend` | Runnable applications — `code-base/` (greenfield) or root (brownfield) |
| **Harness** | [`harness/`](harness/README.md) | harness runbook, knowledge, references, scripts (agent + CI) |
| **Product docs** | [`docs/`](docs/README.md) | Specs, exec-plans, releases (SDLC artifacts) |
| **Domain standards** | [`coding-standard/`](coding-standard/README.md) | Org coding rules (empty — vendor after fork) |
| **Cursor runtime** | `.cursor/` | Skills, commands, subagents (generated + sync) |

## Document map

| Area | Entry | Content |
|------|-------|---------|
| **First boot** | [harness/HARNESS-RUNBOOK.md](harness/HARNESS-RUNBOOK.md) | Sync skills, verify skeleton, choose code layout |
| **Product docs** | [docs/README.md](docs/README.md) | Specs, exec-plans, releases — SDLC output |
| **Code layouts** | [harness/knowledge/harness/adopt.md](harness/knowledge/harness/adopt.md) | Greenfield (`code-base/`) vs brownfield (root) |
| **Cursor SDLC** | [.cursor/USAGE.md](.cursor/USAGE.md) | Slash commands, layout |
| **Orchestration** | [.cursor/rules/agent-skills.mdc](.cursor/rules/agent-skills.mdc) | Intent → skill, command routing |
| **Subagents** | `.cursor/agents/` | `code-reviewer`, `security-auditor`, `test-engineer`, `web-performance-auditor` |
| **Workflows (deep)** | [harness/knowledge/harness/workflows.md](harness/knowledge/harness/workflows.md) | Step-by-step SDLC examples |
| **Harness concepts** | [harness/knowledge/harness/README.md](harness/knowledge/harness/README.md) | Beliefs, skills ↔ harness |
| **Harness ops** | [harness/README.md](harness/README.md) | Sync, local skills/commands, CI |
| **Local planning skill** | [harness-planning-conventions](harness/scripts/agent/local-skills/harness-planning-conventions/SKILL.md) | Spec/plan paths + `harness.config.yaml` code zones |
| **Local release skill** | [release-notes-and-handoff](harness/scripts/agent/local-skills/release-notes-and-handoff/SKILL.md) | `/release` handoff after `/ship` GO |

## Agent workflow (SDLC)

```
/spec → /plan → /build → /test → /review → /code-simplify → /ship → /release
                                                          ↘ /gc
```

| Situation | Start with |
|-----------|------------|
| Vague ask | `interview-me` or `idea-refine` |
| New feature | `/spec` → `/plan` → `/build` |
| Bug / unexpected behavior | `debugging-and-error-recovery` |
| Before merge | `/ship` |
| After ship GO | `/release` → `docs/releases/` |
| Drift / cleanup | `/gc` |

Full intent routing: [.cursor/rules/agent-skills.mdc](.cursor/rules/agent-skills.mdc)

Do **not** improvise workflows when a matching skill exists — read `.cursor/skills/<name>/SKILL.md` completely.

## Quality gates

| Gate | Command |
|------|---------|
| Docs structure | `node harness/scripts/ci/docs-lint.mjs` |
| GitHub Actions | `.github/workflows/ci-check.yml` |

## Progressive disclosure

1. Start here (`AGENTS.md`) for orientation.
2. [harness/HARNESS-RUNBOOK.md](harness/HARNESS-RUNBOOK.md) — first-time sync + choose layout via [harness/knowledge/harness/adopt.md](harness/knowledge/harness/adopt.md).
3. [docs/README.md](docs/README.md) — product specs and plans · [harness/knowledge/harness/README.md](harness/knowledge/harness/README.md) — harness concepts.
4. Before changing a service: read `harness.config.yaml` for code zones; spec in `docs/specs/` (+ service `docs/spec.md` under code zones) + vendored `coding-standard/` (when added) + active plan in `docs/exec-plans/active/`. **No SDLC artifacts at repo root** (`SPEC.md`, `spec/`, `tasks/`).
5. Checklists: `harness/references/` · command standards: `harness/scripts/agent/agent-skills-standards/`.

## What agents cannot see

Knowledge outside this repository (Slack, Google Docs, tacit human context) is **illegible**. Encode decisions into versioned markdown, specs, or tooling in-repo.
