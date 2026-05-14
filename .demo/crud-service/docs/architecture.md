# crud-service — architecture (package SoT)

This file is the **single service-level design summary** for the `.demo/crud-service` sample upstream (Express + MongoDB) in the `access-platform` monorepo. It complements the HTTP contract in the repository root [`openapi.yaml`](../openapi.yaml).

## Role

- **Demo / teaching** internal API behind the gateway mesh: **`GET /api/v1/me`** plus **CRUD on `items`** under **`/api/v1/items`**.
- **Default listen port:** `3003` (`PORT`); database name default **`api_example`** (`DB_NAME` in [`../.env.example`](../.env.example)).

## Trust boundary

- **`x-gateway-secret`:** shared mesh secret; required on **`/api/v1/*`** and **`GET /metrics`** (see [`../src/app.js`](../src/app.js)).
- **`x-user-id`**, **`x-user-ou`**, **`x-user-branch`:** required user/tenant context for **`/api/v1/*`** (injected by gateway in real deployments — never take identity from untrusted client body for `me`).
- **`x-user-role`:** optional; used when present.
- **`GET /healthz`** and **`GET /readyz`:** no gateway secret at runtime wiring (public probes); readiness checks MongoDB connectivity.

**Intended production path:** Clients call **`gateway`** with **`Authorization: Bearer <JWT>`**; **`gateway`** verifies the JWT, **does not** forward **`Authorization`** to this service, injects **`x-user-*`**, and attaches **`x-gateway-secret`** before proxying here. This package validates the mesh secret, then uses those headers for identity and tenant scope. System flow, trust zones, defense in depth (private network + mesh secret), and sequence diagrams live in monorepo **[`ARCHITECTURE.md`](../../../ARCHITECTURE.md)** — read that file for the full mesh picture; this section only states what **this** package assumes.

**Why `x-user-*` is treated as trusted (when the contract holds):** Headers are not inherently trustworthy on the public internet. In the intended deployment, internal listen addresses **should** accept inbound only from **`gateway`** (network allow-list), and **`x-gateway-secret`** is the shared application check that the hop is from **`gateway`**, not a random client forging **`x-user-*`**.

**Local / direct calls:** Calling this process **directly** on **`PORT`** (default **`3003`**) bypasses **`gateway`** unless you run the full stack. For **`/api/v1/*`** you must supply **`x-gateway-secret`** and **`x-user-*`** yourself (see [`openapi.yaml`](../openapi.yaml)). That is a **development convenience**, not the production trust model. For traffic through **`gateway`** (client sends **`Authorization: Bearer`** only; **`gateway`** injects mesh headers), import **[`openapi-via-gateway.yaml`](../openapi-via-gateway.yaml)** (Bruno/Postman; server **`3002`**), plus [`README.md`](../README.md) (routing + env) and monorepo **[`gateway/docs/architecture.md`](../../../gateway/docs/architecture.md)**.

## HTTP surface (summary)

| Area    | Path prefix                                            | Notes                                                                  |
| ------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| Probes  | `/healthz`, `/readyz`                                  | JSON envelope; `readyz` pings MongoDB                                  |
| Metrics | `/metrics`                                             | Prometheus text; requires `x-gateway-secret`                           |
| API     | `/api/v1/me`, `/api/v1/items`, `/api/v1/items/:itemId` | Mesh + user headers + JSON rules per [`openapi.yaml`](../openapi.yaml) |

## Source layout (code)

- **Domain modules:** [`../src/modules/items/`](../src/modules/items/), [`../src/modules/me/`](../src/modules/me/)
- **Observability:** [`../src/observability/`](../src/observability/) (Prometheus + latency report helper + tests)
- **Composition:** [`../src/app.js`](../src/app.js) mounts `/api/v1` and wires middleware order (logging skips probes/metrics path).

## Persistence

- **Engine:** MongoDB (single database; collection **`items`** only for this demo’s writes). **ERD, data dictionary, index audit, connection/lifecycle:** [`db/erd.md`](./db/erd.md).
- **Tenant scoping:** every persisted item row carries **`ou_id`** and **`branch_id`** aligned with `x-user-ou` / `x-user-branch` (see repository filter in [`../src/modules/items/items.repository.js`](../src/modules/items/items.repository.js)).

### `GET /api/v1/me`

- **No MongoDB document** for “me”: the handler derives the response **only** from trusted headers (`me.service.js`).

## ERD (persisted `items` document)

Canonical **Mermaid ER diagram**, **data dictionary** (field-level), and **index summary** live in **[`db/erd.md`](./db/erd.md)** so this file stays a short architecture index.

**Cardinality (reminder):** each `items` row is scoped by **`(ou_id, branch_id)`**; there is no separate `tenants` collection in this package. **`me`** is not a stored row — it is a **projection of trusted request headers**.

## Related documents

- [`db/erd.md`](./db/erd.md) — MongoDB (connection, lifecycle, security), ERD, `items` data dictionary, index audit
- [`RUNBOOK.md`](../RUNBOOK.md) — operations
- [`adrs/001-put-full-replace.md`](./adrs/001-put-full-replace.md) — intentional `PUT` teaching pattern
- [`openapi-via-gateway.yaml`](../openapi-via-gateway.yaml) — client OpenAPI when calling through **`gateway`** (Bearer JWT only)
- Monorepo context: [`../../../ARCHITECTURE.md`](../../../ARCHITECTURE.md) (when cloned inside this workspace layout)
