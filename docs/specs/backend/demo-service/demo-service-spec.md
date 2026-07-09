---
status: implemented
created: 2026-07-09
updated: 2026-07-09
owner: Berlin
last-verified: 2026-07-09
---

# Spec: Demo Service

Sample internal API (Fastify 5) for `zero-platform` — reference / teaching service for mesh trust headers, items CRUD, and dual OpenAPI specs.

**Not a production domain service.** Use for gateway smoke, coding-standard examples, and onboarding.

## Source of Truth

| Topic | SoT | Notes |
|-------|-----|-------|
| Overview + quick start | [README.md](../../../../backend/service/demo-service/README.md) | Scripts, env, gateway routes |
| Technical architecture | [architecture.md](../../../../backend/service/demo-service/docs/architecture.md) | Trust boundary, HTTP, persistence |
| HTTP contract (direct mesh) | [openapi.yaml](../../../../backend/service/demo-service/openapi.yaml) | `:3002`, `x-user-*` headers |
| HTTP contract (via gateway) | [openapi-via-gateway.yaml](../../../../backend/service/demo-service/openapi-via-gateway.yaml) | `:3000`, Bearer JWT |
| Database | [erd.md](../../../../backend/service/demo-service/docs/db/erd.md) | ERD, indexes |
| Error codes | [codes.yaml](../../../../backend/service/demo-service/codes.yaml) | Sync with service error codes |
| Ops | [RUNBOOK.md](../../../../backend/service/demo-service/RUNBOOK.md) | Setup, smoke, troubleshooting |
| Org backend standards | [coding-standard/backend/](../../../../coding-standard/backend/) | Mesh, logging, testing conventions |

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (port **3002**) |
| `npm run ci` | lint + format + spec:lint + test + audit |
| `npm run spec:lint` | Spectral on both OpenAPI files |
| `npm run init:db` | Create indexes |
| `npm run seed:example` | Sample items for local E2E |

## API Endpoints (summary)

Normative detail: [openapi.yaml](../../../../backend/service/demo-service/openapi.yaml) · Gateway: [openapi-via-gateway.yaml](../../../../backend/service/demo-service/openapi-via-gateway.yaml)

| Group | Paths |
|-------|-------|
| Ops | `GET /healthz`, `GET /readyz`, `GET /metrics` |
| Profile | `GET /api/v1/me` |
| Items | `GET/POST/PUT/DELETE /api/v1/items`, `GET /api/v1/items/:id` |

Gateway prefix: `/api/v1/items`, `/api/v1/me` → upstream `:3002`.
