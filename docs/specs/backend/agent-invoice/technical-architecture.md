# agent-invoice — Technical architecture

**Package:** `backend/service/agent-invoice/` · Fastify 5 · MongoDB 7 · ESM

## Layout

```
src/
├── app.js / server.js
├── config/          # env, mongo collections
├── lib/             # response, permissions, object-id, invoice-serialize
├── plugins/         # gateway guard, user-context, mongodb
└── modules/
    ├── agents/      # agents.route.js, service, repository
    ├── agent-fees/  # fees + master-data routes
    └── invoices/    # agent-invoices.route.js, generate, list, fee calc
scripts/init-db.mjs
openapi.yaml
```

## Trust boundary

- **No JWT verify** — trusts `x-gateway-secret` + `x-user-*` from gateway
- `requirePermission()` on routes — permission keys from `x-user-permissions`

## Key services

| Module | Responsibility |
|--------|----------------|
| `generate.service.js` | Bulk invoice creation for month + branch |
| `list-invoices.service.js` | Paginated list with branch name join |
| `calculate-fee.service.js` | Fee run with If-Match optimistic lock |
| `agents.service.js` | CRUD + sync unsynced branches |

## Configuration

See `.env.example` — `MONGODB_URI`, `GATEWAY_SHARED_SECRET`, `PORT` (3102)

## Integrations

| Peer | Contract |
|------|----------|
| gateway | routes `/api/v1/agent-invoice`, `/api/v1/invoices` |
| staff | indirect — shared OU/branch ObjectIds |
| branch master | sync endpoint pulls unsynced branches |

## Error model

Problem-style envelopes via `lib/response.js` — codes in OpenAPI components (no package `codes.yaml`)
