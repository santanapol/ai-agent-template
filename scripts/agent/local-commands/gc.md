---
name: gc
description: Garbage collection — scan drift against golden principles, update quality score, fix stale docs
disable-model-invocation: true
---

Read and follow **code-simplification** (`.cursor/skills/code-simplification/SKILL.md`) for small targeted fixes.

Harness garbage collection for zero-platform. Run periodically or after large agent sessions.

## Phase 1 — Load context

1. [docs/golden-principles.md](../../docs/golden-principles.md)
2. [docs/QUALITY_SCORE.md](../../docs/QUALITY_SCORE.md)
3. [docs/exec-plans/tech-debt-tracker.md](../../docs/exec-plans/tech-debt-tracker.md)
4. [docs/exec-plans/active/](../../docs/exec-plans/active/) — note stale plans

## Phase 2 — Mechanical checks

```bash
node scripts/ci/docs-lint.mjs
./scripts/ci/check-coding-standard-sync.sh   # optional — vendored vs upstream
```

Fix any errors before continuing.

## Phase 3 — Drift scan

| Check | Action |
|-------|--------|
| Code vs golden principles | ESLint harness rules at `error`; no `console` in `src/` |
| Docs vs code | Spec paths, env names, OpenAPI vs runtime |
| `spec:consistency` coverage | When touching OpenAPI, add integration test per service `TESTING.md`; re-audit quarterly (see `docs/exec-plans/completed/SPEC-CODE-AUDIT-2026-07-03.md`) |
| Active plans > 30 days | Update or move to `completed/` |
| Tech debt tracker | Add/close rows with PR links |
| `coding-standard/` drift | Run `scripts/ci/check-coding-standard-sync.sh` after upstream edits |

Prefer **small fixes** (one concern per change). Do not large refactors in `/gc`.

## Phase 4 — Update artifacts

1. Refresh [docs/QUALITY_SCORE.md](../../docs/QUALITY_SCORE.md) grades if changed
2. Update [docs/exec-plans/tech-debt-tracker.md](../../docs/exec-plans/tech-debt-tracker.md)
3. Move finished plans to `docs/exec-plans/completed/`

## Phase 5 — Report

```markdown
## GC Report — YYYY-MM-DD

### Fixed
- ...

### Warnings (deferred)
- ...

### Quality score changes
- domain: B → B+
```

## Related Coding Standards

- `coding-standard/backend/13-code-quality.md`
- `coding-standard/auth/13-code-quality.md`
- `coding-standard/gateway/11-code-quality.md`
