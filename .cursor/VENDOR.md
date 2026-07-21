# agent-skills vendor pin

| Field | Value |
|-------|-------|
| Upstream | https://github.com/addyosmani/agent-skills |
| Commit | `2fbfa004a0192529bc997d103fc12f19a3804aab` |
| Synced | 2026-07-21 |
| Skills | 24 (23 lifecycle + using-agent-skills) |
| Commands | 8 + code-build alias |
| Agents | 4 |

## Local overrides (not overwritten by sync)

| Path | Role |
|------|------|
| `harness/scripts/agent/agent-skills-standards/` | Related Coding Standards per command |
| `harness/scripts/agent/local-skills/` | ai-agent-template skills (restored after upstream sync) |
| `harness/scripts/agent/local-commands/` | Local slash commands (`/spec`, `/gc`, `/release`, `/plan`, `/build`) |
| `harness/scripts/agent/sync-local-agent-skills.sh` | Copy local-skills → `.cursor/skills/` |
| `.cursor/commands/` | Generated — upstream + standards + local |
| `.cursor/rules/agent-skills.mdc` | Orchestration (regenerated each sync) |

## Sync

```bash
./harness/scripts/agent/sync-agent-skills.sh
```
