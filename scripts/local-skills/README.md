# Local agent skills (zero-platform only)

Skills here are **not** in upstream [agent-skills](https://github.com/addyosmani/agent-skills). They are copied into `.cursor/skills/` after every sync so they are not deleted by `rsync --delete`.

| Path | Skill |
|------|-------|
| `release-notes-and-handoff/` | Release handoff after `/ship` — user + deploy notes, docs-lint, PR |

If upstream ever ships a skill with the same folder name, local copy wins after `sync-local-agent-skills.sh`.

## Install / restore

```bash
./scripts/sync-local-agent-skills.sh
```

This runs automatically at the end of `./scripts/sync-agent-skills.sh`.

## Edit workflow

1. Edit `scripts/local-skills/<name>/SKILL.md` (source of truth)
2. Run `./scripts/sync-local-agent-skills.sh`
3. Pair with `scripts/local-commands/<name>.md` if there is a slash command

Do **not** edit `.cursor/skills/<local-skill>/` directly — changes are overwritten on sync.
