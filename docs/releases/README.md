# Release notes

Handoff documents created by `/release` ([release-notes-and-handoff](../../scripts/local-skills/release-notes-and-handoff/SKILL.md)) after `/ship` GO.

Quality gates (`ci-all`, smoke) run at **`/ship`** — `/release` only adds these docs and runs `docs-lint`.

| File pattern | Audience |
|--------------|----------|
| `YYYY-MM-DD-user.md` | End users, support, PM |
| `YYYY-MM-DD-deploy.md` | Developers, ops (env, restart, rollback) |

**After merge:** copy or link the user note for announcements; follow the deploy note on production.

Do not store secrets in these files.
