# agent-skills vendor pin

| Field | Value |
|-------|-------|
| Upstream | https://github.com/addyosmani/agent-skills |
| Commit | `fefc4075ddfd8363d3b2aa8b26e6440f1ce204c0` |
| Synced | 2026-07-24 |
| Skills | 24 (23 lifecycle + using-agent-skills) |
| Commands | 8 + code-build alias |
| Agents | 4 |

## Local overrides (not overwritten by sync)

| Path | Role |
|------|------|
| `harness/scripts/agent/agent-skills-standards/` | Related Coding Standards per command |
| `harness/scripts/agent/local-skills/` | ai-agent-template skills (restored after upstream sync) |
| `harness/scripts/agent/local-commands/` | Local slash commands (`/setup`, `/spec`, `/qa`, `/testcase-*`, …) |
| `harness/scripts/agent/local-agents/` | Local personas (restored after upstream agents rsync) |
| `harness/scripts/agent/sync-local-agent-skills.sh` | Copy local-skills → `.cursor/skills/` |
| `harness/scripts/agent/sync-local-agents.sh` | Copy local-agents → `.cursor/agents/` |
| `.cursor/commands/` | Generated — upstream + standards + local |
| `.cursor/rules/agent-skills.mdc` | Orchestration (regenerated each sync) |

## Sync

```bash
./harness/scripts/agent/sync-agent-skills.sh
```
