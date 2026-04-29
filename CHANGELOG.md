# Changelog

All notable changes to this repository are recorded here. Each deployable service keeps its own SemVer in `package.json`; release notes below group changes by **repository snapshot**. For line-level history per service, see `access/gateway/CHANGELOG.md` and `access/auth/CHANGELOG.md`.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) per service `package.json` / OpenAPI `info.version` where applicable.

## [Unreleased]

### Repository

- Consolidate service layout under `access/*` and remove legacy top-level paths (`auth-service`, `gateway-service`, `internal-api`).
- Introduce `access/reference` as the maintained internal API reference service with OpenAPI, middleware, tests, and runbook docs.
- Refresh root docs (`README.md`, `ARCHITECTURE.md`, `RUNBOOK.md`) and add `services/README.md` to reflect the new structure.
- Convert `_coding-standards` from embedded gitlink to regular tracked repository files to keep standards versioned directly in this monorepo snapshot.

### access/auth

- Align auth runtime and contract behavior with auth SoT: RFC7807 problem mapping, canonical type/status/code set, `423` account lock semantics, and `web|native` client kind contract.
- Add standards guard `spec:codes` (`scripts/validate-auth-openapi-problem-codes.mjs`) and strengthen integration coverage for readiness failure and `TZ=UTC` environment enforcement.

### access/gateway

- Move gateway service into `access/gateway`, keep health/proxy/JWT behavior, and refresh architecture/openapi/test/docs paths for the consolidated repository layout.

### gateway-service

- Default route table: proxy **`/api/v1/items`** และ catch-all **`/api`** ไป **`reference`** ที่ `http://127.0.0.1:3003` (รวม **`/api/v1/me`**) — `routes.example.json` + `.env.example` `ROUTES_JSON`.
- **Code matrix ([`CODE_MATRIX_TARGET.md`](../../CODE_MATRIX_TARGET.md)):** **`GATEWAY_CLAIM_REJECTED`** → **HTTP 401**; JWT verify failures → **`GATEWAY_JWT_REJECTED`** (แทน `GATEWAY_JWT_INVALID` / `GATEWAY_JWT_EXPIRED`) — ดู `gateway-service/CHANGELOG.md`.

### auth-service

- **Code matrix:** refresh token ผิด / reuse → **`TOKEN_REFRESH_REJECTED`** (แทน `TOKEN_REFRESH_INVALID` / `TOKEN_REFRESH_REUSED`).

### api-example

- **Remove `internal-api`:** รวมบทบาท mock + catch-all **`/api`** ไว้ที่บริการเดียว — เพิ่ม **`GET /api/v1/me`** (trusted headers) + อัปเดต OpenAPI / `routes.example.json` / runbook
- **Code matrix ([`CODE_MATRIX_TARGET.md`](../../CODE_MATRIX_TARGET.md)):** mesh secret → **`GATEWAY_SECRET_REJECTED`**; 404 route → **`NO_MATCHING_API_PATH`**; item 404/409 → **`RESOURCE_NOT_FOUND`** / **`DUPLICATE`**; **201** + **`CREATED`**; **`DATASTORE_CREDENTIAL_REJECTED`** (เช่น Mongo **`MongoServerError` code 18**); **`/readyz`** error **`data: null`**; คำขอที่มี body แต่ไม่มี `Content-Type` → **400** + `MISSING_CONTENT_TYPE`.
- **`docs/openapi-via-gateway.yaml`:** client-facing spec for **`gateway`** (Bearer JWT only; no client `x-gateway-secret` / `x-user-*`); cross-link from root [`openapi.yaml`](api-example/openapi.yaml) + README.
- Align with **`_coding-standards/backend`:** OpenAPI (`info`, `tags`, `operationId`, envelopes, canonical header order, **`GET /metrics`**), Spectral (`spec:lint`, `.spectral.yaml`), **`prom-client`** + gateway-protected **`/metrics`**, pino **redaction** + **`npm run ci`** (format, lint, spec, test, audit).
- Register **`API_EXAMPLE_ITEM_DUPLICATE`** in `_coding-standards/backend/codes.yaml`; ADR **`docs/adrs/001-put-full-replace.md`** for intentional **`PUT`** full replace.

### Docs

- Service design SoT files moved to `docs/architecture.md` for `gateway` and `auth`; updated cross-links and monorepo index.
- Monorepo operations: `docs/deploy-jwt-env-checklist.md` merged into [`RUNBOOK.md`](RUNBOOK.md#deploy-jwt-env) (single runbook + deploy checklist).
- **`reference`:** index in monorepo [`README.md`](README.md); align [`api-example/.env.example`](api-example/.env.example) `GATEWAY_SHARED_SECRET` with gateway `GATEWAY_SECRET`; note default gateway route in [`api-example/README.md`](api-example/README.md); document upstream table in [`gateway-service/README.md`](gateway-service/README.md) and [`RUNBOOK.md`](RUNBOOK.md).

## [0.1.1] - 2026-04-17

### gateway-service (0.1.1)

- Hardening: `GATEWAY_SECRET` must be at least 32 characters.
- Security: default error handler no longer forwards raw `Error` objects to clients for non-proxy failures; server logs full error only.
- Observability: on JWT verify failure, log at `debug` with `jwtVerifyFailedCode` (no token / no PII).
- Docs: deploy JWT/env checklist; OpenAPI description links to it.

### internal-api (0.1.1)

- Hardening: `GATEWAY_SECRET` must be at least 32 characters.
- Docs: OpenAPI `info` links to deploy JWT/env checklist.

## [0.1.0] - 2026-04-17

### gateway-service (0.1.0)

- Initial `gateway`: JWKS verify, header contract, prefix proxy routes, `/health`, graceful shutdown; minimal OpenAPI.

### internal-api (0.1.0)

- Initial `internal-api`: `GET /health`, `GET /api/v1/me` protected by `x-gateway-secret` (constant-time compare), response envelope per team API response standard.

### auth-service (0.1.0)

- Initial `auth`: self-hosted identity provider (login, refresh, JWT issuance) per `auth-service/docs/architecture.md`; OpenAPI and env examples in-repo.
