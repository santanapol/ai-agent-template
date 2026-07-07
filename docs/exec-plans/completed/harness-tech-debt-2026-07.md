---
status: completed
created: 2026-07-06
updated: 2026-07-06
services: [auth, gateway, staff, agent-invoice, smart-report, branch-report, backoffice]
---

# Plan: Harness tech debt cleanup (TD-001–TD-008)

## Objective

Close all rows in `docs/exec-plans/tech-debt-tracker.md`: full dev boot for mesh services, observability end-to-end, ESLint harness rules at error, frontend naming compliance, coding-standard zero-pad sync, and ongoing process for TD-001–003.

## Progress log

- 2026-07-06: Plan created.
- 2026-07-06: TD-006 — dev-up boots agent-invoice, smart-report, branch-report; smoke healthz + metrics.
- 2026-07-06: TD-004 — `/metrics` on invoice/report services; scrape targets; LOG_PRETTY=false staff; observability docs.
- 2026-07-06: TD-005 — ESLint harness `error` all services; auth/staff service splits.
- 2026-07-06: TD-007 — frontend/backoffice naming (412 tests pass).
- 2026-07-06: TD-008 — zero-pad coding-standard upstream + vendored; links fixed.
- 2026-07-06: TD-001 mitigated, TD-002 wontfix, TD-003 closed (`check-coding-standard-sync.sh`).

## Tasks

- [x] TD-006 — Wire agent-invoice, smart-report, branch-report in dev-up/down/smoke
- [x] TD-004 — /metrics, scrape targets, JSON logs, observability docs
- [x] TD-005 — Promote ESLint harness rules (tier1 → gateway → staff → auth)
- [x] TD-007 — Frontend naming (folders → index pages → components)
- [x] TD-008 — Zero-pad coding-standard upstream + sync
- [x] TD-001–003 — Ongoing processes (/gc, GHA note, sync script)
- [x] Close tracker rows + QUALITY_SCORE

## Risks (residual)

- branch-report DB `gpp_777ww` has no harness seed — smoke limited to healthz (tracked in QUALITY_SCORE P2)
