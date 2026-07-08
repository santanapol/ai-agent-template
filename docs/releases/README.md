# Release notes

Handoff documents from `/release` ([release-notes-and-handoff](../../scripts/agent/local-skills/release-notes-and-handoff/SKILL.md)) after `/ship` GO.

| Artifact | Purpose |
|----------|---------|
| `CHANGELOG.md` (repo root) | Platform semver snapshot — consumer-facing summary |
| `docs/releases/YYYY-MM-DD-user.md` | End users, support, PM |
| `docs/releases/YYYY-MM-DD-deploy.md` | Ops — env, deploy, rollback, merge SHA |
| Git tag `vX.Y.Z` | Immutable release point (after deploy smoke) |

**Versioning:** Filename uses **date**; document title uses **platform version** (`v0.4.0`). Tag is created **after** staging/prod smoke — see `scripts/release/release-tag.sh`.

Quality gates (`ci-all`, smoke) run at **`/ship`** — `/release` runs `docs-lint` only.

Do not store secrets in these files.
