---
status: completed
created: 2026-07-06
updated: 2026-07-08
completed: 2026-07-08
release: v0.5.0
services: [backoffice-next, auth, gateway, staff, agent-invoice, smart-report, branch-report]
---

# Backoffice Next.js migration (completed)

**Status:** Shipped to staging — platform **v0.5.0** (2026-07-08)  
**Template:** `coding-standard/frontend/backoffice/reference/studio-admin` v2.2.0  
**Legacy:** `frontend/backoffice` (Vite) — **removed 2026-07-08**

Post-release follow-up (ops, not blocking tag):

- [ ] Staging nginx applied on server (verify after deploy)
- [ ] Manual UAT sign-off — [`STAGING-UAT-2026-07-08.md`](../../../frontend/backoffice-next/docs/STAGING-UAT-2026-07-08.md)

## Route parity checklist

| Route | Status |
|-------|--------|
| `/login` | done |
| `/` (dashboard) | done |
| `/profile` | done |
| `/staff` | done |
| `/permissions` | done |
| `/agents` | done |
| `/agents/:id/fees` | done |
| `/smart-reports` | done |
| `/branch-report/marketing/channel-performance` | done |
| `/invoices` | done |
| `/invoices/:id` | done |
| `/403`, `/404`, `/500` | done |

## Cutover gates

- [x] `npm run build` in `frontend/backoffice-next`
- [x] PM2 `zero-backoffice` in `ecosystem.factory.js`
- [x] `deploy-staging.sh` builds Next app
- [x] CI job `frontend-next-checks`
- [x] Staging nginx config documented (`dev-ops/staging/RUNBOOK.md` §6 → `:3005`)
- [ ] Staging nginx applied on server (verify after deploy)
- [ ] Manual UAT — [`STAGING-UAT-2026-07-08.md`](../../../frontend/backoffice-next/docs/STAGING-UAT-2026-07-08.md)

## Phase 6 polish checklist (2026-07-08)

- [x] 6A0 — Studio reference pins (`REFERENCE-PINS.md`)
- [x] 6A — Shared toolkit (`list-page/`, `data-table/`, `pagination.tsx`)
- [x] 6B — All list pages on toolkit (Staff pilot with List/Grid)
- [x] 6C — Agent fees + Invoice detail polish
- [x] 6D — Non-list pages off legacy `PageContainer` double chrome (Permissions, Profile, Editor, Dashboard)
- [x] 6E — UI-UX-REVIEW §3/§4 update; removed `FiltersContainer` + unused `demo/data-table.tsx`; exec plan front matter
- [x] 6F — `npm test` (418) + `npm run build` + Biome lint 0 errors; harness `ci-all`

## Architecture

```
nginx → /api,/auth → gateway:3000
nginx → / → PM2 zero-backoffice:3005 (Next.js)
```
