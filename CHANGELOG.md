# Changelog

All notable changes to this repository are recorded here. Each deployable service keeps its own SemVer in `package.json`; release notes below group changes by **repository snapshot**. For line-level history per service, see `backend/auth/CHANGELOG.md`, `backend/gateway/CHANGELOG.md`, `backend/service/demo-service/CHANGELOG.md`, and `backend/service/staff/` package docs.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) per service `package.json` / OpenAPI `info.version` where applicable.

## [Unreleased]

### Added

- **Backoffice:** Added English description subtitles to the header section of [StaffManagement.tsx](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/frontend/backoffice/src/pages/StaffManagement.tsx), [Agents/index.tsx](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/frontend/backoffice/src/pages/Agents/index.tsx), and [InvoiceDetail.tsx](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/frontend/backoffice/src/pages/Invoices/InvoiceDetail.tsx) to ensure header visual consistency across all routes.
- **`backend/service/smart-report/`:** Added custom `"last"` day of month option for monthly report scheduler frequency.
- **Backoffice:** Redesigned Create/Edit report flow to use a split-screen inline page instead of a Modal.
- **Backoffice:** Updated report execution history dates in the UI to display in the local browser timezone using `dayjs`.
- **Backoffice:** Changed the saved scheduled timezone to dynamically use the browser's local timezone (e.g. `'Asia/Bangkok'`) instead of hardcoded `'UTC'`.
- **Backoffice:** Removed automatic saving of `timezoneOffsetMinutes` in the database's `params` to allow custom timezone logic within scripts.
- **`backend/service/smart-report/`:** Added a new report query and scheduling service, supporting raw MongoDB script execution under a secured VM sandbox with prototype traversal protection, exports to CSV/Excel formats stored permanently, and automatic boot scheduler.
- **Backoffice:** Added the Smart Report management UI page under `/smart-reports` to display, create, edit, delete, run immediately, and download report history.
- **Gateway:** Added routing rules to proxy `/api/v1/smart-reports` requests to port 3103.

- **Backoffice:** Add `telephone.ts` utility and `telephone.test.ts` to validate and format telephone numbers to E.164.
- **Backoffice & agent-invoice:** added `bet` aggregation to invoices and transactions; displayed bet total and net win on frontend table and exports.
- **CI/CD:** Added strict `.github/workflows/ci-check.yml` quality gate for pull requests to `main` (Lint, Test, OpenAPI validation, Frontend Build).
- **`backend/service/agent-invoice/` — invoices module:** full invoice API under `/api/v1/invoices` (list, generate, detail, transactions, calculate-fee, status update); added `bet` aggregation to invoices and transactions; read/write Mongo plugins (`mongodb-read`, `mongodb-invoice`), `api-rate-limit`, shared `src/lib/` helpers; OpenAPI **1.1.0**; invoice DB env vars in `.env.example`.
- **GET /api/v1/invoices/agent:** branch picker from `gpp_777ww.su_branch` scoped to caller `x-user-ou`.
- **Gateway:** proxy route **`/api/v1/invoices`** → agent-invoice `:3000` (`routes.json`, `.env.example` `ROUTES_JSON`).
- **Backoffice — Invoices:** real API via gateway (`invoicesApiClient`, `useInvoices` hook); pages under `pages/Invoices/` (list with filters/pagination, generate modal, detail/transactions, mark PAID, PDF/Excel export); Vitest for API client and hook; Bruno collection `backend/_bruno/agent-invoice-service/`.
- **`backend/service/agent-invoice/`** — agents and agent-fees API (list/create/update/delete fees; agent CRUD; master-data lookups) with integration tests and gateway route prefix **`agent-invoice`**.
- **agent-invoice seeds:** split Mongo bootstrap into `seed_agents.js`, `seed_indexes.js`, and `seed-agent_fees_seed.js`; document optional `SOURCE_MONGODB_URI` in `.env.example`.
- **agent-invoice tests:** `src/app.test.js` (health/readiness probes) and `agents.route.test.js` (agents API integration suite).
- **Backoffice — Agent Fees:** dedicated `/agent-fees` route with matrix table UI, `MatrixCell` component, create/edit/delete flows, and `agentFeesApiClient` / `agentsApiClient` with shared token refresh.
- **`backend/service/staff/`** — staff profiles API (Fastify :3101, OpenAPI, MongoDB, init/seed scripts, tests) behind gateway `/api/v1/staff`.
- **`backend/service/demo-service/`** — CRUD sample (`/api/v1/me`, `/api/v1/items`); `init:db`, `seed:example`, and `mongo-create-demo-user.md` for local Mongo.
- **`backend/_bruno/`** — shared Bruno collections for gateway and internal mesh smoke tests.
- **Auth:** `internal-create-user` integration test; seed/init script updates for staff and demo alignment.
- **Gateway:** `.spectral.yaml` and `routes.test.js` for route config validation.
- **Backoffice:** `apiError.ts` and `components/staff/` (table + drawer); **username** on staff create form; Vitest coverage; profile lookup via `user_id` query param.
- **Repository layout:** `backend/` (auth, gateway, services) and `frontend/backoffice/` (Vite + React admin UI).
- **Documentation:** Root [`README.md`](./README.md), [`backend/README.md`](./backend/README.md), [`backend/docker-compose.yml`](./backend/docker-compose.yml) (MongoDB 8 + Redis 8).

### Changed

- **`backend/service/smart-report/`:** Translated all Thai database seed report descriptions (such as "รายชื่อสมาชิกใหม่ของเมื่อวาน") to professional English descriptions inside [seed-example-data.mjs](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/backend/service/smart-report/scripts/seed-example-data.mjs) and re-seeded the database successfully.
- **Backoffice:** Update telephone input fields to support entering local Thai numbers (with auto E.164 conversion before submitting). Reduce minimum password length requirement to 8 characters and enforce password complexity.
- **Auth Service:** Update password policy requirement to minimum 8 characters and enforce complexity (uppercase, lowercase, numbers, special characters) in internal user validations, auth validators, and schemas.
- **Staff Service:** Update password validation pattern and minimum length to 8 characters in profiles schemas and OpenAPI specifications.
- **agent-invoice:** Standardized package scripts (`ci`, `lint`, `spec:lint`, etc.), added `private: true`, and applied standard configuration files (`eslint.config.js`, `.prettierrc.json`, `.spectral.yaml`). Ignored legacy seed scripts to pass initial linting.

- **Deployment:** Clarified SSH key configurations and usage for GitHub Actions in `DEPLOY_DIGITALOCEAN.md` to avoid confusion between deploy keys and client keys.
- **agent-invoice database:** Renamed MongoDB database to `zero-agent-invoice` and collections to `agent_iv` and `agent_iv_transaction` to align with new naming conventions; updated init scripts and environment configurations.
- **Architecture:** Restructured port schema to separate Core Platform (`3000/3001/3002`) from Business Services (`3101/3102`); updated all documentation, specs, and integration test ports.
- **Deployment:** Moved `ecosystem.config.js` to `backend/` and added `docker-compose.prod.yml` to separate Production (Redis only) from Development (Redis + MongoDB).
- **Frontend:** Added `RUNBOOK.md` to detail local proxy routing and Docker dependencies.

- **Backoffice — Invoice detail:** redesigned summary as a single-card invoice layout (`Row`/`Col` header, bill-to/details, status tag) replacing `Descriptions` + `Badge.Ribbon`; transactions sorted by game-provider name; game-category names rendered via new `formatCategoryName` helper (snake_case → Title Case); PDF/Excel export use the sorted list and switch to `message.useMessage()` (`contextHolder`) for export toasts; `formatMoney` always shows 2 decimals; `statusTagColor`/`ribbonColor` color mapping adjusted (`PENDING` → warning/orange, `READY` → processing/blue).
- **Backoffice — Invoice exports & detail header:** PDF/Excel exports drop the redundant "Organization Unit" line and pair "Bill To" (branch name) with "Due Date" side-by-side instead of a separate "Status" row; tightened spacing (PDF table `startY` 55 → 48, Excel column widths and removed blank separator row); on-screen invoice header `Card` restructured to mirror the same Bill To / Due Date pairing (with Paid Date for `PAID` invoices); all invoice dates (list, detail header, PDF, Excel) now render via a shared `formatDate` helper as Gregorian `YYYY-MM-DD` instead of `toLocaleDateString('th-TH')` (Buddhist calendar).
- **Backoffice — AdminLayout navbar:** resolves and displays the signed-in user's real name (`staffApi.getProfileByUserId`) and branch name (`invoicesApi.listInvoiceAgents`, matched by `branch_id`) instead of raw JWT ObjectIDs, with role/branch shown as styled `Tag`s next to a larger avatar; sidebar brand block height now matches the header (64px, flex-centered) for visual alignment; removed the redundant "My Profile" entry from the side menu (still reachable via the avatar dropdown).
- **Dev seed data:** corrected `DEV_SEED_BRANCH_ID` in `backend/auth`, `backend/service/staff`, and `backend/service/demo-service` seed scripts — the previous synthetic placeholder (`6a190d6c1fee03c38313724a`) had no matching `gpp_777ww.su_branch` document, so the backoffice navbar/branch lookups could never resolve a name; now points at the real "777WW" branch (`5f4fb5bb3156af7a2db9e5a0`, same `ou_id`) and the already-seeded dev/test accounts (`platform_admin`, `branch_admin`, `staff`, `berlin`, `tests10user`) were corrected in place.
- **Auth / gateway — `TZ=UTC` on Windows:** `loadEnv` trims CRLF from `.env.defaults`; root `.gitattributes` keeps `*.env.defaults` LF-only.
- **agent-invoice — tenant isolation:** invoice list/detail/transactions/status/generate/calculate-fee queries filter by `ou_id` from `x-user-ou`.
- **Backoffice — Invoices:** branch filters and create form use `GET /api/v1/invoices/agent` instead of agents list; `AuthContext` wires invoices client token refresh.
- **agent-invoice ERD/docs:** branch schema adds `branch_id`, `branch_desc`, `ref_fee_branch_id`, `active`; `branch_type` enum **`MA` | `AG`**; fee/agent controllers use shared error mapping and `If-Match` ETag helpers.
- **agent-invoice OpenAPI:** document agents, agent-fees, and master-data endpoints with `Agent` / fee schemas and shared path parameters.
- **agent-invoice services:** share `resolveAgentBranchId` across fees; agent sync/unsynced flows inject `sourceDb` from controller; master-data routes validate optional `ou_id` query.
- **agent-invoice delete fee:** require optimistic-lock `upd_date` and return **`412 VERSION_CONFLICT`** when the record changed concurrently.
- **Backoffice — Agents:** inline edit + manage fees on one page; types expose `ref_fee_branch_id` / `ref_fee_branch_name`; optional `default_fee_rate` on patch payload.
- **Backoffice — Auth:** register agent-fees API refresh callback alongside staff/agents clients.
- **Rename:** `backend/service/service-demo/` → **`backend/service/demo-service/`** (package `demo-service`; Bruno collections `demo-service`; default `DB_NAME` **`demo-service`**).
- **Staff docs:** list vs lookup contract (`GET /profiles` vs `GET /profiles?user_id=...`); custom JSON error envelope language; ERD and architecture aligned with implementation.
- **demo-service:** `/healthz` and `/readyz` — plain JSON probes; readiness `503` uses `application/problem+json` with `SERVICE_NOT_READY`.
- **Auth / gateway:** OpenAPI and proxy alignment; `routes.json` documents staff upstream on **3101** and demo on **3002**.
- **Backoffice:** `StaffManagement` / `MyProfile` UX; staff seed script force-updates profile data on re-run.
- **Monorepo paths:** Platform packages under `backend/`; back-office UI under `frontend/backoffice/`.
- **Documentation:** Port index consolidated into root and `backend/README.md`.

### Removed

- **Backoffice — Invoices:** mock `invoiceData.ts` and legacy `InvoiceList` / `InvoiceDetail` pages (replaced by `pages/Invoices/`).
- **`backend/service/agent-invoice/_mission-control/`** — completed build spec/plan/todo artifacts.
- **`frontend/backoffice/_mission-control/`** — raw invoice requirement draft files.
- **`backend/service/service-demo/`** — replaced by `backend/service/demo-service/`.
- **`backend/items/`** — legacy Express items workspace (superseded by demo-service items API).
- **Root-flat layout:** Top-level `auth/`, `gateway/`, `services/` tree (replaced by `backend/`).
- **`local-ports.md`:** Port index consolidated into root and `backend/README.md`.

### Fixed

- **Backoffice:** Replaced static `message` import with the dynamic `useAppFeedback` context hook in [Invoices/index.tsx](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/frontend/backoffice/src/pages/Invoices/index.tsx) to resolve console theme context warnings.
- **Backoffice:** Patched deprecated `width` prop with unified `size` prop on the Drawer component in [SmartReport.tsx](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/frontend/backoffice/src/pages/SmartReport.tsx) to resolve console deprecation warnings.
- **Backoffice:** Replaced deprecated Space `direction="vertical"` with `orientation="vertical"` on all Space components inside [SmartReport.tsx](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/frontend/backoffice/src/pages/SmartReport.tsx) to resolve console warnings.
- **Backoffice:** Fixed category name localization mapping on [AgentFees/index.tsx](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/frontend/backoffice/src/pages/AgentFees/index.tsx) by checking both `main_cate_name` and typo key `manin_cate_name` projected from the repository.
- **`backend/service/staff/`:** Fixed `.env` database name config to point to `zero-platform` instead of `auth_login` to correct profiles lookup errors.
- **`backend/auth/`:** Fixed `seed-user` script when updating profile collections.
- **`backend/service/smart-report/`:** Patched VM sandbox escapes and stripped object prototypes using `Object.create(null)` for sandbox-injected objects. Corrected unit and integration test suites.

- **Auth Service:** Fix regex pattern backslash escaping typo in password policy validation (`auth.service.js`).
- **Backoffice:** Fix vitest unit test in `passwordPolicy.test.ts` to use a password matching the updated complexity requirements.
- **agent-invoice — master-data:** `game-companies` / `game-categories` use `getBranchDatabase()` (`MONGODB_URI_READ` + `gpp_777ww`) instead of undefined `sourceDb` when `SOURCE_MONGODB_URI` is unset.
- **Backoffice — Agent Fees:** ETag encoding on update/delete; matrix table race when mapping fee data to DOM; input enablement when syncing initial fee values; default fee rate update error handling.
- **Backoffice — Staff/Auth:** `getProfileByUserId` handles single-object lookup response; JWT decode hardening; role-based route guard for `/staff`; profile/staff drawer and password-form validation edge cases.
- **agent-invoice:** `ObjectId` conversion for master-data queries filtered by `ou_id`; field-name mapping for game company/category display.
- **agent-invoice agents:** sync/unsynced branch listing uses repository helpers instead of ad-hoc collection access.
- **Backoffice — Auth (critical):** dedupe concurrent `POST /auth/refresh` calls behind a single shared in-flight promise in `AuthContext`; previously every full-page navigation fired two competing refreshes against the single-use rotating refresh-token cookie, the loser got `TOKEN_REFRESH_REJECTED`, and could force an unexpected logout mid-session.
- **Backoffice — Agents:** branch-type tag now matches the API's actual `MA`/`AG` values (was checking for `MAIN`, so the purple "MA" tag never rendered); `Space`/`Card` props migrated to Ant Design 6 (`orientation`, `variant="borderless"`).
- **Backoffice — AdminLayout:** sidebar brand title no longer wraps into vertical single-character lines when the sider is collapsed/narrow; shows "ZP" when collapsed and "Zero Platform" when expanded.
- **Backoffice — Agent Fees:** "Remove Reference" confirm modal now uses a danger (red) OK button to match "Set Reference Agent", consistent with other destructive actions; fee matrix now renders the referenced agent's actual fee overrides instead of an empty table (filters compared against the agent's own — empty — fee data instead of the referenced agent's `refFees`); empty-state copy in the fee table is contextual (no overrides on the referenced agent vs. hidden providers vs. no providers) instead of generic "No Data".
- **Backoffice — Agent Fees `MatrixCell`:** stop silently clamping out-of-range fee input (0–100) on blur, which made the spec'd "Invalid values: ..." save-time validation message unreachable; out-of-range values now surface that message as intended.
- **Backoffice — Invoices:** dedupe the "Failed to fetch invoice"/"Failed to fetch transactions" toasts (previously stacked up to 4 identical alerts on a missing invoice, compounded by React StrictMode's double-effect in dev) by keying `message.error` per invoice id; list filters, search text, and pagination are now persisted in the URL query string so they survive `ArrowLeft` back-navigation from the invoice detail page (I11).

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

### Monorepo

### Added

- Version-control **auth** service and **crud-service** gateway mesh demo upstream.
- **local-ports.md** at repository root: central index of default local HTTP ports.
- Strict gateway route file `gateway/routes.json` and runtime source `ROUTES_FILE=./routes.json`.
- Gateway fallback for unmatched routes: `404 application/problem+json`, `GATEWAY_ROUTE_NOT_FOUND`.
- Gateway `spec:lint` (org Spectral); registry entry `GATEWAY_ROUTE_NOT_FOUND`.

### Changed

- Rename monorepo **access-platform** → **zero-platform**; GitHub **Chiang-Rai-Technology/zero-platform**.
- Move **`.demo/crud-service/`** → **`services/.demo/crud-service/`**; `.gitignore` ignores `services/*` except **`services/.demo/**`**.
- **ARCHITECTURE.md** v1.1.0 — `token_gen` + Redis session revocation (O-16/D3).
- Gateway routes: `/api/v1/members` → `/api/v1/staff` (port **3101** planned).

### Fixed

- Monorepo doc review: broken relative links and internal anchors across packages.
- Auth refresh rejection → `TOKEN_REFRESH_REJECTED`; gateway `GATEWAY_CLAIM_REJECTED` → HTTP **401**.

### Removed

- **`www/`** — Vite/React client; API-only monorepo focus (later superseded by `frontend/backoffice/` in Unreleased).
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
