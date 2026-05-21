# Changelog

All notable changes to the **crud-service** package (`services/.demo/crud-service/`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this package adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) together with `package.json` / `openapi.yaml` `info.version`.

Monorepo-level history (gateway, auth, layout moves) stays in the repository root [`CHANGELOG.md`](../../CHANGELOG.md).

## [Unreleased]

### Added

- `docs/architecture.md` (service SoT: trust boundary, HTTP surface, persistence; links to `docs/db/erd.md` for MongoDB + ERD + data dictionary + indexes).
- `docs/db/erd.md` (MongoDB connection/lifecycle/security, ER diagram, `items` data dictionary, full index audit with `explain` snippets).

### Changed

- `RUNBOOK.md` (package root; relocated from `docs/RUNBOOK.md`): align default port **`3003`**, clarify monorepo vs package root, recommend **`npm run ci`** / **`format:check`**, document **`Accept`**, **`GET /api/v1/me`**, **`GET /metrics`**, and expanded smoke **`curl`** examples; fix links to `openapi.yaml`, `_coding-standards/`, and `docs/db/erd.md` for the new path.
- Consolidate MongoDB documentation into **`docs/db/erd.md`** only; remove **`docs/db/database.md`** and **`docs/db/items.md`** (content merged into `erd.md`).

## [0.1.0] - 2026-05-12

### Added

- Package-level changelog (this file), per `_coding-standards/backend/docs-layout.md`.

### Changed

- Document release baseline for this SemVer: sample upstream on **`PORT` default `3003`**, **`GET /api/v1/me`**, **items CRUD** under `/api/v1/items`, mesh **`x-gateway-secret`** + gateway-injected **`x-user-*`**, and Prometheus **`GET /metrics`** (see [`README.md`](./README.md) and root [`openapi.yaml`](./openapi.yaml)).
