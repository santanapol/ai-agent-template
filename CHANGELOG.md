# Changelog

All notable changes to this repository are recorded here. Each deployable service keeps its own SemVer in `package.json`; release notes below group changes by **repository snapshot**. For line-level history per service, see `backend/auth/CHANGELOG.md`, `backend/gateway/CHANGELOG.md`, `backend/service/demo-service/CHANGELOG.md`, and `backend/service/staff/` package docs.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) per service `package.json` / OpenAPI `info.version` where applicable.

## [Unreleased]

### Added

- **`backend/service/agent-invoice/`** — agents and agent-fees API (list/create/update/delete fees; agent CRUD; master-data lookups) with integration tests and gateway route prefix **`agent-invoice`**.
- **agent-invoice seeds:** split Mongo bootstrap into `seed_agents.js`, `seed_indexes.js`, and `seed-agent_fees_seed.js`; document optional `SOURCE_MONGODB_URI` in `.env.example`.
- **agent-invoice tests:** `src/app.test.js` (health/readiness probes) and `agents.route.test.js` (agents API integration suite).
- **Backoffice — Agent Fees:** dedicated `/agent-fees` route with matrix table UI, `MatrixCell` component, create/edit/delete flows, and `agentFeesApiClient` / `agentsApiClient` with shared token refresh.
- **`backend/service/staff/`** — staff profiles API (Fastify :3004, OpenAPI, MongoDB, init/seed scripts, tests) behind gateway `/api/v1/staff`.
- **`backend/service/demo-service/`** — CRUD sample (`/api/v1/me`, `/api/v1/items`); `init:db`, `seed:example`, and `mongo-create-demo-user.md` for local Mongo.
- **`backend/_bruno/`** — shared Bruno collections for gateway and internal mesh smoke tests.
- **Auth:** `internal-create-user` integration test; seed/init script updates for staff and demo alignment.
- **Gateway:** `.spectral.yaml` and `routes.test.js` for route config validation.
- **Backoffice:** `apiError.ts` and `components/staff/` (table + drawer); **username** on staff create form; Vitest coverage; profile lookup via `user_id` query param.
- **Repository layout:** `backend/` (auth, gateway, services) and `frontend/backoffice/` (Vite + React admin UI).
- **Documentation:** Root [`README.md`](./README.md), [`backend/README.md`](./backend/README.md), [`backend/docker-compose.yml`](./backend/docker-compose.yml) (MongoDB 8 + Redis 8).

### Changed

- **agent-invoice ERD/docs:** branch schema adds `branch_id`, `branch_desc`, `ref_fee_branch_id`, `active`; `branch_type` enum **`MA` | `AG`**; fee/agent controllers use shared error mapping and `If-Match` ETag helpers.
- **agent-invoice OpenAPI:** document agents, agent-fees, and master-data endpoints with `Agent` / fee schemas and shared path parameters.
- **agent-invoice services:** share `resolveAgentBranchId` across fees; agent sync/unsynced flows inject `sourceDb` from controller; master-data routes validate optional `ou_id` query.
- **agent-invoice delete fee:** require optimistic-lock `upd_date` and return **`412 VERSION_CONFLICT`** when the record changed concurrently.
- **Backoffice — Agents:** inline edit + manage fees on one page; types expose `ref_fee_branch_id` / `ref_fee_branch_name`; optional `default_fee_rate` on patch payload.
- **Backoffice — Auth:** register agent-fees API refresh callback alongside staff/agents clients.
- **Rename:** `backend/service/service-demo/` → **`backend/service/demo-service/`** (package `demo-service`; Bruno collections `demo-service`; default `DB_NAME` **`demo-service`**).
- **Staff docs:** list vs lookup contract (`GET /profiles` vs `GET /profiles?user_id=...`); custom JSON error envelope language; ERD and architecture aligned with implementation.
- **demo-service:** `/healthz` and `/readyz` — plain JSON probes; readiness `503` uses `application/problem+json` with `SERVICE_NOT_READY`.
- **Auth / gateway:** OpenAPI and proxy alignment; `routes.json` documents staff upstream on **3004** and demo on **3003**.
- **Backoffice:** `StaffManagement` / `MyProfile` UX; staff seed script force-updates profile data on re-run.
- **Monorepo paths:** Platform packages under `backend/`; back-office UI under `frontend/backoffice/`.

### Removed

- **`backend/service/agent-invoice/_mission-control/`** — completed build spec/plan/todo artifacts.
- **`frontend/backoffice/_mission-control/`** — raw invoice requirement draft files.
- **`backend/service/service-demo/`** — replaced by `backend/service/demo-service/`.
- **`backend/items/`** — legacy Express items workspace (superseded by demo-service items API).
- **Root-flat layout:** Top-level `auth/`, `gateway/`, `services/` tree (replaced by `backend/`).
- **`local-ports.md`:** Port index consolidated into root and `backend/README.md`.

### Fixed

- **Backoffice — Agent Fees:** ETag encoding on update/delete; matrix table race when mapping fee data to DOM; input enablement when syncing initial fee values; default fee rate update error handling.
- **Backoffice — Staff/Auth:** `getProfileByUserId` handles single-object lookup response; JWT decode hardening; role-based route guard for `/staff`; profile/staff drawer and password-form validation edge cases.
- **agent-invoice:** `ObjectId` conversion for master-data queries filtered by `ou_id`; field-name mapping for game company/category display.
- **agent-invoice agents:** sync/unsynced branch listing uses repository helpers instead of ad-hoc collection access.

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
- Gateway routes: `/api/v1/members` → `/api/v1/staff` (port **3004** planned).

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
