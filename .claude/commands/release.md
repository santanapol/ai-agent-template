---
name: release
description: After ship GO — version, CHANGELOG, release notes, docs-lint, PR, git tag after smoke (no ci-all)
disable-model-invocation: true
---

Read and follow **release-notes-and-handoff** (`.claude/skills/release-notes-and-handoff/SKILL.md`) **completely**.

Prerequisite: **`/ship` GO**. Do **not** re-run `./scripts/ci-all.sh` here.

## Quick flow

```
/ship (GO)
  → /release
      1. Pick platform version (vX.Y.Z) — semver in CHANGELOG
      2. docs/releases/YYYY-MM-DD-user.md + *-deploy.md (title includes version)
      3. Update CHANGELOG.md [Unreleased] → [X.Y.Z]
      4. Human confirm
      5. node scripts/docs-lint.mjs
      6. commit → push → update PR
      7. merge → deploy → smoke
      8. ./scripts/release-tag.sh vX.Y.Z   ← after smoke only
```

## Harness gate (this phase only)

```bash
node scripts/docs-lint.mjs
```

If code changed after `/ship` → re-run `/ship`, not `/release` alone.

See [CHANGELOG.md](../../CHANGELOG.md), [docs/releases/README.md](../../docs/releases/README.md), [backend/ENV.md](../../backend/ENV.md).

## Skip when

≤2 files, no auth/env/deploy impact — PR description only.

## Related Coding Standards

- `coding-standard/backend/09-operations-and-deployment.md`
- `coding-standard/auth/09-operations-and-deployment.md`
- `coding-standard/gateway/09-operations-and-deployment.md`
- `coding-standard/frontend/backoffice/09-operations-and-deployment.md`
