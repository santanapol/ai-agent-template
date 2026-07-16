# ai-agent-template

GitHub template for **Cursor agent workflows** — vendored [agent-skills](https://github.com/addyosmani/agent-skills), slash commands, subagents, and harness knowledge. No runnable application stack is shipped; `code-base/`, `docs/`, and `coding-standard/` start empty for your project after fork.

> **Humans steer. Agents execute.** Agents start at [AGENTS.md](AGENTS.md).

## Quick start

```bash
# 1. Use this template on GitHub, then clone your new repo

# 2. Sync agent skills → .cursor/ + references/
./scripts/agent/sync-agent-skills.sh

# 3. Verify skeleton structure
node scripts/ci/docs-lint.mjs

# 4. Add application code
#    backend  → code-base/backend/
#    frontend → code-base/frontend/

# 5. Add product docs as you build
#    specs, exec-plans, releases → docs/

# 6. (Optional) Vendor org coding rules
#    → coding-standard/
```

Step-by-step ops: [RUNBOOK.md](RUNBOOK.md).

## What's included

| Zone | Path | Contents |
|------|------|----------|
| **Code (empty)** | [`code-base/`](code-base/README.md) | Placeholders for backend + frontend |
| **Product docs (empty)** | `docs/` | Specs, exec-plans, releases |
| **Domain standards (empty)** | `coding-standard/` | Vendor org coding rules after fork |
| **Agent tooling** | [`.cursor/`](.cursor/USAGE.md), [`scripts/agent/`](scripts/README.md), `references/` | Skills, commands, subagents, checklists |
| **Knowledge** | [`knowledge/`](knowledge/README.md) | Harness philosophy + testing standards |

## Agent workflow (Cursor)

```
/spec → /plan → /build → /test → /review → /code-simplify → /ship → /release
                                                          ↘ /gc
```

| Situation | Start with |
|-----------|------------|
| New feature | `/spec` → `/plan` → `/build` |
| Before merge | `/ship` |
| After ship GO | `/release` |
| Drift / cleanup | `/gc` |

Slash commands and layout: [.cursor/USAGE.md](.cursor/USAGE.md) · Intent routing: [.cursor/rules/agent-skills.mdc](.cursor/rules/agent-skills.mdc) · Deep workflows: [knowledge/harness/workflows.md](knowledge/harness/workflows.md)

## Quality gate

```bash
node scripts/ci/docs-lint.mjs
```

Runs on every PR via [.github/workflows/ci-check.yml](.github/workflows/ci-check.yml).

## Read next

| Audience | Start here |
|----------|------------|
| Agents | [AGENTS.md](AGENTS.md) |
| Humans (ops) | [RUNBOOK.md](RUNBOOK.md) |
| Harness concepts | [knowledge/harness/README.md](knowledge/harness/README.md) |
