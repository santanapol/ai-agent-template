# Using agent-skills in Cursor

## Layout

| Layer | Location |
|-------|----------|
| Standards (edit) | `scripts/agent-skills-standards/` |
| Commands (generated) | `.cursor/commands/` |
| Skills | `.cursor/skills/` |
| Agents | `.cursor/agents/` |
| References | `references/` |

## Sync

```bash
./scripts/sync-agent-skills.sh
```

## SDLC

`/spec` → `/plan` → `/build` → `/test` → `/review` → `/code-simplify` → `/ship` → `/release`
