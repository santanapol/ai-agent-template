# Spec: backoffice-next

**Status:** Production (cutover from `frontend/backoffice` Vite app, legacy removed 2026-07-08)
**Path:** `frontend/backoffice-next`
**Coding standard:** [`coding-standard/frontend/backoffice/`](../../../../coding-standard/frontend/backoffice/) — stack, routing, state, auth, styling, code quality

## What it is

Back-office admin UI for zero-platform — login, staff/permission management, agent fees/invoices, smart reports, branch-report marketing views. Talks to **auth** (`/auth/*`) and **gateway** (`/api/*`) through Next.js `rewrites()` (`next.config.mjs`), same-origin from the browser's point of view.

## Routes (parity with legacy, confirmed in migration cutover)

| Route | Notes |
|-------|-------|
| `/login` | |
| `/` | Dashboard |
| `/profile` | |
| `/staff` | |
| `/permissions` | |
| `/agents`, `/agents/:id/fees` | |
| `/smart-reports` | |
| `/branch-report/channel-performance` | |
| `/invoices`, `/invoices/:id` | |
| `/403`, `/404`, `/500` | Error routes — see `coding-standard/frontend/backoffice/08-error-handling.md` |

## Related

- Migration plan (completed — v0.5.0; post-deploy UAT still open): [`docs/exec-plans/completed/backoffice-next-migration.md`](../../../exec-plans/completed/backoffice-next-migration.md)
- UI/UX review: [`frontend/backoffice-next/docs/UI-UX-REVIEW-2026-07-07.md`](../../../../frontend/backoffice-next/docs/UI-UX-REVIEW-2026-07-07.md)
- Staging UAT: [`frontend/backoffice-next/docs/STAGING-UAT-2026-07-08.md`](../../../../frontend/backoffice-next/docs/STAGING-UAT-2026-07-08.md)

## Gaps (tracked in `docs/QUALITY_SCORE.md`)

- No E2E suite yet (Vitest + component tests only)
- No `business-domain.md`/`database-erd.md`/`WORKFLOW.md` yet — this app has no own database, so the backend service specs (`docs/specs/backend/<service>/`) remain the source of truth for domain rules; add here only if frontend-specific business logic emerges that isn't already covered there
