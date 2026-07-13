# Changelog

All notable changes to this repository are recorded here. Each deployable service keeps its own SemVer in `package.json`; release notes below group changes by **repository snapshot**. For line-level history per service, see:

- `backend/auth/CHANGELOG.md`
- `backend/gateway/CHANGELOG.md`
- `backend/service/demo-service/CHANGELOG.md`
- `backend/service/staff/` package docs
- `docs/specs/` for agent-invoice, smart-report, and branch-report

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) per service `package.json` / OpenAPI `info.version` where applicable.

## [Unreleased]

## [0.7.0] - 2026-07-13

Repository snapshot: **Deferred TD closeout** — batch invoice API + FE bulk export, Smart Report drawer server pagination, schedule.frequency index (code), CI baseline validator sync, orphan fee ops runbook.

Handoff: [docs/releases/2026-07-13-2-user.md](docs/releases/2026-07-13-2-user.md), [docs/releases/2026-07-13-2-deploy.md](docs/releases/2026-07-13-2-deploy.md). Git tag: `v0.7.0` (after staging smoke).

### Added

- **agent-invoice** — `GET /api/v1/invoices/batch?ids=&include=transactions` (max 50 IDs, tenancy scope, partial `missing[]`); OpenAPI + spec + integration tests (PR #66).
- **backoffice-next** — `getInvoicesBatch()`; bulk export single HTTP fetch then in-memory PDF/XLSX build (PR #67).
- **ops** — `scripts/ops/audit-orphan-agent-fees.mjs`; [agent-fees-orphan-cleanup-2026-07-13](docs/ops/agent-fees-orphan-cleanup-2026-07-13.md) (PR #64).
- **smart-report** — `IDX_REPORTS_SCHEDULE_FREQUENCY`; ops handoff [smart-report-schedule-frequency-index-2026-07-13](docs/ops/smart-report-schedule-frequency-index-2026-07-13.md) (PR #65).

### Changed

- **backoffice-next** — Smart Report download history drawer uses `useServerDataTable` with page 2+ API refetch (PR #68).
- **prod baseline** — sync `auth_users`, `staff_profiles`, `reports` validators with harness registry (PR #69).
- **agent-invoice** service/OpenAPI version `1.1.0` → `1.2.0`.

### Fixed

- GHA `Harness schema verify` on `main` after audit follow-up validator drift (PR #69).

### Deferred / human ops

- **TD-027** — apply `createIndex` on staging/prod per ops doc.
- **TD-018** — orphan fee delete staging → prod; close tracker after confirm.
- **TD-035** opened — Smart Report mount `listHistory(limit=100)` enrichment → embed `lastRun` in list API.

## [0.6.0] - 2026-07-13

Repository snapshot: **backoffice-next UX/shadcn DS** — Smart Report editor v2 + list server filters, staff profile pages (optional email/tel), shared list-page chrome, permission/invoice/agent polish; backend support in smart-report, staff, agent-invoice.

Handoff: [docs/releases/2026-07-13-user.md](docs/releases/2026-07-13-user.md), [docs/releases/2026-07-13-deploy.md](docs/releases/2026-07-13-deploy.md). Git tag: `v0.6.0` (after staging smoke).

### Added

- **Smart Report editor v2** — dedicated routes `/smart-reports/new`, `/smart-reports/:id/edit`; `useSmartReportEditor` hook; script validate/test gate before save.
- **Smart Report list** — server-side search/filters; download-history drawer; `formatLastRunDisplay`, `downloadHistoryColumns`.
- **Staff profile pages** — `/staff/new`, `/staff/:id`, `/staff/:id/edit`; `staffProfileForm` contact normalization; optional email/tel on create/patch.
- **Invoice** — `resolveInvoiceAmountDue` shared util; PDF/XLSX export; `?return=` list back-navigation; currency on detail from agent-invoice.
- **Layout** — real `<Link>` in `NavMain`/Dashboard; `PermissionGuard` on new routes; `routeGuardMatrix` tests.
- **Tests** — `useSmartReportEditor.test.ts`, expanded smart-report/staff/invoice integration coverage; **547** Vitest tests in backoffice-next.

### Changed

- List-page toolkit alignment across Staff, Agents, Invoices, Smart Reports, Channel Performance, Permissions.
- Permission admin — toolbar Save per tab; role save dialog; wildcard mapping notice restored.
- Branch switcher — inactive branches selectable; channel performance export gated until search.
- Removed `next-themes`; in-repo `ThemeContext`.
- Coding standards synced to backoffice-next reality (`01-tech-stack.md`).

### Fixed

- Branch review findings (FE-BR-001–012): `Link` children optional, drawer stale-response guard, UTC overdue badge, tabpanel ARIA, keyboard nav dropdown, build/type errors in `staffProfileForm`.
- TD-026 test harness (SidebarProvider, AdminLayout Dashboard link).
- Smart-report sandbox projection for test-run preview; staff normalize null contacts.
- Agent-invoice get-detail currency resolution; update-status error paths.

### Removed

- Dead export `ribbonColor` (invoice utils); unused `SmartReportEditor` `mode` prop.

## [0.5.0] - 2026-07-08

Repository snapshot: **backoffice-next staging cutover** — Next.js backoffice on PM2 `zero-backoffice` (`:3005`), legacy Vite `frontend/backoffice` removed, ship hardening (API error copy, SmartReport server pagination, invoice URL filters, security headers, expanded tests).

Handoff: [docs/releases/2026-07-08-user.md](docs/releases/2026-07-08-user.md), [docs/releases/2026-07-08-deploy.md](docs/releases/2026-07-08-deploy.md). Git tag: `v0.5.0` (after staging smoke).

### Added

- **`frontend/backoffice-next/`** — full route parity (staff, agents, invoices, smart-reports, permissions, branch-report, profile); Phase 6 list-page toolkit; 418 Vitest tests.
- **`docs/specs/frontend/backoffice-next/backoffice-next-spec.md`** — product spec for Next app.
- **`frontend/backoffice-next/docs/DEPENDENCY-AUDIT-EXCEPTIONS.md`** — documented `xlsx` audit exception.
- **`src/lib/branchReportMessages.ts`** — fixed user-facing branch-report error copy.
- Next.js **security headers** in `next.config.mjs`; cookie `SameSite=Lax` + `Secure` on HTTPS.

### Changed

- Harness, CI, deploy/smoke scripts, coding standards, and docs target **backoffice-next** only; removed `frontend-checks` GHA job for Vite app.
- SmartReport — enrichment history loaded once; reports/history paginated separately; list search disabled until API supports it.
- Invoice list — bidirectional URL filter sync with debounced search; toolbar export gated on `invoices:read`.
- Auth — menu fetch failure clears menus (`menuError`); `switchBranch` AUTH_NOT_READY uses shared `refreshFn`.

### Fixed

- Review/ship findings: Biome lint 0 errors, native CSV export, lazy bulk export modals, `apiErrorMessage` hardening, SmartReport pagination tests.
- Smart report run failure — fixed toast (no raw `record.error`); download filename sanitization.

### Removed

- **`frontend/backoffice/`** — deprecated Vite backoffice (entire tree).

## [0.4.0] - 2026-07-07

Repository snapshot: **auth-owned branch list**, backoffice switcher migration, **`.env.harness`** harness refactor, env naming (`GATEWAY_SHARED_SECRET`, `MONGODB_URI_READ`), staging deploy/smoke tooling, `/release` versioning workflow.

Handoff: [docs/releases/2026-07-07-user.md](docs/releases/2026-07-07-user.md), [docs/releases/2026-07-07-deploy.md](docs/releases/2026-07-07-deploy.md). Git tag: `v0.4.0`.

### Added

- **`GET /auth/me/branches`** — OU-scoped branch list for switch-capable roles; backoffice switcher uses auth instead of agent-invoice.
- **Harness env:** `backend/<service>/.env.harness` (replaces `0/env/*`); [backend/ENV.md](backend/ENV.md), `scripts/env-status.mjs`.
- **Staging ops:** `deploy-staging.sh`, `setup-staging.sh`, `staging-init-env.sh`, `staging-seed-all.sh`, `staging-verify-env.sh`, `smoke-staging.sh`, `release-tag.sh`; [server-environment/staging/RUNBOOK.md](server-environment/staging/RUNBOOK.md).
- **`/release` skill** — platform semver, CHANGELOG, handoff notes, post-deploy git tag.
- **Auth:** `branches-list.integration.test.js`; platform-branches config extraction.

### Changed

- **Env naming:** `GATEWAY_SHARED_SECRET`, `MONGODB_URI_READ` across services; auth keeps `DATABASE_URI`.
- **Backoffice:** `AUTH_NOT_READY` retry on branch switch; Branch Report menu hierarchy (Channel Performance under Branch Report).
- **branch-report:** default `PORT=3104` to match gateway routes.

### Fixed

- **smart-report:** block `$out` / `$merge` in script validator and runtime sandbox.
- **branch-report:** production gateway secret guard; remove legacy `GATEWAY_SECRET` fallback.
- **Staging bootstrap:** `staging-init-env.sh` patches branch-report `PORT=3104`.

## [0.3.0] - 2026-07-06

Repository snapshot: backoffice on **shadcn/ui + Tailwind v4**, business services through **branch-report**, Cursor **agent-skills** integrated, **coding-standard** vendored in-repo.

### Added

#### Agent tooling & repo docs

- **Agent-skills (Cursor):** Sync from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) into `.cursor/`, `references/`, and `scripts/sync-agent-skills.sh`; Related Coding Standards per slash command in `scripts/agent-skills-standards/`.
- **Documentation:** Four-zone repo layout in root [`README.md`](./README.md); [`docs/README.md`](./docs/README.md) and [`scripts/README.md`](./scripts/README.md) index specs vs standards vs agent tooling.
- **`coding-standard/`:** Vendored org standards (auth, gateway, backend, frontend/backoffice, software-testing) for self-contained CI and agent command references.
- **`backend/scripts/install-all-deps.sh`:** Run `npm ci` across all backend packages and frontend/backoffice.

#### Frontend — `frontend/backoffice/` (shadcn/ui + Tailwind v4)

- Rebuilt backoffice on shadcn/ui — auth, routing, permissions, invoices (bulk export / mark PAID / cancel), Smart Reports, Permission Admin, Agent Fees, Channel Performance; Vitest coverage.
- Shared layout components (`PageContainer`, `DetailContainer`, `FiltersContainer`, `PageContentCard`, `ResultTemplate`) and theme tokens (`theme/tokens.ts`, `ThemeContext`, `theme-provider`).
- Channel Performance page (`/branch-report/marketing/channel-performance`) — Royalty 21 Times search, 28-column table, invite-link dropdown.
- Header branch switcher for OU-wide roles (`platform_admin`, `support_admin`, `support`).
- Bulk invoice export (ZIP), bulk Mark PAID / Cancel from list; `PermissionGuard` and permission-driven sidebar from `GET /auth/me/menus`.
- Smart Report management UI; Agent Fees matrix UI; staff table/drawer; telephone E.164 utility.
- `.env.local.example` for dev mesh headers (tracked; copy to `.env.local`).

#### Backend — platform & services

- **`backend/service/branch-report/`** (v0.1.0): Royalty 21 Times marketing report, OpenAPI, gateway route `/api/v1/branch-report`.
- **`backend/service/agent-invoice/`:** Full invoices, agents, agent-fees, master-data APIs; permission middleware; VOID status support.
- **`backend/service/smart-report/`:** Report query/scheduling service, VM sandbox, CSV/Excel exports, boot scheduler.
- **`backend/service/staff/`:** Profiles API behind gateway `/api/v1/staff`.
- **`backend/service/demo-service/`:** Sample CRUD (`/api/v1/me`, `/api/v1/items`).
- **`backend/shared/platform-roles/`:** `@zero-platform/roles` — canonical role enums shared by auth, gateway, staff, smart-report, agent-invoice.
- **`backend/auth/`:** Permission Admin API; expanded menu catalog; `support` / `support_admin` roles; `POST /auth/me/active-branch`; `PATCH /internal/users/{user_id}/role`.
- **`backend/gateway/`:** Routes for invoices, smart-reports, branch-report, staff; `x-user-home-branch` forward; JWT role validation via `@zero-platform/roles`.
- **`backend/_bruno/`:** Shared Bruno collections; `Local.yml.example` templates for local env setup.
- **CI/CD:** `.github/workflows/ci-check.yml` quality gate (lint, test, OpenAPI, frontend build).

#### Repository layout

- `backend/` (auth, gateway, services) and `frontend/backoffice/`; root [`README.md`](./README.md), [`backend/README.md`](./backend/README.md), [`backend/docker-compose.yml`](./backend/docker-compose.yml).

### Changed

#### Frontend — backoffice

- Merged former `frontend/backoffice-shadcn/` into **`frontend/backoffice/`** (single shadcn/ui app; Ant Design tree removed).
- Refactored Dashboard, Invoices, Staff, Agents, Agent Fees, Smart Reports, Channel Performance, Permission Admin, and My Profile to standardized layout wrappers and design tokens.
- AdminLayout: shadcn sidebar/header shell, theme provider, profile/branch display, menu from permissions API.
- Invoices: shared bulk orchestration module; URL-persisted list filters; PDF/Excel export layout; Gregorian date formatting.
- Role permissions admin: cascade parent checkboxes; save explicit action keys only.
- Smart Reports: split-screen create/edit page; local timezone for scheduler and history display.
- Channel Performance: date range presets, responsive form, sticky table header.
- Profile UX: My Profile via avatar dropdown; grapheme-aware Thai initials.
- Password policy UI/tests aligned to 8-character minimum with complexity rules.

#### Backend & deploy

- **`backend/service/smart-report/`:** English seed report descriptions; pagination `limit` max raised to 200.
- **agent-invoice:** Tenant isolation by `ou_id`; DB rename to `zero-agent-invoice`; standardized package scripts and Spectral config.
- **Architecture:** Core platform ports `3000/3001/3002`; business services `3101+`; `ecosystem.config.js` under `backend/`.
- **Deploy (DigitalOcean):** `zero-branch-report` in PM2 (port 3015); `pm2 startOrReload`; per-service `npm ci --prefix` (see `install-all-deps.sh` for local parity).
- **Auth / gateway:** Fail-closed Redis `token_gen`; branch switch `503 AUTH_NOT_READY` on Redis publish failure; `loadEnv` trims CRLF from env files.
- **Coding standards:** Document `home_branch_id` / `x-user-home-branch` and Redis fail-closed policy.
- **Rename:** `backend/service/service-demo/` → `backend/service/demo-service/`.
- **Dev seed:** Corrected `DEV_SEED_BRANCH_ID` to real `gpp_777ww.su_branch` document.
- **Documentation:** Port index consolidated into root and `backend/README.md`; `DEPLOY_DIGITALOCEAN.md` SSH key guidance.

#### Repository hygiene

- **`.gitignore`:** Repo-wide Bruno `Local.yml` ignore; track env templates; playwright/test-results, `.cursor/mcp.json`.
- **`.gitattributes`:** LF normalization repo-wide; shell/env template rules; `package-lock.json -merge`; binary assets; linguist-vendored for `.cursor/` and `references/`.

### Removed

- **`frontend/backoffice-shadcn/`:** Absorbed into `frontend/backoffice/`.
- **Root `package.json`:** No npm workspaces at repo root; each package installs independently.
- **Ant Design backoffice:** Superseded by shadcn/ui rebuild.
- **Backoffice:** In-app `/layout-demo` route (reference in `coding-standard/frontend/backoffice/live-demo-shadcn/`).
- **Backoffice — Invoices:** Mock `invoiceData.ts` and legacy list/detail pages.
- **`_mission-control/`** build artifacts (agent-invoice, frontend, shipped specs).
- **`backend/service/service-demo/`**, **`backend/items/`**, root-flat `auth/`/`gateway/`/`services/` layout.
- **`local-ports.md`:** Consolidated into README files.
- **Docs:** Shipped `_mission-control` specs (git history retains copies).

### Security

- **Bruno environments:** Stop tracking `**/environments/Local.yml` files that contained secrets (e.g. auth `internalServiceSecret`); add `Local.yml.example` templates instead.
- **`.gitignore` / `.gitattributes`:** Prevent accidental commit of local env files and normalize LF on env templates.

### Fixed

- **Deploy:** Per-service dependency install after `@zero-platform/roles` linking issues caused 502 on production.
- **Backoffice — Auth (critical):** Dedupe concurrent `POST /auth/refresh`; stop `/auth/me/menus` fetch storm on token refresh; sync Redis `token_gen` on login/refresh; fix Permission Admin `revoke_sessions` key.
- **Backoffice — My Profile:** 404 when active branch ≠ home branch (staff OU-wide lookup + gateway `x-user-home-branch`).
- **Backoffice — Invoices:** Bulk progress layout; deduped fetch-error toasts; URL-persisted filters on back-navigation.
- **Backoffice — Agent Fees:** ETag encoding; referenced-agent fee matrix data; out-of-range validation message; danger confirm on remove reference.
- **Backoffice — Agents:** Branch-type tag matches API `MA`/`AG` values.
- **Backoffice — AdminLayout:** Sidebar brand no longer wraps when collapsed; stable `useAppFeedback` stops Dashboard fetch loop.
- **Backoffice — Staff/Auth:** Role assignment uses `roles:assign` permission; profile lookup and JWT hardening.
- **`backend/auth/`:** Password regex typo; inactive branch returns `403` documented in OpenAPI; seed-user profile updates.
- **`backend/gateway/`:** Forward `Authorization` on public `/auth/*` routes for bearer menu endpoints.
- **`backend/service/staff/`:** DB name config; `support_admin` role validation; role assign on create.
- **`backend/service/smart-report/`:** VM sandbox prototype hardening; `support_admin` role acceptance.
- **`backend/service/agent-invoice/`:** Master-data `sourceDb` when unset; bodyless JSON DELETE; `ObjectId` / field-name mapping fixes.
- **Auth / gateway — Windows:** CRLF trim in `loadEnv` for `TZ=UTC` values.

## [0.2.0] - 2026-05-21

Repository snapshot: **auth 0.1.6**, **gateway 0.2.4**, **crud-service 0.1.1**. Detail per package in service `CHANGELOG.md` files (paths at repo root in that release).

### auth (0.1.6)

- Docs SoT: `domain.md`, `db/erd.md`, ADR under `docs/adrs/`; `architecture.md` v1.4.1.
- Runtime: `x-request-id` echo; per-route rate-limit helpers; integration tests.

### gateway (0.2.4)

- `x-request-id`; Prettier + OpenAPI/routes alignment CI tests.
- `/auth` proxy route; OpenAPI `client_kind` aligned with auth; `docs/architecture.md` v1.4.1.

### crud-service (0.1.1)

- Package docs resync (`architecture.md`, `db/erd.md`, README/RUNBOOK); OpenAPI version alignment tests.

### Monorepo — Added

- Version-control **auth** service and **crud-service** gateway mesh demo upstream.
- **local-ports.md** at repository root: central index of default local HTTP ports.
- Strict gateway route file `gateway/routes.json` and runtime source `ROUTES_FILE=./routes.json`.
- Gateway fallback for unmatched routes: `404 application/problem+json`, `GATEWAY_ROUTE_NOT_FOUND`.
- Gateway `spec:lint` (org Spectral); registry entry `GATEWAY_ROUTE_NOT_FOUND`.

### Monorepo — Changed

- Rename monorepo **access-platform** → **zero-platform**; GitHub **Chiang-Rai-Technology/zero-platform**.
- Move **`.demo/crud-service/`** → **`services/.demo/crud-service/`**; `.gitignore` ignores `services/*` except **`services/.demo/**`**.
- **ARCHITECTURE.md** v1.1.0 — `token_gen` + Redis session revocation (O-16/D3).
- Gateway routes: `/api/v1/members` → `/api/v1/staff` (port **3101** planned).

### Monorepo — Fixed

- Monorepo doc review: broken relative links and internal anchors across packages.
- Auth refresh rejection → `TOKEN_REFRESH_REJECTED`; gateway `GATEWAY_CLAIM_REJECTED` → HTTP **401**.

### Monorepo — Removed

- **`www/`** — Vite/React client; API-only monorepo focus (later superseded by `frontend/backoffice/` in 0.3.0).
- **`PROJECT_TREE.md`** — folder SoT is `ARCHITECTURE.md` + per-package docs.
- Vendored **`_coding-standards/`** at zero-platform root.

## [0.1.1] - 2026-04-17

### gateway (0.1.1)

- Hardening: `GATEWAY_SECRET` must be at least 32 characters.
- Security: default error handler no longer forwards raw `Error` objects to clients.
- Observability: JWT verify failure logged at `debug` with `jwtVerifyFailedCode`.

## [0.1.0] - 2026-04-17

### gateway (0.1.0)

- Initial gateway: JWKS verify, header contract, prefix proxy routes, `/health`, graceful shutdown.

### auth (0.1.0)

- Initial auth: self-hosted identity provider (login, refresh, JWT issuance).
