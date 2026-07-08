# agent-skills vendor pin

| Field | Value |
|-------|-------|
| Upstream | https://github.com/addyosmani/agent-skills |
| Commit | `70b7506ce90e200cb47645ddb3f6b8e84fecc047` |
| Synced | 2026-07-08 |
| Skills | 24 (23 lifecycle + using-agent-skills) |
| Commands | 8 + code-build alias |
| Agents | 4 |

## Local overrides (not overwritten by sync)

| Path | Role |
|------|------|
| `scripts/agent/agent-skills-standards/` | Related Coding Standards per command |
| `scripts/agent/local-skills/` | zero-platform skills (restored after upstream sync, into .cursor/ and .claude/) |
| `scripts/agent/local-commands/` | Local slash commands (`/gc`, `/release`) |
| `scripts/agent/sync-local-agent-skills.sh` | Copy local-skills → `.cursor/skills/` and `.claude/skills/` |
| `.cursor/commands/` | Generated — upstream + standards + local |
| `.cursor/rules/agent-skills.mdc` | Orchestration (regenerated each sync) |

See also `.claude/VENDOR.md` for the Claude Code counterpart.

## Sync

```bash
./scripts/agent/sync-agent-skills.sh
```
