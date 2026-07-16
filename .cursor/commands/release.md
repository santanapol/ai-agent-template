---
name: release
description: After ship GO — version, release notes, docs-lint, PR, git tag after smoke
disable-model-invocation: true
---

Read and follow **release-notes-and-handoff** (`.cursor/skills/release-notes-and-handoff/SKILL.md`) **completely**.

Prerequisite: **`/ship` GO**.

## Quick flow

```
/ship (GO)
  → /release
      1. Pick version (vX.Y.Z)
      2. docs/releases/YYYY-MM-DD-user.md + *-deploy.md
      3. Optional: update CHANGELOG.md if the project uses one
      4. Human confirm
      5. node scripts/ci/docs-lint.mjs
      6. commit → push → update PR
      7. merge → deploy → smoke
      8. git tag vX.Y.Z after smoke passes
```

## Harness gate (this phase only)

```bash
node scripts/ci/docs-lint.mjs
```

If code changed after `/ship` → re-run `/ship`, not `/release` alone.

Create `docs/releases/` on first release.

## Skip when

≤2 files, no auth/env/deploy impact — PR description only.
