---
status: completed
created: 2026-07-15
updated: 2026-07-15
services: []
---

# Plan: Repo template-ready cleanup

## Objective

Remove orphan directories and convention drift (`code-base/`, tracked `tasks/`, legacy Vite `frontend/backoffice`, `_mission-control/` beside code) so the repository skeleton matches harness zones and can serve as a future template. Freeze conventions in `docs/TEMPLATE.md` with CI gates.

## Progress log

- 2026-07-15: Plan created from template cleanup review; execution started.
- 2026-07-15: Completed — archived tasks, relocated mission specs, removed Vite archive, added TEMPLATE.md + docs-lint gates, wired harness planning override skill.

## Decision log

- 2026-07-15: Durable plans = `docs/exec-plans/` only; `tasks/` gitignored as ephemeral agent scratch.
- 2026-07-15: Remove `frontend/backoffice` again — recover from git history (`6a3353b`) if needed.

## Tasks

- [x] Archive `tasks/plan.md` + `tasks/todo.md` → `completed/deposit-matrix-ship-fixup-2026-07.md`
- [x] Gitignore `tasks/`; update `docs/exec-plans/README.md`
- [x] Relocate `_mission-control` specs into service `docs/`; fix links
- [x] `git rm -r frontend/backoffice`; delete empty `code-base/`
- [x] Add `docs/TEMPLATE.md` + wire AGENTS/docs/harness README
- [x] docs-lint gates for `_mission-control/` and tracked `tasks/*`
- [x] Verify docs-lint + grep sweep; update QUALITY_SCORE

## Risks

- Link blast in service docs after `_mission-control` moves — mitigated with grep + manual link fixes.
