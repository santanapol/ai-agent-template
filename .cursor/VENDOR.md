# agent-skills vendor pin

| Field | Value |
|-------|-------|
| Upstream | https://github.com/addyosmani/agent-skills |
| Commit | `8c6530305396f341b5da7201cf1f7e390fdb863f` |
| Synced | 2026-07-06 |
| Skills | 24 (23 lifecycle + using-agent-skills) |
| Commands | 8 + code-build alias |
| Agents | 4 |

## Local overrides (not overwritten by sync)

| Path | Role |
|------|------|
| `scripts/agent-skills-standards/` | Related Coding Standards per command |
| `.cursor/commands/` | Generated — upstream + standards |
| `.cursor/rules/agent-skills.mdc` | Orchestration (regenerated each sync) |

## Sync

```bash
./scripts/sync-agent-skills.sh
```
