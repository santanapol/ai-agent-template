# crud-service — architecture (package SoT)

## Metadata

| Field | Value |
| :--- | :--- |
| **Filename** | `docs/architecture.md` |
| **Document index** | [README.md](../README.md) |
| **Status** | Active — demo / teaching upstream |
| **OpenAPI** | [`openapi.yaml`](../openapi.yaml) (direct mesh `:3003`) · [`openapi-via-gateway.yaml`](../openapi-via-gateway.yaml) (client Bearer `:3002`) |
| **Scope** | Internal API หลัง **gateway** — ไม่ verify JWT; ไม่มี **`docs/domain.md`** (optional) |
| **Package version** | `0.1.1` |
| **Document version** | `1.0.4` |

| Layer | Document |
| :--- | :--- |
| Persistence | [`db/erd.md`](./db/erd.md) |
| Ops | [`RUNBOOK.md`](../RUNBOOK.md) |
| Monorepo | [`ARCHITECTURE.md`](../../../../ARCHITECTURE.md) |
| Gateway edge | [`gateway/docs/architecture.md`](../../../../gateway/docs/architecture.md) |

**TL;DR:** Client → **gateway** (Bearer JWT) → inject mesh headers → **crud-service** (`x-gateway-secret` + `x-user-*`) → MongoDB `items` / header-only `me`

## Contents

1. [Service role](#1-service-role)
2. [Trust boundary](#2-trust-boundary)
3. [HTTP surface](#3-http-surface)
4. [Source layout](#4-source-layout)
5. [Persistence](#5-persistence)
6. [Operations](#6-operations)
7. [Related documents](#7-related-documents)

## 1. Service role

| Item | Value |
| :--- | :--- |
| **Package path** | `services/.demo/crud-service/` |
| **Stack** | Express + CommonJS + MongoDB |
| **Listen** | `PORT` default **3003** |
| **Database** | `DB_NAME` default **`api_example`** — [`.env.example`](../.env.example) |
| **API** | `GET /api/v1/me` + CRUD **`/api/v1/items`** |

## 2. Trust boundary

### 2.1 Mesh headers (this service)

| Header | `/api/v1/*` | `/metrics` | Probes |
| :--- | :---: | :---: | :---: |
| `x-gateway-secret` | required | required | — |
| `x-user-id` | required | — | — |
| `x-user-ou` | required | — | — |
| `x-user-branch` | required | — | — |
| `x-user-role` | optional | — | — |

Wiring: [`../src/app.js`](../src/app.js) · สัญญาเต็ม: [`openapi.yaml`](../openapi.yaml)

### 2.2 Production path

1. Client → **gateway** with **`Authorization: Bearer`**
2. **Gateway** verifies JWT (JWKS), **does not** forward `Authorization` upstream
3. **Gateway** injects `x-gateway-secret` + `x-user-*` → proxy to this service
4. Service validates secret, applies tenant scope, runs handlers

ภาพรวม mesh: [`ARCHITECTURE.md`](../../../../ARCHITECTURE.md) · gateway SoT: [`gateway/docs/architecture.md`](../../../../gateway/docs/architecture.md)

### 2.3 Why `x-user-*` is trusted

- Internal listen **should** allow only **gateway** (network policy)
- **`x-gateway-secret`** proves the hop is from gateway, not a forged client header set

### 2.4 Local / direct (`:3003`)

เรียก process โดยตรง = **dev convenience** — ต้องส่ง mesh headers เองสำหรับ `/api/v1/*`

ผ่าน gateway: [`openapi-via-gateway.yaml`](../openapi-via-gateway.yaml) · smoke: [`RUNBOOK.md`](../RUNBOOK.md)

## 3. HTTP surface

| Area | Paths | Notes |
| :--- | :--- | :--- |
| Probes | `/healthz`, `/readyz` | std.min **envelope** JSON; `readyz` → Mongo ping |
| Metrics | `/metrics` | Prometheus text; `x-gateway-secret` only |
| API | `/api/v1/me`, `/api/v1/items`, `/api/v1/items/:itemId` | Mesh + user headers; errors → envelope + `code` ([`codes.yaml`](../codes.yaml)) |

**Items verbs:** `GET` list/detail · `POST` create · **`PUT` full replace** (teaching — [ADR 001](./adrs/001-put-full-replace.md)) · `PATCH` partial · `DELETE` with **`If-Match`** / **ETag** ([`tenant-audit`](../../../../../../_coding-standards/backend/tenant-audit.md))

**Gateway routes (local):** `/api/v1/items`, `/api/v1/me` → `:3003` — [`gateway/routes.json`](../../../../gateway/routes.json)

### 3.1 Middleware (`/api/v1` router)

ลำดับใน [`../src/app.js`](../src/app.js) (หลัง global `request-id`, duplicate-header guard):

| Order | Middleware | Purpose |
| :---: | :--- | :--- |
| 1 | `gateway-secret` | Validate `x-gateway-secret` |
| 2 | `user-context` | Require `x-user-id`, `x-user-ou`, `x-user-branch` |
| 3 | `rate-limit` | Per-route quotas (write stricter than read) |
| 4 | `enforceAccept` | `Accept` must allow JSON when sent |
| 5 | `enforceContentType` | Mutations require `application/json` |
| 6 | `express.json` | Body parse (`bodyLimit` from env) |

Global: **`x-request-id`** (generate/echo), **Helmet**, **Pino** HTTP log (skip probes/metrics path), **Prometheus** metrics hook

## 4. Source layout

| Area | Path |
| :--- | :--- |
| Items module | [`../src/modules/items/`](../src/modules/items/) |
| Me module | [`../src/modules/me/`](../src/modules/me/) |
| Middlewares | [`../src/middlewares/`](../src/middlewares/) |
| Observability | [`../src/observability/`](../src/observability/) |
| App wiring | [`../src/app.js`](../src/app.js) |

## 5. Persistence

| Topic | Detail |
| :--- | :--- |
| Engine | MongoDB — collection **`items`** only (writes) |
| Tenant | **`ou_id`**, **`branch_id`** on every row ↔ trusted headers — [`items.repository.js`](../src/modules/items/items.repository.js) |
| ERD / indexes | [`db/erd.md`](./db/erd.md) |
| **`GET /api/v1/me`** | **No DB read** — projection from trusted headers (`me.service.js`) |

## 6. Operations

| Topic | Where |
| :--- | :--- |
| Env / secrets | [`.env.example`](../.env.example) — `MONGODB_URI`, `GATEWAY_SHARED_SECRET`, `PORT`, pool sizes |
| Local smoke | [`RUNBOOK.md`](../RUNBOOK.md) — direct mesh + gateway E2E |
| CI | `npm run ci` — lint, format, Spectral, test, audit ([`package.json`](../package.json)) |
| Deploy | [`RUNBOOK.md`](../RUNBOOK.md) · PM2 [`ecosystem.config.cjs`](../ecosystem.config.cjs) |

## 7. Related documents

| Document | Role |
| :--- | :--- |
| [`openapi.yaml`](../openapi.yaml) | HTTP contract (direct mesh) |
| [`db/erd.md`](./db/erd.md) | MongoDB ERD, dictionary, indexes |
| [`adrs/001-put-full-replace.md`](./adrs/001-put-full-replace.md) | `PUT` teaching exception |
| [`openapi-via-gateway.yaml`](../openapi-via-gateway.yaml) | Client via gateway |
| [`bruno/`](./bruno/) | Optional HTTP collections |
| [`codes.yaml`](../codes.yaml) | Service error code snapshot |
| [`_coding-standards/backend`](../../../../../../_coding-standards/backend/README.md) | Org backend mesh standard |
