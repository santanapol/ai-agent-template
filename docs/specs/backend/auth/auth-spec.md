---
status: implemented
created: 2026-07-02
updated: 2026-07-03
owner: Berlin
last-verified: 2026-07-03
source-scan: 2026-07-03 — src 39/39 files (re-audit round 4 — re-hardened: roles/password/ERD/JWT drift resolved, spec:consistency wired into npm run ci)
---

# Spec: Auth Service

## Objective

ระบบ Authentication & Authorization กลางของ zero-platform (self-hosted IdP) ทำหน้าที่:

- Login, refresh, logout และออก Access JWT (RS256) + Refresh Token
- เผยแพร่ JWKS (`/.well-known/jwks.json`) ให้ Gateway verify
- Session revocation ผ่าน `access_token_gen` + Redis key sync `SET user:{sub}:token_gen` (O-16)
- Self-service password change (`POST /auth/me/password`)
- Active branch metadata/switch (`GET/POST /auth/me/branch`, `/auth/me/active-branch`)
- Dynamic permissions admin (`/auth/admin/menus`, `/auth/admin/role-permissions`)
- Internal APIs สำหรับ trusted services (provision user, set password, revoke sessions, set role)

**ผู้ใช้หลัก:** Gateway (JWT verify), backoffice (login ผ่าน gateway), staff (internal APIs)

## Consumers

- **gateway** — JWKS + JWT `token_gen` verification
- **backoffice** — login/logout/refresh, me, branch switch, menus
- **staff** — `POST /internal/users`, password reset, session revoke, role assign

## Source of Truth

| หัวข้อ | SoT | ชนะเมื่อขัด |
|--------|-----|-------------|
| Business rules, RBAC, flows | [business-domain.md](./business-domain.md) | — |
| Technical design, JWT contract | [technical-architecture.md](./technical-architecture.md) | — |
| HTTP contract | [openapi.yaml](../../../../backend/auth/openapi.yaml) | ชนะ business doc |
| Persistence | [database-erd.md](./database-erd.md) | — |
| Password design | [design-password-management.md](./design-password-management.md) | — |
| O-16 revoke checklist | [session-revoke-token-gen-changes.md](./session-revoke-token-gen-changes.md) | — |
| Error codes | [`coding-standard/auth/codes.yaml`](../../../../coding-standard/auth/codes.yaml) | sync OpenAPI |
| Testing | [TESTING.md](./TESTING.md) | — |
| Workflow งานใหม่ | [WORKFLOW.md](./WORKFLOW.md) | — |

### last-verified policy

- อัปเดต `last-verified` ทุกครั้งที่ merge PR ที่แตะ auth business logic, OpenAPI, หรือ acceptance criteria
- Quarterly audit — owner รัน `npm run ci` และตรวจ drift

## Tech Stack

- **Runtime:** Node.js v24 (ESM)
- **Framework:** Fastify v5
- **Database:** MongoDB v6 (native driver)
- **Cache:** Redis v4 (`token_gen`, immediate revocation)
- **Auth:** JWT RS256 (`jose`), Argon2id passwords
- **Shared:** `@zero-platform/roles`
- **API Spec:** OpenAPI 3.1 + Spectral

## Commands

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `npm run dev` | Dev server (port 3001) |
| `npm start` | Production server |
| `npm test` | Unit + integration tests |
| `npm run test:coverage` | Tests + c8 coverage |
| `npm run lint` | ESLint |
| `npm run spec:lint` | Spectral on `openapi.yaml` |
| `npm run spec:codes` | Validate problem codes |
| `npm run spec:roles` | Validate roles in OpenAPI |
| `npm run ci` | lint + format + spec:lint + spec:codes + spec:roles + test + audit |
| `npm run init:db` | Indexes + seed |
| `npm run seed:example` | Example data |

## Project Structure

```
docs/specs/backend/auth/     → Spec SoT (this folder)
backend/auth/
├── src/modules/auth/          → Login, refresh, logout, me, JWKS
├── src/modules/internal/      → Trusted service APIs
├── src/modules/admin/         → Menus + role-permissions admin
├── test/                      → Integration + unit tests
├── docs/README.md             → Redirect to central spec
├── docs/adrs/                 → ADRs (package-local)
├── docs/bruno/                → Bruno collection (package-local)
├── openapi.yaml
└── .env.example
```

## API Endpoints (summary)

Normative detail: [openapi.yaml](../../../../backend/auth/openapi.yaml)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/healthz`, `/readyz` | Liveness / readiness |
| GET | `/.well-known/jwks.json` | JWKS for gateway |
| POST | `/auth/login` | Issue tokens |
| POST | `/auth/refresh` | Token rotation |
| POST | `/auth/logout` | Revoke refresh family |
| POST | `/auth/me/password` | Self-service password change |
| GET | `/auth/me/menus` | User menu keys |
| GET | `/auth/me/branch` | Active branch metadata |
| GET | `/auth/me/branches` | Switchable branch list; optional `q` (typeahead), `limit` (max 100), `offset` (in-memory pagination after OU load) |
| POST | `/auth/me/active-branch` | Switch active branch |
| GET/POST/PATCH/DELETE | `/auth/admin/menus`… | Permission menu admin |
| GET/PUT/DELETE | `/auth/admin/role-permissions`… | Role permission admin |
| POST | `/internal/users` | Provision user (staff) |
| POST | `/internal/users/{user_id}/password` | Set password |
| POST | `/internal/users/{user_id}/sessions/revoke` | Revoke all sessions |
| PATCH | `/internal/users/{user_id}/role` | Set system role |

**Drift resolved (OBSERVED):** scaffold `auth-spec.md` เคยระบุ `POST/PATCH /admin/users/*` — **ไม่มีใน code/OpenAPI**; user provisioning อยู่ที่ `/internal/users` และ admin RBAC อยู่ที่ `/auth/admin/*`.

## Acceptance Criteria

| ID | Criterion | Test |
|----|-----------|------|
| AC-01 | `GET /healthz` returns 200 liveness payload | `test/auth.integration.test.js` |
| AC-02 | Login returns access + refresh; JWT claims valid | `test/auth.integration.test.js` |
| AC-03 | Refresh rotates refresh token family | `test/auth.integration.test.js` |
| AC-04 | Logout revokes refresh family | `test/auth.integration.test.js` |
| AC-05 | Internal revoke bumps `token_gen` and invalidates access | `test/internal-revoke.integration.test.js` |
| AC-06 | Self-service `POST /auth/me/password` revokes old sessions | `test/me-password.integration.test.js` |
| AC-07 | Internal set password works with service secret | `test/internal-set-password.integration.test.js` |
| AC-08 | Internal set role updates user role | `test/internal-set-role.integration.test.js` |
| AC-09 | Internal create user provisions identity | `test/internal-create-user.integration.test.js` |
| AC-10 | Active branch switch updates session claims | `test/active-branch.integration.test.js` |
| AC-11 | `GET /auth/me/menus` returns granted menu actions | `test/me-menus.integration.test.js` |
| AC-12 | Admin menus API requires `permissions:manage` | `test/admin.integration.test.js` |
| AC-13 | Role-permissions upsert via `PUT /auth/admin/role-permissions` | `test/admin.integration.test.js` |
| AC-14 | Internal revoke writes `token_gen` to Redis (`SET user:{sub}:token_gen`) when configured | `test/internal-revoke-redis.integration.test.js` |

## Source verification (G1 drift audit 2026-07-03 — round 3)

| Check | Result |
|-------|--------|
| Package root | `backend/auth/` (convention) |
| `src/` files | **39 / 39** read |
| Modules | `auth`, `admin`, `internal` + `config/`, `lib/`, `plugins/` |
| Routes (code) | 18 path groups — **match OpenAPI** |
| CI | `npm run ci` — **183 tests** pass |
| Runtime drift | **None** — logic matches round 2 OBSERVED |
| Drift patches (round 1) | D1–D5 |
| Drift patches (round 2) | D6–D15 |
| Drift patches (round 3, USER_CONFIRMED) | D16–D21 link fixes; D23 `problem.js` comment; session-revoke status updated |

## Dependencies & Integrations

### Internal

- **Depends on:** MongoDB, Redis (production), `@zero-platform/roles`
- **Consumed by:** gateway, staff, backoffice

### External

- ไม่มี

## Spec-driven workflow

งานใหม่หลัง bootstrap: [WORKFLOW.md](./WORKFLOW.md) — `SPECIFY → PLAN → TASKS → IMPLEMENT`

## Open Questions

- [ ] OU-specific role-permission admin (`ou_id !== null`) — planned feature; ใช้ `/spec` + WORKFLOW เมื่อ implement (non-blocking)
- [ ] แยก `problem+json` **`type`** สำหรับ rate limit vs IP credential throttle (implementation ปัจจุบันใช้ URI เดียวกัน — ADR ถ้าต้องการ)
