# staff-service — RUNBOOK

Operations guide for local dev, gateway E2E, and release checks.

## Ports

| Component       | Default port | Notes                     |
| --------------- | ------------ | ------------------------- |
| staff-service   | **3004**     | `PORT` in `.env`          |
| gateway         | 3002         | Proxies `/api/v1/staff/*` |
| auth (internal) | 3001         | `AUTH_INTERNAL_BASE_URL`  |

## Environment variables

| Variable                       | Required | Description                             |
| ------------------------------ | -------- | --------------------------------------- |
| `PORT`                         | yes      | HTTP listen (3004)                      |
| `NODE_ENV`                     | yes      | `development` / `test` / `production`   |
| `APP_NAME`                     | no       | Log label (`staff-service`)             |
| `MONGODB_URI`                  | yes      | Mongo connection string                 |
| `DB_NAME`                      | yes      | Database name (shared with auth)        |
| `GATEWAY_SHARED_SECRET`        | yes      | Must match gateway `GATEWAY_SECRET`     |
| `AUTH_INTERNAL_BASE_URL`       | yes      | e.g. `http://127.0.0.1:3001`            |
| `AUTH_INTERNAL_SERVICE_SECRET` | yes      | Bearer for staff → auth internal routes |
| `STAFF_PROVISION_DEFAULT_ROLE` | yes      | Role on provision (default `staff`)     |
| `AUTH_REVOKE_MAX_RETRIES`      | no       | Archive revoke attempts (default `3`)   |
| `AUTH_REVOKE_BACKOFF_MS`       | no       | Backoff base ms (default `200`)         |
| `METRICS_ENABLED`              | no       | `true` enables `GET /metrics`           |
| `LOG_LEVEL`                    | no       | pino level                              |
| `LOG_PRETTY`                   | no       | Pretty logs in dev                      |

Template: [`.env.example`](./.env.example).

## Database init

```bash
npm run init:db
```

Creates indexes on `staff_profiles` and optional `$jsonSchema`. Use the **same** `MONGODB_URI` / `DB_NAME` as auth.

## Health checks

```bash
curl -s http://127.0.0.1:3004/healthz | jq .
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3004/readyz   # 200 when Mongo up
```

## Direct mesh calls (bypass gateway)

For debugging staff without JWT. Replace IDs with valid 24-char hex from your DB.

```bash
export STAFF=http://127.0.0.1:3004
export SECRET='<dev-only-gateway-secret>'
export OU=507f1f77bcf86cd799439011
export BRANCH=507f1f77bcf86cd799439012
export ADMIN=507f1f77bcf86cd799439013

mesh() {
  curl -sS "$@" \
    -H "x-gateway-secret: ${SECRET}" \
    -H "x-user-id: ${ADMIN}" \
    -H "x-user-ou: ${OU}" \
    -H "x-user-branch: ${BRANCH}" \
    -H "x-user-role: platform_admin" \
    -H "accept: application/json"
}
```

Use sample secrets for local development only. Production must use unique high-entropy secrets and never reuse examples from docs.

### List profiles

```bash
mesh "${STAFF}/api/v1/staff/profiles?status=active&page=1&limit=20" | jq .
```

### Lookup by `user_id` (canonical — not `/by-user/:id`)

```bash
export TARGET_USER=507f1f77bcf86cd799439014
mesh "${STAFF}/api/v1/staff/profiles?user_id=${TARGET_USER}" -i | head -20
```

Returns a **single** profile object + `ETag` header. Do not combine with `q`, `page`, or `limit` (400 `INVALID_PARAM`).

### Get by profile id

```bash
export PROFILE_ID=507f1f77bcf86cd799439020
mesh "${STAFF}/api/v1/staff/profiles/${PROFILE_ID}" -i | head -20
```

### Create — provision new auth user

Requires auth internal API up. `username` is **separate** from `code` (lowercased on persist).

```bash
mesh -X POST "${STAFF}/api/v1/staff/profiles" \
  -H "content-type: application/json" \
  -d '{
    "code": "STF-001",
    "firstname": "Demo",
    "lastname": "Staff",
    "email": "demo.staff@example.invalid",
    "tel": "+66812345678",
    "username": "demo.staff@example.invalid",
    "password": "InitialSecurePass1234!"
  }' | jq .
```

### Create — link existing `user_id`

Do **not** send `username` / `password`.

```bash
mesh -X POST "${STAFF}/api/v1/staff/profiles" \
  -H "content-type: application/json" \
  -d '{
    "code": "STF-002",
    "firstname": "Linked",
    "lastname": "User",
    "email": "linked@example.invalid",
    "tel": "+66812345679",
    "user_id": "507f1f77bcf86cd799439014"
  }' | jq .
```

### PATCH (merge-patch + If-Match)

```bash
ETAG='W/"2026-05-28T12:00:00.000Z"'
mesh -X PATCH "${STAFF}/api/v1/staff/profiles/${PROFILE_ID}" \
  -H "content-type: application/merge-patch+json" \
  -H "if-match: ${ETAG}" \
  -d '{"firstname":"Updated"}' | jq .
```

### Archive / restore (admin only, empty body)

Lifecycle routes use **no** JSON body (omit `content-type` or use empty POST).

```bash
mesh -X POST "${STAFF}/api/v1/staff/profiles/${PROFILE_ID}/archive" \
  -H "if-match: ${ETAG}" | jq .

mesh -X POST "${STAFF}/api/v1/staff/profiles/${PROFILE_ID}/restore" \
  -H "if-match: ${NEW_ETAG}" | jq .
```

If auth revoke fails after archive, response is **503** `STAFF_AUTH_REVOKE_PENDING`; profile stays `archived`.

### Admin password reset (204 empty body)

```bash
mesh -X POST "${STAFF}/api/v1/staff/profiles/${PROFILE_ID}/password" \
  -H "content-type: application/json" \
  -d '{"password":"NewSecurePass12345!","revoke_sessions":true}' \
  -o /dev/null -w "%{http_code}\n"
```

## Via gateway (JWT)

1. Start auth, gateway, staff, Mongo.
2. Obtain access token from auth login flow.
3. Call gateway base (default `http://127.0.0.1:3002`):

```bash
export GW=http://127.0.0.1:3002
export TOKEN='<access-jwt>'

curl -sS "${GW}/api/v1/staff/profiles?user_id=${TARGET_USER}" \
  -H "Authorization: Bearer ${TOKEN}" | jq .
```

Import [`openapi-via-gateway.yaml`](./openapi-via-gateway.yaml) into Bruno/Postman for full operation list.

## Metrics

```bash
# .env: METRICS_ENABLED=true
curl -s http://127.0.0.1:3004/metrics \
  -H "x-gateway-secret: ${SECRET}" | grep staff_auth_revoke_pending
```

Counter `staff_auth_revoke_pending_total` increments when archive succeeds in Mongo but auth session revoke fails after retries.

## CI & coverage gate

```bash
npm run ci
npm run ci:with-coverage   # ci + per-file function >=80% + line >=80% on profiles/** + auth-internal.client.js
```

## Manual E2E checklist (one pass)

Use gateway + real Mongo + auth when exercising writes.

- [ ] `GET /healthz` → 200; `GET /readyz` → 200 with Mongo
- [ ] Missing / wrong `x-gateway-secret` on staff direct → 401
- [ ] `GET /api/v1/staff/profiles` list → 200 + `pagination`
- [ ] `GET /api/v1/staff/profiles?user_id={hex}` → 200 single object + `ETag`
- [ ] `user_id` + `page` → 400 `INVALID_PARAM`
- [ ] `POST` create with `user_id` (link) → 201 + audit in `auth_audit_events`
- [ ] `POST` create with `username` + `password` (provision) → 201 + auth user
- [ ] `PATCH` with `If-Match` → 200; without → 428; stale → 412
- [ ] Self `PATCH` ignores `code` in body
- [ ] `POST .../archive` as admin → archived; revoke exercised
- [ ] `POST .../password` on other profile → 204; on own → 403
- [ ] Spectral: `npm run spec:lint` passes
- [ ] `npm run ci` passes

Sign-off: date / operator / notes.

## Troubleshooting

| Symptom                            | Check                                               |
| ---------------------------------- | --------------------------------------------------- |
| 401 `GATEWAY_SECRET_REJECTED`      | `GATEWAY_SHARED_SECRET` vs gateway env              |
| 403 `MISSING_GATEWAY_USER_CONTEXT` | Mesh headers from gateway or test helper            |
| 503 `STAFF_AUTH_REVOKE_PENDING`    | Auth down or revoke failing; profile still archived |
| 503 `readyz`                       | Mongo URI, network, `init:db`                       |
| Provision 503/409                  | Auth internal URL/secret; duplicate username        |
| Integration tests skip             | Set `MONGODB_URI` in `.env` for `NODE_ENV=test`     |
