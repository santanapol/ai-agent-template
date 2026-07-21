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

`/setup` (once) → `/spec` → `/plan` → `/build` → `/test` → `/review` → `/code-simplify` → `/ship` → `/release`
