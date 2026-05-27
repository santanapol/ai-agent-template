# Changelog

All notable changes to this repository are recorded here. Each deployable service keeps its own SemVer in `package.json`; release notes below group changes by **repository snapshot**. For line-level history per service, see `backend/auth/CHANGELOG.md`, `backend/gateway/CHANGELOG.md`, and `backend/service-demo/CHANGELOG.md`.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) per service `package.json` / OpenAPI `info.version` where applicable.

## [Unreleased]

### Added

- **Repository layout:** `backend/` (auth, gateway, service-demo, items, ops docs) and `frontend/backoffice/` (Vite + React admin UI).
- **Documentation:** Root [`README.md`](./README.md) — full-stack overview, document map, local ports, quick start.
- **Backend:** [`backend/README.md`](./backend/README.md) — monorepo entry, gateway routes, prerequisites.
- **Local dev:** [`backend/docker-compose.yml`](./backend/docker-compose.yml) — MongoDB 8 + Redis 8 for `token_gen` / auth dev stack.
- **Items service:** `backend/items/` — Express items API (workspace copy; default port 3000).

### Changed

- **Monorepo paths:** Platform packages moved under `backend/` (was flat `auth/`, `gateway/`, `services/.demo/crud-service/` at repo root).
- **Demo upstream:** `services/.demo/crud-service/` → `backend/service-demo/` (same role: `/api/v1/me`, `/api/v1/items`).
- **Frontend:** Back-office UI under `frontend/backoffice/` (Vite dev proxy `/auth` → auth, `/api` → gateway).
- **Local dev:** Redis image `redis:7-alpine` → `redis:8-alpine` in compose (carried from prior snapshot).

### Removed

- **Root-flat layout:** Top-level `auth/`, `gateway/`, `services/` tree (replaced by `backend/`).
- **`local-ports.md`:** Port index consolidated into root and `backend/README.md`.

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
