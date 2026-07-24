# Local agent skills (ai-agent-template)

Skills here are **not** in upstream [agent-skills](https://github.com/addyosmani/agent-skills). They are copied into `.cursor/skills/` after every sync so they are not deleted by `rsync --delete`.

| Path | Skill / command |
|------|-----------------|
| `harness-bootstrap/` | First-boot interview + setup after clone (`/setup`) |
| `release-notes-and-handoff/` | Release handoff after `/ship` — user + deploy notes, docs-lint, PR |
| `harness-planning-conventions/` | Spec + plan output → `docs/specs/`, `docs/exec-plans/active/` (never repo root or `tasks/`) |
| `testcase-authoring/` | Portable testcase docs: stub / deep / bug-hunt (`/testcase-author`) |
| `testcase-execution/` | Run scenario rows; write Result / reports (`/testcase-run`) |
| `qa-cycle/` | Portable QA orchestration through QA Gate (`/qa`) — discover per repo |
| `reverse-engineer-contracts/` | As-built contracts from code (`/reverse-contracts`) — pairs with `/qa` docs-review |

Local personas (not skills): `harness/scripts/agent/local-agents/` → `.cursor/agents/` via `sync-local-agents.sh` (e.g. `qa-contracts-auditor`).

If upstream ever ships a skill with the same folder name, local copy wins after `sync-local-agent-skills.sh`.

## Install / restore

```bash
./harness/scripts/agent/sync-local-agent-skills.sh
./harness/scripts/agent/sync-local-agents.sh
```

Both run automatically from `./harness/scripts/agent/sync-agent-skills.sh` (skills after command sync; agents after upstream agents rsync).

## Edit workflow

1. Edit `harness/scripts/agent/local-skills/<name>/SKILL.md` (source of truth)
2. Run `./harness/scripts/agent/sync-local-agent-skills.sh`
3. Pair with `harness/scripts/agent/local-commands/<name>.md` if there is a slash command
4. Local personas: edit `local-agents/*.md` then `./harness/scripts/agent/sync-local-agents.sh`

Do **not** edit `.cursor/skills/<local-skill>/` or `.cursor/agents/<local-persona>.md` as SoT — changes are overwritten on sync.
