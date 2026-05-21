# Changelog

All notable changes to this repository are recorded here. Each deployable service keeps its own SemVer in `package.json`; release notes below group changes by **repository snapshot**. For line-level history per service, see `gateway/CHANGELOG.md` and `auth/CHANGELOG.md`.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) per service `package.json` / OpenAPI `info.version` where applicable.

## [Unreleased]

### Added

- **auth:** [`docs/domain.md`](./auth/docs/domain.md), [`docs/db/erd.md`](./auth/docs/db/erd.md), [`docs/adrs/001-fastify-esm.md`](./auth/docs/adrs/001-fastify-esm.md) (moved from package-root ADR); `request-id` + per-route rate-limit helpers; integration coverage for `x-request-id`.
- **gateway:** `request-id` (`genReqId` + upstream echo); Prettier (`format` / `format:check`); OpenAPI problem-code validation script; tests for `routes.json` ↔ `routes.example.json` and `openapi.yaml` `info.version` ↔ `package.json`.
- **crud-service:** OpenAPI `info.version` alignment tests; `.prettierignore` for prose/docs.

### Changed

- **Monorepo docs:** fix broken `_coding-standards` and [`model-matrix.md`](../../model-matrix.md) links in root, `auth`, and `gateway` changelogs/docs; [`local-ports.md`](./local-ports.md) service-tree path.
- **README.md:** fix broken links to `_coding-standards` (use `../../` from monorepo root).
- **ARCHITECTURE.md:** bump to v1.1.0; reflect implemented session revocation (O-16/D3) using `token_gen` and Redis; update sequence diagrams.
- **RUNBOOK.md:** fix folder names (`auth-service` → `auth`, `gateway-service` → `gateway`), broken links, and upstream examples (`crud-service`).
- **auth:** `docs/architecture.md` v1.4.1 — TOC/anchors, companion links, MongoDB index pointer to `docs/db/erd.md`; `docs/session-revoke-token-gen-changes.md` metadata; `init-db` comment → `docs/db/erd.md`.
- **gateway:** `docs/architecture.md` v1.4.1 — `GATEWAY_CLAIM_REJECTED` documented as **401**; [`openapi.yaml`](./gateway/openapi.yaml) title `gateway`, login `client_kind` enum `[native, web]` aligned with auth; **`/auth` proxy route** in [`routes.json`](./gateway/routes.json) / [`routes.example.json`](./gateway/routes.example.json); README document map + local dev tables.
- **crud-service:** docs resync (`architecture.md`, `docs/db/erd.md` v1.0.2, README/RUNBOOK); fix monorepo [`CHANGELOG.md`](../../../CHANGELOG.md) link depth; Spectral extends path.
- **Gateway routes:** `/api/v1/members` → `/api/v1/staff`; port **3004** reserved for planned [`services/staff/`](./services/staff/) (docs-only, gitignored locally).
- **`auth/.env.example`**, **`gateway/.env.example`:** default `CORS_ORIGINS` empty (no in-repo browser SPA).

### Removed

- **auth:** `docs/adr-001-fastify-esm.md` (superseded by `docs/adrs/001-fastify-esm.md`).

### Removed (prior layout)

- **`www/`** — Vite/React client (`www/app/`) and frontend docs (`www/docs/`); API-only monorepo focus.
- **`PROJECT_TREE.md`** — monorepo folder SoT is [`ARCHITECTURE.md`](./ARCHITECTURE.md) plus per-package docs; package layout normative on parent workspace [`_coding-standards/backend/service-tree.md`](../../_coding-standards/backend/service-tree.md). Update [`README.md`](./README.md) document map.

### Added

- Version-control **`auth/`** service (Fastify IdP-style HTTP API, tests, `openapi.yaml`, docs) and **`services/.demo/crud-service/`** gateway mesh demo upstream.
- Add [`local-ports.md`](./local-ports.md) at repository root: central index of **default local HTTP ports** for dev (`auth`, `gateway`, demo upstream, optional **staff**); links from [`README.md`](./README.md) and [`RUNBOOK.md`](./RUNBOOK.md).
- Add strict gateway route file `gateway/routes.json` and switch runtime route source to `ROUTES_FILE=./routes.json`.
- Add gateway fallback for unmatched routes: `404 application/problem+json`, header `x-gateway-hit: true`, and code `GATEWAY_ROUTE_NOT_FOUND`.
- Add gateway `spec:lint` script for OpenAPI linting with org Spectral rules.
- Add standards registry entry `GATEWAY_ROUTE_NOT_FOUND` in `_coding-standards/gateway/codes.yaml`.

### Changed

- **Auth OpenAPI:** single SoT at `auth/openapi.yaml` — remove `auth/docs/openapi.yaml`; update **`gateway/openapi.yaml`** normative links and `RUNBOOK.md` document map paths.
- **Gateway OpenAPI:** single contract file at **`gateway/openapi.yaml`** (package root) — remove `gateway/docs/openapi.yaml`; `spec:lint` และเอกสารชี้ path ใหม่.
- Move CRUD sample upstream to **`services/.demo/crud-service/`** and rename npm package to **`crud-service`** (was `demo-crud-service` at repo root). Docs and gateway links updated. Historical changelog subsections below still use the name **reference** for releases at that time.
- Consolidate repository service layout: `auth/`, `gateway/`, and sample upstream under **`services/.demo/crud-service/`** at zero-platform root (no `access/` wrapper).
- Align `auth` runtime/contract behavior with auth SoT, including canonical RFC7807 mapping and client-kind semantics.
- Update gateway code matrix behavior: `GATEWAY_CLAIM_REJECTED` now maps to HTTP `401`, and JWT verify failures map to `GATEWAY_JWT_REJECTED`.
- Update `crud-service` `/api/v1/me` payload key order to `ou`, `branch`, `userId`, `role`.
- Refresh repository docs (`README.md`, `ARCHITECTURE.md`, `RUNBOOK.md`) and gateway docs/spec to match new route-miss behavior.
- **`ARCHITECTURE.md`:** companion SoT / demo links use root layout paths (`gateway/`, `auth/`, `services/.demo/crud-service/`) instead of legacy `access/` prefixes.

### Fixed

- Standardize refresh token rejection mapping in auth to `TOKEN_REFRESH_REJECTED` (replacing legacy split codes).
- Align `crud-service` service quality gates and docs with `_coding-standards/backend` expectations.

### Removed

- Remove vendored **`_coding-standards/`** at zero-platform root — org SoT is **`_coding-standards/`** on the parent **ai-agent** workspace only (`gateway` / `auth` `spec:lint` already use `../../_coding-standards/...`).
- Remove broad gateway catch-all routing in favor of explicit allowlisted prefixes.

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
