# gateway — Technical architecture

> **Package:** `backend/gateway/` — **OBSERVED** จาก source scan 16/16 `src/` files

## 1. Stack & layout

```
backend/gateway/
├── src/
│   ├── server.js              # dotenv routes reapply → loadEnv → buildApp
│   ├── app.js                 # Fastify, CORS, Redis, health, proxies
│   ├── config/env.js          # fail-fast validation
│   ├── config/routes.js       # ROUTES_JSON / ROUTES_FILE
│   ├── plugins/jwt-auth.js    # JWKS + token_gen
│   ├── plugins/inject-context.js
│   ├── proxy/register-proxies.js
│   └── lib/                   # claims, redis-token-gen, problems, errors
├── routes.json                # default route table
├── openapi.yaml               # edge contract
├── test/                      # node:test (not Jest — doc drift vs ADR 001)
└── scripts/validate-gateway-openapi-problem-codes.mjs
```

## 2. Startup lifecycle

1. `reapply-routes-env-from-dotenv.js` — fix shell override of routes
2. `loadEnv()` — reject missing `JWT_JWKS_URL`, prod without `REDIS_URL`
3. `buildApp()` — register CORS, Redis client, proxies
4. Listen `PORT` (default 3000)
5. Graceful shutdown — quit Redis, close Fastify (`SHUTDOWN_TIMEOUT_MS`)

## 3. JWT verification (`jwt-auth.js`)

- Fetch JWKS from `JWT_JWKS_URL` (cached)
- Optional `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_LEEWAY_SECONDS` (default 60)
- `parseTokenGenFromPayload` — integer ≥ 0 or numeric string
- Redis gate when `redisClient` present:
  - Key: `user:{sub}:token_gen` (`redis-token-gen.js`)
  - `getCurrentTokenGenFromRedis(..., { rejectIfMissing: true })` in prod path
  - `jwtGen < currentGen` → stale → 401

## 4. Context injection (`inject-context.js`)

Claim env defaults (`env.js`):

| Env | Default claim |
|-----|---------------|
| `JWT_CLAIM_USER_ID` | `sub` |
| `JWT_CLAIM_ROLE` | `role` |
| `JWT_CLAIM_OU` | `ou_id` |
| `JWT_CLAIM_BRANCH` | `branch_id` |
| `JWT_CLAIM_HOME_BRANCH` | `home_branch_id` |

`permissions` array → `x-user-permissions` comma-separated (no wildcards expanded).

## 5. Proxy registration (`register-proxies.js`)

- Sort routes longest-prefix-first
- Public: no `verifyJwt` / `injectContext`
- Protected: `preHandler: [verifyJwt, injectContext]`
- Strip headers before inject (see `app.js` STRIP_HEADERS)
- **ไม่** forward `Authorization` on protected routes
- Per-route `timeoutMs` override (smart-report validate/test-run)

## 6. Configuration (env)

| Variable | Required (prod) | Notes |
|----------|-----------------|-------|
| `JWT_JWKS_URL` | yes | auth JWKS endpoint |
| `GATEWAY_SECRET` | yes | ≥ 32 bytes recommended |
| `REDIS_URL` | yes (prod) | token_gen gate |
| `ROUTES_JSON` or `ROUTES_FILE` | yes | proxy table |
| `UPSTREAM_TIMEOUT_MS` | yes | default upstream timeout |
| `MAX_BODY_BYTES` | recommended | default 1 MiB |
| `TRUST_PROXY` | behind LB | |
| `CORS_ORIGINS` | optional | comma-separated |

## 7. Health probes

| Path | Checks |
|------|--------|
| `/healthz` | process alive |
| `/readyz` | JWKS reachable + Redis PING (if configured) |

## 8. Error mapping

`gateway-problems.js` + `problem.js` — types under org problem base URI.  
Validator: `scripts/validate-gateway-openapi-problem-codes.mjs` ↔ `coding-standard/gateway/codes.yaml`

## 9. Cross-service sync

| Contract | Peer | SoT |
|----------|------|-----|
| JWKS URL | auth | auth `/.well-known/jwks.json` |
| `token_gen` Redis key | auth | `user:{sub}:token_gen` |
| JWT claims | auth | auth `signAccessJwt()` |
| Header names | staff, others | this doc §4 |

## 10. References

- [business-domain.md](./business-domain.md)
- [database-erd.md](./database-erd.md) — Redis keys
- Legacy detail: [backend/gateway/docs/architecture.md](../../../../backend/gateway/docs/architecture.md) (superseded by central spec)
- ADR: [backend/gateway/docs/adrs/001-gateway-esm-fastify.md](../../../../backend/gateway/docs/adrs/001-gateway-esm-fastify.md)
