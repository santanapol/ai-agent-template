# branch-report — Technical architecture

**Package:** `backend/service/branch-report/` · Fastify 5 · MongoDB 7 · ESM · port **3015**

## Layout

```
src/
├── app.js / server.js
├── config/database.js
├── lib/             # channel-filter, member-metrics, pagination, response
├── plugins/         # gateway-auth, user-context, request-id
├── modules/
│   ├── invite-links/
│   └── royalty-21-times/
└── routes/health.route.js
openapi.yaml
```

## Trust boundary

- **No JWT verify** — `GATEWAY_SHARED_SECRET` header + mesh `x-user-*`
- **No** `x-user-permissions` check in service (gateway/UI responsibility)
- `requireBranch: true` on user-context

## Configuration

| Env | Purpose |
|-----|---------|
| `PORT` | default 3015 |
| `GATEWAY_SHARED_SECRET` | mesh shared secret (matches gateway `GATEWAY_SECRET`) |
| `MONGODB_URI_READ` | branch DB read connection |
| `MONGODB_DB_BRANCH` | database name (e.g. `gpp_777ww`) |

## Integrations

| Peer | Contract |
|------|----------|
| gateway | `/api/v1/branch-report` → `:3015` in `routes.json` |

## Error model

JSON envelope `{ success, code, message, data, requestId }` — param errors via `createParamError`
