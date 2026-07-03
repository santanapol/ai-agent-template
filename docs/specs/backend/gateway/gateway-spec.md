---
status: implemented
created: 2026-07-03
updated: 2026-07-03
owner: Berlin
last-verified: 2026-07-03
source-scan: 2026-07-03 — src 16/16 files
---

# Spec: API Gateway

## Objective

Edge **API Gateway** สำหรับ zero-platform — **OBSERVED** จาก `backend/gateway/src/`:

- Verify JWT ด้วย **JWKS** (`jose`) — ไม่ verify ซ้ำที่ internal services
- Optional **`token_gen`** gate กับ Redis (`user:{sub}:token_gen`) — sync กับ auth D1
- Inject trusted headers (`x-gateway-secret`, `x-user-*`, `x-request-id`) แล้ว proxy ไป upstream
- Public route `/auth` — ไม่ verify JWT; forward client `Authorization` ไป auth
- Native `/healthz`, `/readyz` — JWKS + Redis ping

**ผู้ใช้หลัก:** ทุก browser/app client, internal mesh services (รับ trusted headers)

## Consumers

- **backoffice-shadcn**, **backoffice** — เรียก API ผ่าน gateway เท่านั้น
- **staff**, **agent-invoice**, **smart-report**, **branch-report** — รับ `x-gateway-secret` + user context

## Source of Truth

| หัวข้อ | SoT | ชนะเมื่อขัด |
|--------|-----|-------------|
| Trust boundary, proxy flows | [business-domain.md](./business-domain.md) | — |
| Plugins, env, routing | [technical-architecture.md](./technical-architecture.md) | — |
| Persistence | [database-erd.md](./database-erd.md) — N/A + Redis keys | — |
| HTTP contract (edge) | [openapi.yaml](../../../../backend/gateway/openapi.yaml) | ชนะ business doc |
| `/auth/*` normative | [auth/openapi.yaml](../../../../backend/auth/openapi.yaml) | — |
| Error codes | `coding-standard/gateway/codes.yaml` | sync กับ `gateway-problems.js` |
| Package legacy | [backend/gateway/docs/README.md](../../../../backend/gateway/docs/README.md) | redirect |
| Testing | [TESTING.md](./TESTING.md) | — |
| Workflow งานใหม่ | [WORKFLOW.md](./WORKFLOW.md) | — |

## Tech Stack

- **Runtime:** Node.js v24 (ESM)
- **Framework:** Fastify v5 + `@fastify/http-proxy`, `@fastify/cors`
- **JWT:** `jose` JWKS verify
- **Redis:** `redis` v4 — `token_gen` gate (required prod)
- **Shared:** `@zero-platform/roles` (claim validation helpers)

## Commands

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `npm run dev` / `npm start` | Gateway :3000 |
| `npm test` | node:test unit + integration |
| `npm run spec:lint` | Spectral on `openapi.yaml` |
| `npm run spec:codes` | OpenAPI problem codes ↔ org `codes.yaml` |
| `npm run spec:consistency` | Links + cross-doc consistency |
| `npm run ci` | lint + format + spec:lint + spec:codes + spec:consistency + test + audit |

## API Endpoints (summary)

Normative: [openapi.yaml](../../../../backend/gateway/openapi.yaml)

| Method | Path | Auth | หมายเหตุ |
|--------|------|------|----------|
| GET | `/healthz` | none | liveness |
| GET | `/readyz` | none | JWKS fetch + Redis PING |
| * | `/auth/*` | public | proxy → auth :3001 |
| * | `/api/v1/staff/*` | JWT + inject | → staff :3101 |
| * | `/api/v1/agent-invoice/*`, `/api/v1/invoices/*` | JWT + inject | → agent-invoice :3102 |
| * | `/api/v1/smart-reports/*` | JWT + inject | timeouts 10s–130s |
| * | `/api/v1/branch-report/*` | JWT + inject | → branch-report :3015 |
| * | unmatched | — | 404 `GATEWAY_ROUTE_NOT_FOUND` |

Route table: [routes.json](../../../../backend/gateway/routes.json) — longest prefix wins.

## Acceptance criteria (traceability)

| ID | Criterion | Test |
|----|-----------|------|
| AC-1 | Missing/wrong `Authorization` on protected route → 401 | `test/plugins/jwt-auth-token-gen.test.js` |
| AC-2 | Stale `token_gen` → 401 `GATEWAY_JWT_REJECTED` | `jwt-auth-token-gen.test.js` |
| AC-3 | Public `/auth` preserves client Authorization | `test/proxy.integration.test.js` |
| AC-4 | Injected headers strip client spoofing | `test/proxy.integration.test.js` |
| AC-5 | `/readyz` 503 when JWKS/Redis down | `test/app.health.test.js` |
| AC-6 | Unknown path → 404 + `x-gateway-hit` | `test/proxy.integration.test.js` |

## Dependencies & integrations

- **auth** — JWT issuer, JWKS, Redis `token_gen` publisher
- **Upstream mesh** — staff, agent-invoice, smart-report, branch-report, demo-service
- **Redis** — shared `user:{sub}:token_gen` contract

## Spec-driven workflow

หลัง bootstrap — ฟีเจอร์ใหม่ใช้ [WORKFLOW.md](./WORKFLOW.md)
