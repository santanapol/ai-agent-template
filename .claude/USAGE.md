# Using agent-skills in Claude Code

## Layout

| Layer | Location |
|-------|----------|
| Standards (edit) | `scripts/agent/agent-skills-standards/` |
| Commands (generated) | `.claude/commands/` |
| Skills | `.claude/skills/` |
| Agents | `.claude/agents/` |
| References | `references/` |

Skills are discovered automatically by name (the `name:` field in each `SKILL.md`) —
no `agent-skills:` prefix, since these are vendored in-repo rather than installed
as a Claude Code plugin.

## Sync

```bash
./scripts/agent/sync-agent-skills.sh
```

## SDLC

`/spec` → `/plan` → `/build` → `/test` → `/review` → `/code-simplify` → `/ship` → `/release`
