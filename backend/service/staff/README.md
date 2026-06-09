# staff-service

Internal **Fastify 5** API for back-office staff profiles (`staff_profiles`). Runs behind the **gateway** mesh on port **3101**; does not verify JWT locally.

## Documentation

| Doc                                                                  | Purpose                                 |
| -------------------------------------------------------------------- | --------------------------------------- |
| [`docs/business-domain.md`](./docs/business-domain.md)               | Business rules, RBAC, HTTP intent       |
| [`docs/technical-architecture.md`](./docs/technical-architecture.md) | Mesh, outbound auth, observability      |
| [`docs/database-erd.md`](./docs/database-erd.md)                     | Collections, indexes                    |
| [`RUNBOOK.md`](./RUNBOOK.md)                                         | Env, DB init, gateway curls, manual E2E |
| [`openapi.yaml`](./openapi.yaml)                                     | Internal mesh contract                  |
| [`openapi-via-gateway.yaml`](./openapi-via-gateway.yaml)             | Client import (Bearer via gateway)      |
| [`_mission-control/SPEC.md`](./_mission-control/SPEC.md)             | Build spec & acceptance criteria        |

## Requirements

- **Node.js** `>=24 <25`
- **MongoDB** (shared with auth in dev — same `MONGODB_URI` / `DB_NAME`)
- **auth** internal API (provision, password, revoke) when using write paths

## Quick start

```bash
cd backend/service/staff   # monorepo path; folder name may include trailing space in some clones
cp .env.example .env
npm install
npm run init:db
npm run dev
```

| Endpoint                   | Auth         | Notes                       |
| -------------------------- | ------------ | --------------------------- |
| `GET /healthz`             | none         | Liveness                    |
| `GET /readyz`              | none         | Mongo ping                  |
| `GET /metrics`             | mesh headers | When `METRICS_ENABLED=true` |
| `/api/v1/staff/profiles/*` | mesh headers | See RUNBOOK                 |

## Scripts

| Script                     | Description                                                             |
| -------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`              | Watch mode (`PORT=3101`)                                                |
| `npm start`                | Production start                                                        |
| `npm test`                 | `node --test` (integration needs `MONGODB_URI`)                         |
| `npm run test:coverage`    | Coverage report                                                         |
| `npm run coverage:gate`    | Fail if function coverage or line coverage per file &lt; 80% on targets |
| `npm run ci`               | lint + format + spec:lint + test + audit                                |
| `npm run ci:with-coverage` | `ci` + coverage gate                                                    |
| `npm run init:db`          | Indexes + optional JSON schema                                          |
| `npm run spec:lint`        | Spectral on OpenAPI                                                     |

## Environment

Copy [`.env.example`](./.env.example). Critical variables:

- `PORT` — default `3101`
- `MONGODB_URI`, `DB_NAME` — shared auth DB
- `GATEWAY_SHARED_SECRET` — must match gateway `GATEWAY_SECRET`
- `AUTH_INTERNAL_BASE_URL`, `AUTH_INTERNAL_SERVICE_SECRET` — staff → auth
- `STAFF_PROVISION_DEFAULT_ROLE` — default `staff`
- `AUTH_REVOKE_MAX_RETRIES`, `AUTH_REVOKE_BACKOFF_MS` — archive revoke retry
- `METRICS_ENABLED` — expose `/metrics`

Use unique high-entropy secrets per environment. Known sample/dev secrets are rejected in production startup validation.

## Gateway routing

Gateway prefix **`/api/v1/staff`** → upstream `127.0.0.1:3101` (see monorepo `gateway/routes.json`). Clients send **`Authorization: Bearer <JWT>`**; gateway injects `x-gateway-secret` and `x-user-*` headers.

## Tests

Integration tests require Mongo:

```bash
NODE_ENV=test TZ=UTC npm test
```

Without `MONGODB_URI`, integration suites skip; unit tests still run. CI expects a reachable Mongo when configured in `.env`.

## Related services (local E2E)

| Service   | Port     |
| --------- | -------- |
| auth      | 3001     |
| gateway   | 3000     |
| **staff** | **3101** |

Full manual checklist: [`RUNBOOK.md`](./RUNBOOK.md).
