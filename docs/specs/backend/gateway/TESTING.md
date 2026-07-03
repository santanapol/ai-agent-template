# Testing — gateway

## Commands

```bash
cd backend/gateway
npm test
npm run ci   # lint + format + spec:lint + spec:codes + spec:consistency + test + audit
```

## Test layout

- **Framework:** `node:test` (not Jest — ADR 001 historical note)
- `test/app.health.test.js` — `/healthz`, `/readyz`
- `test/proxy.integration.test.js` — proxy + header injection
- `test/plugins/jwt-auth-token-gen.test.js` — token_gen gate
- `test/config/*` — env, routes alignment
- `test/lib/*` — claims, redis-token-gen, problems

## CI matrix

Included in monorepo `backend-checks` workflow when gateway `npm run ci` passes.

## Local smoke

```bash
npm run dev:upstream   # mock upstream
npm run try:proxy      # curl through gateway
```

Requires `.env` with `JWT_JWKS_URL`, `GATEWAY_SECRET`, routes — see `backend/gateway/.env.example`
