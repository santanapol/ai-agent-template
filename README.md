# ai-agent-template

GitHub template for **AI agent workflows** — vendored [agent-skills](https://github.com/addyosmani/agent-skills), Cursor commands, coding standards, and knowledge base. Application code and product docs are empty placeholders for your project.

## Quick start

```bash
# 1. Use this template on GitHub, then clone your new repo

# 2. Sync agent skills
./scripts/agent/sync-agent-skills.sh

# 3. Add your application code
#    backend  → code-base/backend/
#    frontend → code-base/frontend/

# 4. Add product docs as you build
#    specs, exec-plans, releases → docs/
```

## What's included

| Zone | Path | Contents |
|------|------|----------|
| **Code (empty)** | [`code-base/`](code-base/) | Placeholders for backend + frontend — see [code-base/README.md](code-base/README.md) |
| **Product docs (empty)** | `docs/` | Placeholder for specs, exec-plans, releases |
| **Agent tooling** | `.cursor/`, `scripts/agent/`, `references/` | Skills, commands, subagents |
| **Domain standards (empty)** | `coding-standard/` | Vendor org coding rules after fork |
| **Knowledge** | `knowledge/` | Harness philosophy + testing standards |

## Agent workflow

```
/spec → /plan → /build → /test → /review → /code-simplify → /ship → /release
```

Start at [AGENTS.md](AGENTS.md). Ops guide: [RUNBOOK.md](RUNBOOK.md).
