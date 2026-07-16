# Local agent skills (ai-agent-template)

Skills here are **not** in upstream [agent-skills](https://github.com/addyosmani/agent-skills). They are copied into `.cursor/skills/` after every sync so they are not deleted by `rsync --delete`.

| Path | Skill / command |
|------|-----------------|
| `release-notes-and-handoff/` | Release handoff after `/ship` — user + deploy notes, docs-lint, PR |
| `harness-planning-conventions/` | Plan output → `docs/exec-plans/active/` (not `tasks/`) |

If upstream ever ships a skill with the same folder name, local copy wins after `sync-local-agent-skills.sh`.

## Install / restore

```bash
./scripts/agent/sync-local-agent-skills.sh
```

This runs automatically at the end of `./scripts/agent/sync-agent-skills.sh`.

## Edit workflow

1. Edit `scripts/agent/local-skills/<name>/SKILL.md` (source of truth)
2. Run `./scripts/agent/sync-local-agent-skills.sh`
3. Pair with `scripts/agent/local-commands/<name>.md` if there is a slash command

Do **not** edit `.cursor/skills/<local-skill>/` directly — changes are overwritten on sync.
