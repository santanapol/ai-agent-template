# ai-agent-template

GitHub template for **Cursor agent workflows** — vendored [agent-skills](https://github.com/addyosmani/agent-skills), slash commands, subagents, and harness knowledge. No runnable application stack is shipped; configure code layout in [`harness.config.yaml`](harness.config.yaml) and add docs under `docs/` after fork.

> **Humans steer. Agents execute.** Agents start at [AGENTS.md](AGENTS.md).

## Code layout (pick one)

| Profile | Command | Where code lives |
|---------|---------|------------------|
| **Greenfield** (default) | — | `code-base/backend/`, `code-base/frontend/` |
| **Brownfield** | `./harness/scripts/agent/set-code-layout.sh root` | `backend/`, `frontend/` at repo root |

Guide: [harness/knowledge/harness/adopt.md](harness/knowledge/harness/adopt.md)

## Quick start

```bash
# 1. Use this template on GitHub, then clone your new repo

# 2. Open in Cursor and run first-boot setup (interview + sync + lint)
#    /setup

#    Or manually:
./harness/scripts/agent/sync-agent-skills.sh
node harness/scripts/ci/docs-lint.mjs

# 3. (Brownfield only) point harness at root code
# ./harness/scripts/agent/set-code-layout.sh root

# 4. Add application code — paths from harness.config.yaml
#    greenfield: code-base/backend/, code-base/frontend/
#    brownfield: backend/, frontend/ (existing)

# 5. Add product docs as you build
#    specs, exec-plans, releases → docs/

# 6. (Optional) Vendor org coding rules
#    → coding-standard/
```

Step-by-step harness ops: [harness/HARNESS-RUNBOOK.md](harness/HARNESS-RUNBOOK.md).

## What's included

| Zone | Path | Contents |
|------|------|----------|
| **Code** | [`harness.config.yaml`](harness.config.yaml) | `code-base/` (default) or root — see [harness/knowledge/harness/adopt.md](harness/knowledge/harness/adopt.md) |
| **Product docs** | [`docs/`](docs/README.md) | Specs, exec-plans, releases (SDLC) |
| **Harness** | [`harness/`](harness/README.md) | harness runbook, knowledge, references, scripts |
| **Domain standards (empty)** | [`coding-standard/`](coding-standard/README.md) | Vendor org coding rules after fork |
| **Cursor runtime** | [`.cursor/`](.cursor/USAGE.md) | Skills, commands, subagents |

## Agent workflow (Cursor)

```
/spec → /plan → /build → /test → /review → /code-simplify → /ship → /release
                                                          ↘ /gc
```

| Situation | Start with |
|-----------|------------|
| Just cloned template | `/setup` |
| New feature | `/spec` → `/plan` → `/build` |
| Before merge | `/ship` |
| After ship GO | `/release` |
| Drift / cleanup | `/gc` |

Slash commands and layout: [.cursor/USAGE.md](.cursor/USAGE.md) · Intent routing: [.cursor/rules/agent-skills.mdc](.cursor/rules/agent-skills.mdc) · Deep workflows: [harness/knowledge/harness/workflows.md](harness/knowledge/harness/workflows.md)

## Quality gate

```bash
node harness/scripts/ci/docs-lint.mjs
```

Runs on every PR via [.github/workflows/ci-check.yml](.github/workflows/ci-check.yml).

## Read next

| Audience | Start here |
|----------|------------|
| Agents | [AGENTS.md](AGENTS.md) |
| Humans (harness ops) | [harness/HARNESS-RUNBOOK.md](harness/HARNESS-RUNBOOK.md) |
| Product docs | [docs/README.md](docs/README.md) |
| Code layouts | [harness/knowledge/harness/adopt.md](harness/knowledge/harness/adopt.md) |
| Harness concepts | [harness/knowledge/harness/README.md](harness/knowledge/harness/README.md) |
