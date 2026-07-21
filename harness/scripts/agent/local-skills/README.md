# Local agent skills (ai-agent-template)

Skills here are **not** in upstream [agent-skills](https://github.com/addyosmani/agent-skills). They are copied into `.cursor/skills/` after every sync so they are not deleted by `rsync --delete`.

| Path | Skill / command |
|------|-----------------|
| `harness-bootstrap/` | First-boot interview + setup after clone (`/setup`) |
| `release-notes-and-handoff/` | Release handoff after `/ship` — user + deploy notes, docs-lint, PR |
| `harness-planning-conventions/` | Spec + plan output → `docs/specs/`, `docs/exec-plans/active/` (never repo root or `tasks/`) |

If upstream ever ships a skill with the same folder name, local copy wins after `sync-local-agent-skills.sh`.

## Install / restore

```bash
./harness/scripts/agent/sync-local-agent-skills.sh
```

This runs automatically at the end of `./harness/scripts/agent/sync-agent-skills.sh`.

## Edit workflow

1. Edit `harness/scripts/agent/local-skills/<name>/SKILL.md` (source of truth)
2. Run `./harness/scripts/agent/sync-local-agent-skills.sh`
3. Pair with `harness/scripts/agent/local-commands/<name>.md` if there is a slash command

Do **not** edit `.cursor/skills/<local-skill>/` directly — changes are overwritten on sync.
