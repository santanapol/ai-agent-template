# Changelog

All notable changes to this repository are recorded here. Each deployable service keeps its own SemVer in `package.json`; release notes below group changes by **repository snapshot**. For line-level history per service, see `access/gateway/CHANGELOG.md` and `access/auth/CHANGELOG.md`.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) per service `package.json` / OpenAPI `info.version` where applicable.

## [Unreleased]

### Added

- Add strict gateway route file `access/gateway/routes.json` and switch runtime route source to `ROUTES_FILE=./routes.json`.
- Add gateway fallback for unmatched routes: `404 application/problem+json`, header `x-gateway-hit: true`, and code `GATEWAY_ROUTE_NOT_FOUND`.
- Add gateway `spec:lint` script for OpenAPI linting with org Spectral rules.
- Add standards registry entry `GATEWAY_ROUTE_NOT_FOUND` in `_coding-standards/gateway/codes.yaml`.

### Changed

- Consolidate repository service layout under `access/*` and remove legacy top-level service paths.
- Align `access/auth` runtime/contract behavior with auth SoT, including canonical RFC7807 mapping and client-kind semantics.
- Update gateway code matrix behavior: `GATEWAY_CLAIM_REJECTED` now maps to HTTP `401`, and JWT verify failures map to `GATEWAY_JWT_REJECTED`.
- Update `access/reference` `/api/v1/me` payload key order to `ou`, `branch`, `userId`, `role`.
- Refresh repository docs (`README.md`, `ARCHITECTURE.md`, `RUNBOOK.md`) and gateway docs/spec to match new route-miss behavior.

### Fixed

- Standardize refresh token rejection mapping in auth to `TOKEN_REFRESH_REJECTED` (replacing legacy split codes).
- Align `access/reference` service quality gates and docs with `_coding-standards/backend` expectations.

### Removed

- Remove broad gateway catch-all routing in favor of explicit allowlisted prefixes.

## [0.1.1] - 2026-04-17

### access/gateway (0.1.1)

- Hardening: `GATEWAY_SECRET` must be at least 32 characters.
- Security: default error handler no longer forwards raw `Error` objects to clients for non-proxy failures; server logs full error only.
- Observability: on JWT verify failure, log at `debug` with `jwtVerifyFailedCode` (no token / no PII).
- Docs: deploy JWT/env checklist; OpenAPI description links to it.

### access/reference (0.1.1)

- Hardening: `GATEWAY_SECRET` must be at least 32 characters.
- Docs: OpenAPI `info` links to deploy JWT/env checklist.

## [0.1.0] - 2026-04-17

### access/gateway (0.1.0)

- Initial `gateway`: JWKS verify, header contract, prefix proxy routes, `/health`, graceful shutdown; minimal OpenAPI.

### access/reference (0.1.0)

- Initial `internal-api`: `GET /health`, `GET /api/v1/me` protected by `x-gateway-secret` (constant-time compare), response envelope per team API response standard.

### access/auth (0.1.0)

- Initial `auth`: self-hosted identity provider (login, refresh, JWT issuance) per `access/auth/docs/architecture.md`; OpenAPI and env examples in-repo.
