# Using agent-skills in Cursor

## Layout

| Layer | Location |
|-------|----------|
| Standards (edit) | `scripts/agent/agent-skills-standards/` |
| Commands (generated) | `.cursor/commands/` |
| Skills | `.cursor/skills/` |
| Agents | `.cursor/agents/` |
| References | `references/` |

## Sync

```bash
./scripts/agent/sync-agent-skills.sh
```

## SDLC

`/spec` → `/plan` → `/build` → `/test` → `/review` → `/code-simplify` → `/ship` → `/release`
