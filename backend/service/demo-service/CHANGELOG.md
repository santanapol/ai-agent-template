# Changelog

All notable changes to the **demo-service** package (`services/.demo/demo-service/`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this package adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) together with `package.json` / `openapi.yaml` `info.version`.

Monorepo-level history (gateway, auth, layout moves) stays in the repository root [`CHANGELOG.md`](../../../../CHANGELOG.md).

## [Unreleased]

### Added

- `scripts/init-db.mjs` — create `items` indexes (`IDX_ITEMS_TENANT_*`) per `docs/db/erd.md`.
- `scripts/seed-example-data.mjs` — upsert three demo items; optional `--reset-items`; `SEED_OU_ID` / `SEED_BRANCH_ID` for gateway E2E alignment with auth seed.
- `scripts/mongo-create-demo-user.md` — MongoDB role `demo_service_role` and user `demo-service`.
- npm scripts `init:db`, `seed:example`.

### Changed

- Package path: `backend/demo-service/` → **`backend/service/demo-service/`** (no API behavior change).
- `/healthz` — minimal JSON (`status`, `timestamp`, `uptime` seconds since app start); no std.min envelope.
- `/readyz` — `{ status, dependencies: [{ name: "database", status }] }` on success; `503` + RFC 7807 problem (`SERVICE_NOT_READY`) when Mongo ping fails.
- Default `DB_NAME` and documentation: `api_example` → **`demo-service`**.
- `.env.example` / `RUNBOOK.md` / `README.md` — quick start includes DB bootstrap; Mongo URI uses `demo-service` user.

## [0.1.1] - 2026-05-21

### Added

- `docs/architecture.md` (service SoT: trust boundary, HTTP surface, persistence; links to `docs/db/erd.md` for MongoDB + ERD + data dictionary + indexes).
- `docs/db/erd.md` (MongoDB connection/lifecycle/security, ER diagram, `items` data dictionary, full index audit with `explain` snippets).
- OpenAPI alignment tests — `info.version` ↔ `package.json` for `openapi.yaml` and `openapi-via-gateway.yaml`.
- `.prettierignore` — exclude `docs/` (prose SoT; with README/RUNBOOK).

### Changed

- `.spectral.yaml` — fix extends path to org `org-api.yaml` (`../../../../../`).
- `README.md` — compact document map (auth/gateway style), Scripts bullets, gateway routes (`/api/v1/me` + items), `.prettierignore` for README; link `docs/bruno/`.
- `RUNBOOK.md` — compact tables/TOC, fix `_coding-standards` paths, drop HTML anchors; **§ Smoke ผ่าน gateway** (terminals, pre-flight, `try:proxy`, manual `curl`); exclude from Prettier.
- **`/service-docs resync` (docs/):** `architecture.md` v1.0.4 — org std links, `codes.yaml` in Related; `adrs/001` cross-links; §3 middleware + PUT/ADR/ETag; §6 Operations.
- `docs/db/erd.md` v1.0.2 — package version, org `mongodb.md`, tenant hex24, list pagination, recommended unique `code` index (§6.3).
- `RUNBOOK.md` (package root): align default port **`3003`**, clarify monorepo vs package root, recommend **`npm run ci`** / **`format:check`**, document **`Accept`**, **`GET /api/v1/me`**, **`GET /metrics`**, and expanded smoke **`curl`** examples.
- Consolidate MongoDB documentation into **`docs/db/erd.md`** only; remove **`docs/db/database.md`** and **`docs/db/items.md`** (content merged into `erd.md`).
- Fix monorepo [`CHANGELOG.md`](../../../CHANGELOG.md) link depth.

## [0.1.0] - 2026-05-12

### Added

- Package-level changelog (this file), per `_coding-standards/backend/docs-layout.md`.

### Changed

- Document release baseline for this SemVer: sample upstream on **`PORT` default `3003`**, **`GET /api/v1/me`**, **items CRUD** under `/api/v1/items`, mesh **`x-gateway-secret`** + gateway-injected **`x-user-*`**, and Prometheus **`GET /metrics`** (see [`README.md`](./README.md) and root [`openapi.yaml`](./openapi.yaml)).
