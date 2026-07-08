---
name: release-notes-and-handoff
description: After ship GO — version bump, CHANGELOG, user/deploy release notes, docs-lint, PR, and post-deploy git tag. Does not re-run ci-all (/ship already did).
---

# Release Notes and Handoff

## Overview

Bridge between **quality gate** (`/ship` GO) and **merge/deploy**. Produce versioned handoff: platform semver in [CHANGELOG.md](../../../CHANGELOG.md), two notes in `docs/releases/`, then **git tag after deploy smoke passes**.

**Does not replace** `shipping-and-launch` or production deploy. **Does not** auto-deploy. **Does not re-run** `./scripts/ci/ci-all.sh`.

## Version model (this monorepo)

| Layer | Where | When to bump |
|-------|--------|--------------|
| **Platform snapshot** | Root [CHANGELOG.md](../../../CHANGELOG.md) + git tag `v0.x.x` | Every meaningful `/release` (staging or prod) |
| **Per-service semver** | `backend/*/package.json`, OpenAPI `info.version` | Only when that service's API contract changes |
| **Handoff docs** | `docs/releases/YYYY-MM-DD-*.md` | Every `/release`; filename = date, header = platform version |

Read **Release & Versioning** in `git-workflow-and-versioning` for semver rules (breaking → major, feature → minor, fix → patch).

---

## When to Use / Skip

**Use:** After `/ship` GO on a meaningful change set.

**Skip:** ≤2 files, no auth/env/deploy impact — PR description only.

---

## Phase 1 — Gather context

1. `git status` and `git diff` vs `main`
2. Active exec plan in `docs/exec-plans/active/`
3. Touched services — deploy note
4. [backend/ENV.md](../../../backend/ENV.md) when env/harness changed
5. `gh pr view` — PR exists or create new
6. **Current platform version:** latest `[x.y.z]` in [CHANGELOG.md](../../../CHANGELOG.md) (today: read `## [Unreleased]` and last released section)

---

## Phase 2 — Decide platform version

Pick the **next** platform semver (not per-service unless API spec changed):

| Change type | Bump | Example |
|-------------|------|---------|
| Breaking API/env for consumers | **MAJOR** | `0.4.0` → `1.0.0` |
| New backward-compatible feature | **MINOR** | `0.3.0` → `0.4.0` |
| Bugfix, ops, docs-only deploy | **PATCH** | `0.4.0` → `0.4.1` |

Record in deploy note:

- `Platform version: v0.4.0`
- `Merge commit:` (after merge) or `PR branch HEAD:` (before merge)

Bump **per-service** `package.json` / OpenAPI only for services whose public API changed in this release.

---

## Phase 3 — Write release notes + CHANGELOG

### Files

```
docs/releases/YYYY-MM-DD-user.md
docs/releases/YYYY-MM-DD-deploy.md
```

If a pair exists for that date, use `-2` suffix on the stem.

### User note (`*-user.md`)

```markdown
# Release v0.4.0 — 2026-07-07

## สรุป
...

## สิ่งที่ใหม่
- ...

## ผู้ใช้ต้องทำอะไร
- ...
```

### Deploy note (`*-deploy.md`)

```markdown
# Deploy v0.4.0 — 2026-07-07

## Version
| | |
|---|---|
| **Platform** | `v0.4.0` |
| **Git tag** | `v0.4.0` (after post-deploy smoke) |
| **Merge commit** | `<sha>` (fill after merge) |
| **Previous tag** | `v0.3.0` |

## สรุป
...

## Rollback
git fetch origin && git reset --hard <previous-tag-or-sha> && bash scripts/staging/deploy-staging.sh
```

### CHANGELOG.md

Move content from `## [Unreleased]` into a new section:

```markdown
## [Unreleased]

## [0.4.0] - 2026-07-07

### Added
- ...

### Changed
- ...

### Fixed
- ...
```

Link to handoff: `Handoff: docs/releases/2026-07-07-user.md, docs/releases/2026-07-07-deploy.md`

**Rules:** No secrets. Reference [backend/ENV.md](../../../backend/ENV.md). PM2 names from [ecosystem.config.js](../../../backend/ecosystem.config.js).

---

## Phase 4 — Human confirmation (required)

Present version choice, CHANGELOG entry, and both notes. **Stop** until approved.

---

## Phase 5 — Docs validation

```bash
node scripts/ci/docs-lint.mjs
```

Do **not** re-run `ci-all` unless code changed after `/ship`.

---

## Phase 6 — Commit and PR

| Situation | Stage |
|-----------|--------|
| Code already on branch | `CHANGELOG.md`, `docs/releases/*.md`, exec-plan moves |
| Code uncommitted | Named paths only — never `git add .` |

### Commit message

```
docs(release): v0.4.0 handoff notes and changelog

Platform release after ship GO. Tag v0.4.0 after staging smoke passes.
```

### PR body

```markdown
## Summary
- ...

## Release
- Version: **v0.4.0**
- User: docs/releases/YYYY-MM-DD-user.md
- Deploy: docs/releases/YYYY-MM-DD-deploy.md
- Changelog: CHANGELOG.md

## Test plan
- [x] `/ship` (ci-all + smoke)
- [x] `node scripts/ci/docs-lint.mjs`
```

---

## Phase 7 — Post-deploy git tag (after smoke)

**Only after** target environment smoke passes (e.g. `bash scripts/staging/smoke-staging.sh`). Do not tag at PR open time.

```bash
# On merge commit (main)
git fetch origin main
git checkout main && git pull
MERGE_SHA=$(git rev-parse HEAD)

# Annotated tag — source of truth
git tag -a v0.4.0 "$MERGE_SHA" -m "Release v0.4.0 — 2026-07-07"
git push origin v0.4.0
```

Or use helper:

```bash
./scripts/release/release-tag.sh v0.4.0
```

Update deploy note with final `Merge commit:` SHA if not filled earlier.

---

## Phase 8 — Close exec plan (if applicable)

Move `docs/exec-plans/active/<plan>.md` → `completed/`, `status: completed`.

---

## Red flags

- Tag before deploy smoke passes
- Platform version in notes but not in CHANGELOG
- Hand-editing version in files without matching git tag
- Re-running `ci-all` here without re-running `/ship`
- Secrets in release docs

## Verification checklist

- [ ] Platform version chosen (semver) and in both release notes + CHANGELOG
- [ ] Per-service bumps only where API changed
- [ ] Human approved
- [ ] `node scripts/ci/docs-lint.mjs` pass
- [ ] PR links version + notes + CHANGELOG
- [ ] After deploy smoke: `git tag vX.Y.Z` pushed
- [ ] Deploy note records merge SHA and previous tag
