# agent-skills vendor pin (Claude Code)

| Field | Value |
|-------|-------|
| Upstream | https://github.com/addyosmani/agent-skills |
| Commit | `70b7506ce90e200cb47645ddb3f6b8e84fecc047` |
| Synced | 2026-07-08 |
| Skills | 24 (23 lifecycle + using-agent-skills) |
| Commands | 8 + code-build alias |
| Agents | 4 |

Vendored directly (not installed as a Claude Code plugin) so the repo stays self-contained
and pinned to one commit — same reasoning as `.cursor/VENDOR.md`. Command bodies have the
`agent-skills:` plugin-namespace prefix stripped since skills live unprefixed under
`.claude/skills/<name>/SKILL.md`.

## Local overrides (not overwritten by sync)

| Path | Role |
|------|------|
| `scripts/agent-skills-standards/` | Related Coding Standards per command |
| `scripts/local-skills/` | zero-platform skills (restored after upstream sync, into .cursor/ and .claude/) |
| `scripts/local-commands/` | Local slash commands (`/gc`, `/release`) |
| `scripts/sync-local-agent-skills.sh` | Copy local-skills → `.cursor/skills/` and `.claude/skills/` |
| `.claude/commands/` | Generated — upstream + standards + local (index: `.claude/COMMANDS.md`, kept outside this dir so it isn't picked up as a phantom command) |
| `.claude/settings.local.json` | Per-developer permissions — never touched by sync |

See also `.cursor/VENDOR.md` for the Cursor counterpart.

## Sync

```bash
./scripts/sync-agent-skills.sh
```
