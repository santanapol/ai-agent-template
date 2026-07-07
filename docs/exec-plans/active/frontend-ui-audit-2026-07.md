---
status: active
created: 2026-07-07
updated: 2026-07-07
services: [backoffice, auth, gateway, staff, agent-invoice, smart-report, branch-report]
---

# Plan: Frontend UI audit — all pages & menus

## Objective

Audit backoffice UI across every routed page and sidebar menu using L0 Vitest, L1 browser runtime checks, and L2 role permission matrix; fix defects found and record data gaps separately from UI bugs.

## Page audit results (`platform_admin`)

| Page / route | Status | Notes |
|--------------|--------|-------|
| `/` Dashboard | pass | Stats load for admin; no console errors |
| `/invoices` | pass | 1 seeded invoice; branch name fixed in seed |
| `/invoices/:id` | pass | Detail + transactions load |
| `/agents` | pass | 1 agent row (777WW) |
| `/agents/:id/fees` | pass | Fee table loads |
| `/staff` | pass | Table + drawer |
| `/smart-reports` | pass | List/editor tabs |
| `/branch-report/.../channel-performance` | pass | Validation works; search needs date range aligned to seed |
| `/permissions` | pass | Menu catalog + role permissions tabs |
| `/profile` | pass | Profile + change password cards |
| `/login` | pass | Form + redirect |
| `/403`, `/404` | pass | Error pages render |
| Shell: branch switcher | pass | Visible for multi-branch roles |
| Shell: NavUser logout | pass | Clears session → `/login` |

## Role matrix (L2)

| Role | Sidebar (API menus) | Direct `/403` (browser spot-check) |
|------|---------------------|-------------------------------------|
| `platform_admin` | All menus | — |
| `branch_admin` | No Smart Reports, Permissions | `/smart-reports`, `/permissions` → 403 |
| `support_admin` | Dashboard, Staff | `/invoices` → 403 |
| `support` | Dashboard, Staff | `/invoices` → 403 |
| `staff` | Dashboard only (+ profile via NavUser) | `/staff` → 403 |

API menu keys verified for all 5 roles via `GET /auth/me/menus`.

## Bugs fixed

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| FE-001 | minor | Dashboard showed "Open Staff Management" for `staff` role (no `profiles:list`) | Gate quick action with `usePermission('profiles:list')` in `Dashboard.tsx` + regression test |
| FE-002 | minor | Invoice list showed branch `-` (`branch_name: null` in seed) | Set `branch_name` in `agent-invoice` `seed-example-data.mjs` |

## Data gaps (not UI defects)

| Item | Notes |
|------|-------|
| Channel Performance default month (Jul 2026) | Search returns empty until dates match seed (`regDateFrom` 2026-06-30 – `regDateTo` 2026-07-14) or affiliate link selected |
| Mobile nav | Not fully exercised in this pass (desktop + API matrix covered) |

## Progress log

- 2026-07-07: Boot harness `--with-frontend`, `seed-all`, `smoke` — passed
- 2026-07-07: L0 Vitest — 412 tests passed, lint warnings only, build OK
- 2026-07-07: L1 browser audit — all routes load without JS errors
- 2026-07-07: L2 role matrix — API menus + browser 403 spot-checks
- 2026-07-07: Fixed FE-001, FE-002; re-ran tests + `./scripts/ci-all.sh --skip-install --with-frontend --only smoke`

## Decision log

- 2026-07-07: No Playwright E2E added — Vitest + browser MCP audit sufficient for this round
- 2026-07-07: Channel Performance empty table with default dates classified as **data-gap**, not blocker

## Verification

```bash
cd frontend/backoffice && npm run lint && npm run test && npm run build
./scripts/ci-all.sh --skip-install --with-frontend --only smoke
```
