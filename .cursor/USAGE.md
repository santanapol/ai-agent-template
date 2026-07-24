# Using agent-skills in Cursor

## Layout

| Layer | Location |
|-------|----------|
| Standards (edit) | `harness/scripts/agent/agent-skills-standards/` |
| Commands (generated) | `.cursor/commands/` |
| Skills | `.cursor/skills/` |
| Agents | `.cursor/agents/` |
| References | `harness/references/` |

## Sync

```bash
./harness/scripts/agent/sync-agent-skills.sh
```

## First boot

After cloning this template: `/setup` (`harness-bootstrap`)

## SDLC

`/setup` (once) → `/spec` → `/plan` → `/build` → `/test` → `/review` → `/code-simplify` → `/qa` (pre-ship) → `/ship` → `/release`

## Testcase docs + QA (separate from `/test`)

| Command | Skill | Role |
|---------|-------|------|
| `/testcase-author` | `testcase-authoring` | Catalogue + scenario docs · stub / deep / bug-hunt |
| `/testcase-run` | `testcase-execution` | Run rows · Result / Last run · optional reports |
| `/reverse-contracts` | `reverse-engineer-contracts` | As-built contracts from code · bootstrap / audit / QA follow-up |
| `/qa` | `qa-cycle` | Docs → scenarios → CI/smoke → (pre-ship) security/test → QA Gate |
| `/test` | `test-driven-development` | Implement automated tests (`it` / suite) — not scenario Result |

`/qa` **consumes** contracts (+ product) for review/gate. `/reverse-contracts` **produces** as-built from code. After Conditional Pass on as-built DoD: `/reverse-contracts` → re-`/qa` `docs-review`.

SoT for local skills: `harness/scripts/agent/local-skills/` → `./harness/scripts/agent/sync-local-agent-skills.sh`  
Local personas: `harness/scripts/agent/local-agents/` → `./harness/scripts/agent/sync-local-agents.sh`
