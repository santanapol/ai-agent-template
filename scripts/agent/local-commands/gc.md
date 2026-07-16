---
name: gc
description: Garbage collection — scan drift against golden principles, update quality score, fix stale docs
disable-model-invocation: true
---

Read and follow **code-simplification** (`.cursor/skills/code-simplification/SKILL.md`) for small targeted fixes.

Harness garbage collection for ai-agent-template. Run periodically or after large agent sessions.

## Phase 1 — Load context

When present in your fork:

1. `docs/golden-principles.md`
2. `docs/QUALITY_SCORE.md`
3. `docs/exec-plans/tech-debt-tracker.md`
4. `docs/exec-plans/active/` — note stale plans

## Phase 2 — Mechanical checks

```bash
node scripts/ci/docs-lint.mjs
```

Fix any errors before continuing.

## Phase 3 — Drift scan

| Check | Action |
|-------|--------|
| Code vs golden principles | ESLint rules at `error` when packages exist; no `console` in `src/` |
| Docs vs code | Spec paths, env names, OpenAPI vs runtime |
| Active plans > 30 days | Update or move to `completed/` |
| Tech debt tracker | Add/close rows with PR links |

Prefer **small fixes** (one concern per change). Do not large refactors in `/gc`.

## Phase 4 — Update artifacts

1. Refresh `docs/QUALITY_SCORE.md` grades if the file exists and changed
2. Update `docs/exec-plans/tech-debt-tracker.md` when present
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
