# Changelog

All notable changes to this repository are recorded here. Each deployable service keeps its own SemVer in `package.json`; release notes below group changes by **repository snapshot**. For line-level history per service, see `gateway/CHANGELOG.md` and `auth/CHANGELOG.md`.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) per service `package.json` / OpenAPI `info.version` where applicable.

## [Unreleased]

## [0.2.0] - 2026-05-21

Repository snapshot: **auth 0.1.6**, **gateway 0.2.4**, **crud-service 0.1.1**. Detail per package in [`auth/CHANGELOG.md`](./auth/CHANGELOG.md), [`gateway/CHANGELOG.md`](./gateway/CHANGELOG.md), [`services/.demo/crud-service/CHANGELOG.md`](./services/.demo/crud-service/CHANGELOG.md).

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

- Version-control **`auth/`** service (Fastify IdP-style HTTP API, tests, `openapi.yaml`, docs) and **`services/.demo/crud-service/`** gateway mesh demo upstream.
- [`local-ports.md`](./local-ports.md) at repository root: central index of **default local HTTP ports** for dev (`auth`, `gateway`, demo upstream, optional **staff**).
- Strict gateway route file `gateway/routes.json` and runtime source `ROUTES_FILE=./routes.json`.
- Gateway fallback for unmatched routes: `404 application/problem+json`, `x-gateway-hit: true`, `GATEWAY_ROUTE_NOT_FOUND`.
- Gateway `spec:lint` (org Spectral); registry entry `GATEWAY_ROUTE_NOT_FOUND`.

### Changed

- Rename monorepo **access-platform** → **zero-platform**; GitHub **`Chiang-Rai-Technology/zero-platform`**.
- Move **`.demo/crud-service/`** → **`services/.demo/crud-service/`**; `.gitignore` ignores `services/*` except **`services/.demo/**`**.
- **ARCHITECTURE.md** v1.1.0 — `token_gen` + Redis session revocation (O-16/D3); updated sequence diagrams.
- **RUNBOOK.md** — `auth` / `gateway` folder names; broken links; `crud-service` upstream examples.
- **README.md**, **local-ports.md** — fix `_coding-standards` / `model-matrix.md` links.
- Gateway routes: `/api/v1/members` → `/api/v1/staff` (port **3004** planned for `services/staff/`).
- Auth/gateway OpenAPI single SoT at package root; normative cross-links updated.
- **`auth/.env.example`**, **`gateway/.env.example`:** default `CORS_ORIGINS` empty.

### Fixed

- Monorepo doc review: broken relative links and internal anchors across packages.
- Auth refresh rejection → `TOKEN_REFRESH_REJECTED`; gateway `GATEWAY_CLAIM_REJECTED` → HTTP **401**.

### Removed

- **`www/`** — Vite/React client; API-only monorepo focus.
- **`PROJECT_TREE.md`** — folder SoT is `ARCHITECTURE.md` + per-package docs.
- **auth:** `docs/adr-001-fastify-esm.md` → `docs/adrs/001-fastify-esm.md`.
- Vendored **`_coding-standards/`** at zero-platform root (org SoT on parent workspace).
- Broad gateway catch-all routing (explicit allowlisted prefixes only).

## [0.1.1] - 2026-04-17

### gateway (0.1.1)

- Hardening: `GATEWAY_SECRET` must be at least 32 characters.
- Security: default error handler no longer forwards raw `Error` objects to clients for non-proxy failures; server logs full error only.
- Observability: on JWT verify failure, log at `debug` with `jwtVerifyFailedCode` (no token / no PII).
- Docs: deploy JWT/env checklist; OpenAPI description links to it.

### reference (0.1.1)

- Hardening: `GATEWAY_SECRET` must be at least 32 characters.
- Docs: OpenAPI `info` links to deploy JWT/env checklist.

## [0.1.0] - 2026-04-17

### gateway (0.1.0)

- Initial `gateway`: JWKS verify, header contract, prefix proxy routes, `/health`, graceful shutdown; minimal OpenAPI.

### reference (0.1.0)

- Initial `internal-api`: `GET /health`, `GET /api/v1/me` protected by `x-gateway-secret` (constant-time compare), response envelope per team API response standard.

### auth (0.1.0)

- Initial `auth`: self-hosted identity provider (login, refresh, JWT issuance) per `auth/docs/architecture.md`; OpenAPI and env examples in-repo.
