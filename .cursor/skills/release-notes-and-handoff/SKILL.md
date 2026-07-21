---
name: release-notes-and-handoff
description: >-
  Produces versioned release handoff after /ship GO — user notes, deploy notes
  under docs/releases/, docs-lint, PR, and git tag after deploy smoke. Use when
  the user invokes /release, asks for release notes, or needs handoff after a
  ship go decision.
---

# Release Notes and Handoff

## Overview

Bridge between **quality gate** (`/ship` GO) and **merge/deploy**. Produce versioned handoff: two notes in `docs/releases/`, then **git tag after deploy smoke passes**.

**Does not replace** `shipping-and-launch` or production deploy. **Does not** auto-deploy.

Create `docs/releases/` when you run your first `/release`. Add root `CHANGELOG.md` only if your project tracks semver there.

## Version model

| Layer | Where | When to bump |
|-------|--------|--------------|
| **Project snapshot** | git tag `v0.x.x` (+ optional `CHANGELOG.md`) | Every meaningful `/release` |
| **Handoff docs** | `docs/releases/YYYY-MM-DD-*.md` | Every `/release`; filename = date, header = version |

Read **Release & Versioning** in `git-workflow-and-versioning` for semver rules.

---

## When to Use / Skip

**Use:** After `/ship` GO on a meaningful change set.

**Skip:** ≤2 files, no env/deploy impact — PR description only.

---

## Phase 1 — Gather context

1. `git status` and `git diff` vs `main`
2. Active exec plan in `docs/exec-plans/active/` (if any)
3. Touched services under configured code zones (`harness.config.yaml`) — deploy note
4. `gh pr view` — PR exists or create new
5. **Current version:** latest git tag or `CHANGELOG.md` entry if the project uses one

---

## Phase 2 — Decide version

Pick the **next** semver:

| Change type | Bump | Example |
|-------------|------|---------|
| Breaking API/env for consumers | **MAJOR** | `0.4.0` → `1.0.0` |
| New backward-compatible feature | **MINOR** | `0.3.0` → `0.4.0` |
| Bugfix, ops, docs-only deploy | **PATCH** | `0.4.0` → `0.4.1` |

---

## Phase 3 — Write release notes

### Files

```
docs/releases/YYYY-MM-DD-user.md
docs/releases/YYYY-MM-DD-deploy.md
```

### User note (`*-user.md`)

Summary, what's new, what users must do.

### Deploy note (`*-deploy.md`)

Version table, rollback steps, merge commit SHA after merge.

### Optional CHANGELOG.md

If the project maintains one, move `## [Unreleased]` into `## [x.y.z] - YYYY-MM-DD`.

**Rules:** No secrets.

---

## Phase 4 — Human confirmation (required)

Present version choice and both notes. **Stop** until approved.

---

## Phase 5 — Docs validation

```bash
node harness/scripts/ci/docs-lint.mjs
```

---

## Phase 6 — Commit and PR

Stage `docs/releases/*.md`, optional `CHANGELOG.md`, exec-plan moves only — never `git add .`

---

## Phase 7 — Post-deploy git tag (after smoke)

**Only after** target environment smoke passes.

```bash
git fetch origin main
git checkout main && git pull
git tag -a v0.4.0 "$(git rev-parse HEAD)" -m "Release v0.4.0 — 2026-07-07"
git push origin v0.4.0
```

---

## Phase 8 — Close exec plan (if applicable)

Move `docs/exec-plans/active/<plan>.md` → `completed/`, `status: completed`.

---

## Red flags

- Tag before deploy smoke passes
- Secrets in release docs
