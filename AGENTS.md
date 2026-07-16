# AGENTS.md — Repository map for agents

> **Humans steer. Agents execute.** This file is the table of contents — not the encyclopedia. Follow links for depth.

**ai-agent-template** — skeleton repo for Cursor agent workflows. No runnable application stack is shipped; add code under `code-base/` and docs under `docs/` after fork.

Human overview: [README.md](README.md) · Ops: [RUNBOOK.md](RUNBOOK.md)

## Repository zones

| Zone | Paths | Purpose |
|------|-------|---------|
| **Code** | [`code-base/`](code-base/README.md) | Runnable applications (empty until you add them) |
| **Product docs** | `docs/` | Specs, exec-plans, releases (empty until you add them) |
| **Domain standards** | `coding-standard/` | Org coding rules (empty — vendor after fork) |
| **Knowledge** | [`knowledge/`](knowledge/README.md) | Harness philosophy + testing standards |
| **Agent tooling** | `scripts/agent/`, `.cursor/`, `references/` | Skills, commands, checklists (Cursor) |

## Document map

| Area | Entry | Content |
|------|-------|---------|
| **First boot** | [RUNBOOK.md](RUNBOOK.md) | Sync skills, verify skeleton, where to put code/docs |
| **Cursor SDLC** | [.cursor/USAGE.md](.cursor/USAGE.md) | Slash commands, layout |
| **Orchestration** | [.cursor/rules/agent-skills.mdc](.cursor/rules/agent-skills.mdc) | Intent → skill, command routing |
| **Subagents** | `.cursor/agents/` | `code-reviewer`, `security-auditor`, `test-engineer`, `web-performance-auditor` |
| **Workflows (deep)** | [knowledge/harness/workflows.md](knowledge/harness/workflows.md) | Step-by-step SDLC examples |
| **Harness concepts** | [knowledge/harness/README.md](knowledge/harness/README.md) | Beliefs, skills ↔ harness |
| **Scripts** | [scripts/README.md](scripts/README.md) | Sync, local skills/commands, CI |
| **Local planning skill** | [harness-planning-conventions](scripts/agent/local-skills/harness-planning-conventions/SKILL.md) | Plans → `docs/exec-plans/active/` |
| **Local release skill** | [release-notes-and-handoff](scripts/agent/local-skills/release-notes-and-handoff/SKILL.md) | `/release` handoff after `/ship` GO |

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
| Docs structure | `node scripts/ci/docs-lint.mjs` |
| GitHub Actions | `.github/workflows/ci-check.yml` |

## Progressive disclosure

1. Start here (`AGENTS.md`) for orientation.
2. [RUNBOOK.md](RUNBOOK.md) — first-time sync + bootstrap `code-base/` and `docs/`.
3. [knowledge/harness/README.md](knowledge/harness/README.md) — how skills and harness work together.
4. Before changing a service: `docs/specs/` + vendored `coding-standard/` (when added) + active plan in `docs/exec-plans/active/`.
5. Checklists: `references/` · command standards: `scripts/agent/agent-skills-standards/`.

## What agents cannot see

Knowledge outside this repository (Slack, Google Docs, tacit human context) is **illegible**. Encode decisions into versioned markdown, specs, or tooling in-repo.
