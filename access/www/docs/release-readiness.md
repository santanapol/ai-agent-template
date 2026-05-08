# Release Readiness Checklist (MVP)

## Scope Covered

- Branch-scoped `members` direct management (`create/edit/remove`) without `invite/signup`
- Branch-scoped `billing` and `dashboard` slices with role-aware access
- Frontend route skeleton (`React + TypeScript + Vite + React Router`) with guard policies
- DocuForge-aligned visual baseline in shell and core pages

## QA Checklist

- [x] Role matrix integration tests pass for `owner/admin/manager/member/billing`
- [x] Tenant scope checks block cross-OU and cross-branch access where required
- [x] Billing manage permission limited to `owner/admin` and read available per policy
- [x] Dashboard visibility behavior verified for `billing` (full) and `member` (limited)
- [x] Frontend lint/build pass for route skeleton and role-aware slices
- [x] Backend lint/tests pass after new modules and policy checks
- [x] OpenAPI member contract already locked from Contract Foundation phase

## Time Metrics Verification

- [x] Automated p95 check added for key API paths:
  - `GET /api/v1/ou/{ouId}/branches/{branchId}/dashboard/summary`
  - `GET /api/v1/ou/{ouId}/branches/{branchId}/members`
- [x] Threshold asserted in test at `p95 < 400ms` for both endpoints

## Release Notes (Draft)

### Added

- New backend modules:
  - `members` (list/create/update/remove)
  - `billing` (plan read/update, invoices read)
  - `dashboard` (summary with role-based visibility)
- End-to-end role matrix integration test suite
- API latency p95 verification test suite
- New frontend app at `access/www/app` with guard-based IA routes
- Members/Billing/Dashboard UI slices wired to backend APIs
- DocuForge baseline styling tokens and component variants

### Changed

- `reference` app routing now includes:
  - `/api/v1/ou/:ouId/branches/:branchId/members`
  - `/api/v1/ou/:ouId/branches/:branchId/billing`
  - `/api/v1/ou/:ouId/branches/:branchId/dashboard`

### Risks / Follow-ups

- Frontend currently uses session header simulation for development; production wiring to gateway session context remains required.
- Reports module remains menu-level placeholder by current scope decision.
