# agent-skills vendor pin

| Field | Value |
|-------|-------|
| Upstream | https://github.com/addyosmani/agent-skills |
| Commit | (run sync to refresh) |
| Skills | 24 (23 lifecycle + using-agent-skills) |
| Commands | 8 + code-build alias |
| Agents | 4 |

## Local overrides (not overwritten by sync)

| Path | Role |
|------|------|
| `scripts/agent/agent-skills-standards/` | Related Coding Standards per command |
| `scripts/agent/local-skills/` | ai-agent-template skills (restored after upstream sync) |
| `scripts/agent/local-commands/` | Local slash commands (`/gc`, `/release`, `/plan`, `/build`) |
| `scripts/agent/sync-local-agent-skills.sh` | Copy local-skills → `.cursor/skills/` |
| `.cursor/commands/` | Generated — upstream + standards + local |
| `.cursor/rules/agent-skills.mdc` | Orchestration (regenerated each sync) |

## Sync

```bash
./scripts/agent/sync-agent-skills.sh
```
