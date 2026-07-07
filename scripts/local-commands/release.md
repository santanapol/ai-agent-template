---
name: release
description: After ship GO — write user + deploy release notes, confirm, docs-lint, commit and open or update PR (no ci-all repeat)
disable-model-invocation: true
---

Read and follow **release-notes-and-handoff** (`.cursor/skills/release-notes-and-handoff/SKILL.md`) **completely**.

Prerequisite: **`/ship` GO** (or user explicitly accepts risk). Code quality already verified by `/ship` — **do not re-run** `./scripts/ci-all.sh` here.

## Quick flow

```
/ship (GO)
  → /release
      1. docs/releases/YYYY-MM-DD-user.md + *-deploy.md
      2. Human confirm
      3. node scripts/docs-lint.mjs
      4. commit → push → gh pr create OR update existing PR
      5. close exec plan if applicable
```

## Harness gate (this phase only)

```bash
node scripts/docs-lint.mjs
```

If code changed after `/ship` → re-run `/ship`, not `/release` alone.

See [AGENTS.md](../../AGENTS.md), [backend/ENV.md](../../backend/ENV.md), [backend/RUNBOOK.md](../../backend/RUNBOOK.md).

## Skip when

≤2 files, no auth/env/deploy impact — PR description only.

## Related Coding Standards

- `coding-standard/backend/09-operations-and-deployment.md`
- `coding-standard/auth/09-operations-and-deployment.md`
- `coding-standard/gateway/09-operations-and-deployment.md`
- `coding-standard/frontend/backoffice/09-operations-and-deployment.md`
