---
status: implemented
created: 2026-07-02
updated: 2026-07-03
owner: Berlin
last-verified: 2026-07-03
source-scan: 2026-07-03 — src 62/62 files
---

# Spec: Staff Service

## Objective

ระบบจัดการข้อมูลพนักงาน (Staff Profiles) ภายใน zero-platform ทำหน้าที่:

- CRUD สำหรับ Staff profiles
- จัดการ Provision/Deprovision (สร้าง user ใน auth + staff profile)
- Archive/Unarchive พนักงาน พร้อม revoke sessions ผ่าน Auth internal API
- จัดการ Permissions แบบ Dynamic (`dual` / `enforce`)
- Admin assign system role (`PATCH .../role`) ผ่าน auth internal
- Metrics endpoint (prom-client)

**ผู้ใช้หลัก:** Backoffice admin (จัดการพนักงาน), Auth service (session revocation)

## Consumers

- **backoffice** — Staff Management (admin CRUD, archive, role assign), My Profile (self lookup/patch)

## Source of Truth

| หัวข้อ | SoT | ชนะเมื่อขัด |
|--------|-----|-------------|
| Business rules, RBAC, flows | [business-domain.md](./business-domain.md) | — |
| HTTP contract | [openapi.yaml](../../../../backend/service/staff/openapi.yaml) | ชนะ business doc |
| Gateway-facing contract | [openapi-via-gateway.yaml](../../../../backend/service/staff/openapi-via-gateway.yaml) | sync กับ direct spec |
| Persistence | [database-erd.md](./database-erd.md) | — |
| Error codes | [codes.yaml](../../../../backend/service/staff/codes.yaml) | sync กับ `error-codes.js` |
| Ops | [RUNBOOK.md](../../../../backend/service/staff/RUNBOOK.md) | — |
| Testing | [TESTING.md](./TESTING.md) | — |
| Workflow งานใหม่ | [WORKFLOW.md](./WORKFLOW.md) | — |

### last-verified policy

- อัปเดต `last-verified` ทุกครั้งที่ merge PR ที่แตะ staff business logic, OpenAPI, หรือ acceptance criteria
- Quarterly audit (ทุก 3 เดือน) ถ้าไม่มี PR แตะ — owner ตรวจ drift กับ `npm run ci`

## Tech Stack

- **Runtime:** Node.js v24 (ESM)
- **Framework:** Fastify v5
- **Database:** MongoDB v7 (native driver, shared DB กับ auth `zero-platform`)
- **HTTP Client:** Axios (เรียก Auth internal API)
- **Metrics:** prom-client v15
- **Security:** @fastify/helmet, @fastify/rate-limit
- **Shared:** `@zero-platform/roles` (platform-roles package)
- **Linting:** ESLint v9 + eslint-plugin-security + eslint-plugin-boundaries
- **Formatting:** Prettier
- **Git Hooks:** Husky + lint-staged
- **API Spec:** OpenAPI 3.x + Spectral linting

## Commands

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `npm run dev` | รัน dev server พร้อม watch mode (port 3101) |
| `npm start` | รัน production server |
| `npm test` | รัน tests (concurrency=1) |
| `npm run test:coverage` | รัน tests พร้อม coverage |
| `npm run coverage:gate` | ตรวจสอบ minimum coverage |
| `npm run lint` | ตรวจ ESLint |
| `npm run spec:lint` | ตรวจ OpenAPI spec ด้วย Spectral (`openapi.yaml` + `openapi-via-gateway.yaml`) |
| `npm run spec:codes` | ตรวจ sync `codes.yaml` ↔ `error-codes.js` |
| `npm run ci` | Full CI pipeline (lint + format + spec:lint + spec:codes + test + audit) |
| `npm run ci:with-coverage` | CI + coverage gate |
| `npm run init:db` | Initialize database + indexes |
| `npm run seed:example` | สร้างข้อมูลตัวอย่าง |

## Project Structure

```
docs/specs/backend/staff/   → Spec SoT (business, technical, persistence, testing)
backend/service/staff/
├── src/
│   ├── server.js          → Entry point
│   ├── app.js             → Fastify app setup
│   ├── config/            → Environment config
│   ├── lib/               → Shared utilities
│   ├── plugins/           → Fastify plugins (MongoDB, auth guard, metrics)
│   ├── modules/
│   │   └── profiles/      → Staff profile CRUD, provision, archive
│   └── tests/             → Integration tests
├── scripts/               → DB init, seed, coverage gate
├── docs/README.md         → Redirect to docs/specs/backend/staff/
├── openapi.yaml           → OpenAPI 3.x spec (direct access)
├── openapi-via-gateway.yaml → OpenAPI spec (via gateway)
├── codes.yaml             → Problem codes definition
└── .env.example           → Environment variables template
```

## API Endpoints (summary)

Normative detail: [openapi.yaml](../../../../backend/service/staff/openapi.yaml) · Gateway: [openapi-via-gateway.yaml](../../../../backend/service/staff/openapi-via-gateway.yaml)

Prefix ผ่าน gateway: `/api/v1/staff`

| Method | Path | Permission | หมายเหตุ |
|--------|------|------------|----------|
| GET | `/api/v1/staff/profiles` | `profiles:list` / `profiles:lookup` | list vs `?user_id` |
| GET | `/api/v1/staff/profiles/{id}` | `profiles:read` | own profile bypass |
| POST | `/api/v1/staff/profiles` | `profiles:create` | provision หรือ link |
| PATCH | `/api/v1/staff/profiles/{id}` | `profiles:edit` | If-Match required |
| PATCH | `.../role` | `roles:assign` | 204, auth internal |
| POST | `.../archive` | `profiles:edit` | Mongo archived ก่อน; revoke fail หลัง retry → **200** + metric (OBSERVED) |
| POST | `.../restore` | `profiles:edit` | ไม่เรียก auth |
| POST | `.../password` | `profiles:edit` | 204, admin only |
| GET | `/healthz` | — | liveness (no mesh secret) |
| GET | `/readyz` | — | Mongo ping; 503 `SERVICE_NOT_READY` when down |
| GET | `/metrics` | — | Prometheus (when `METRICS_ENABLED=true`) |

## Permission Model

- Header: `x-user-permissions` (comma-separated)
- Keys: `profiles:list`, `profiles:lookup`, `profiles:read`, `profiles:edit`, `profiles:create`, `roles:assign`, wildcard `profiles:*`
- `PERMISSION_MODE=dual` (default): fallback ตาม role (`isAdminRole`, `platform_admin`) เมื่อไม่มี permission key
- `PERMISSION_MODE=enforce`: ต้องมี permission key เท่านั้น
- Implementation: `profiles.service.js` (`assertPermission`), `user-context.js`

## Dependencies & Integrations

### Internal (ภายใน zero-platform)

- **ขึ้นต่อ (Depends on):**
  - `gateway` — trusted headers (user identity, role, branch, permissions)
  - `auth` — internal API สำหรับ provision, revoke sessions, set password, assign role
  - `@zero-platform/roles` — role-based access control
  - MongoDB — shared DB กับ auth (`zero-platform`)
- **ถูกเรียกใช้โดย (Consumed by):**
  - `backoffice` — UI สำหรับจัดการพนักงาน + My Profile

### External (ภายนอก)

- ไม่มี

## Environment Variables

ดู [.env.example](../../../../backend/service/staff/.env.example) สำหรับรายการเต็ม

| ชื่อ | คำอธิบาย | ค่าเริ่มต้น |
|------|----------|------------|
| `PORT` | Port ที่ server listen | `3101` |
| `GATEWAY_SHARED_SECRET` | Shared secret สำหรับ verify gateway headers | — (ต้องตั้ง) |
| `MONGODB_URI` | MongoDB connection string (shared กับ auth) | `mongodb://127.0.0.1:27017/zero-platform` |
| `DB_NAME` | Database name | `zero-platform` |
| `AUTH_INTERNAL_BASE_URL` | Auth service base URL | `http://127.0.0.1:3001` |
| `AUTH_INTERNAL_SERVICE_SECRET` | Secret สำหรับเรียก Auth internal API | — (ต้องตั้ง) |
| `STAFF_PROVISION_DEFAULT_ROLE` | Default role ตอน provision | `staff` |
| `AUTH_REVOKE_MAX_RETRIES` | จำนวนครั้ง retry สำหรับ revoke | `3` |
| `AUTH_REVOKE_BACKOFF_MS` | Backoff delay สำหรับ retry | `200` |
| `PERMISSION_MODE` | Permission mode (`dual` \| `enforce`) | `dual` |
| `METRICS_ENABLED` | เปิด/ปิด Prometheus metrics | `false` |

## Code Style

- ESM modules (`type: "module"`)
- Modular architecture (modules/[domain]/)
- ESLint boundaries plugin
- Pre-commit hooks via Husky + lint-staged
- Dual OpenAPI specs (direct + via-gateway)

## Testing Strategy

- **Framework:** Node.js built-in test runner (`node --test`)
- **Coverage:** Node.js experimental coverage + custom gate script
- **Location:** `src/tests/` + module-level tests under `src/modules/*/tests/`
- **Concurrency:** `--test-concurrency=1` (sequential)
- **CI:** `npm run ci` (lint + format + spec:lint + spec:codes + test + audit)
- **Coverage Gate:** `npm run ci:with-coverage`

## Acceptance Criteria

| ID | Criterion | Expected |
|----|-----------|----------|
| AC-01 | `staff` role + list mode | `403 PERMISSION_DENIED` |
| AC-02 | create ไม่มี `user_id` และไม่มี `password` | `400 INVALID_PARAM` |
| AC-03 | archive revoke ล้มหลัง retry | **`200`** + `status=archived` (ไม่ rollback Mongo); increment revoke-pending metric — ดู `profiles.archive.revoke.test.js` |
| AC-04 | own profile PATCH ส่ง `code` | `400 INVALID_PARAM` (ห้ามแก้ code ตัวเอง) |
| AC-05 | `PERMISSION_MODE=enforce` ไม่มี `roles:assign` | `403` แม้เป็น `platform_admin` |
| AC-06 | CI gates | `npm test`, `npm run spec:lint`, `npm run spec:codes` ผ่าน |
| AC-07 | `user_id` + list params (`page`, `q`, …) | `400 INVALID_PARAM` |
| AC-08 | archive สำเร็จ + revoke สำเร็จ | `200` + `status=archived` |
| AC-09 | provision (ไม่มี `user_id`) | `201` + auth user + profile สร้างครบ |
| AC-10 | self lookup `GET ?user_id={sub}` | `200` โดยไม่ต้อง `profiles:lookup` |
| AC-11 | `GET /healthz` liveness + `GET /readyz` when Mongo unavailable | `200` / `503 SERVICE_NOT_READY` |
| AC-12 | create with `user_id` links existing auth user in scope | `201` + profile; branch_admin blocked cross-branch |

### Test traceability

| AC | Test file |
|----|-----------|
| AC-01 | `profiles.permissions.test.js` |
| AC-02 | `profiles.create.provision.test.js` |
| AC-03 | `profiles.archive.revoke.test.js` |
| AC-04 | `profiles.patch.test.js` |
| AC-05 | `profiles.permissions.test.js` (Update Role describe) |
| AC-06 | CI scripts (`package.json`) |
| AC-07 | `profiles.get.test.js` + `rbac.test.js` (`assertLookupQueryExclusive`) |
| AC-08 | `profiles.lifecycle.test.js` |
| AC-09 | `profiles.create.provision.test.js` |
| AC-10 | `profiles.get.test.js` |
| AC-11 | `health.probe.test.js` |
| AC-12 | `profiles.create.link.test.js` |

## Source verification (G1 drift audit 2026-07-03)

| Check | Result |
|-------|--------|
| Package root | `backend/service/staff/` (convention) |
| `src/` files | **62 / 62** read |
| Modules | `profiles` + `config/`, `lib/`, `plugins/` |
| Routes (code) | 11 path groups — **match OpenAPI** (`openapi.yaml` + `openapi-via-gateway.yaml`) |
| Legacy spec trusted | Verified row-by-row against `src/` |
| Drift patches (USER_CONFIRMED) | D1 archive revoke → 200 not 503; D2 provision profile-first; D3 deactivate best-effort (auth endpoint N/A) |

## Spec-Driven Workflow

```
SPECIFY → PLAN → TASKS → IMPLEMENT
```

รายละเอียด checklist, PR template, task format → [WORKFLOW.md](./WORKFLOW.md)

แผนงาน → `docs/specs/backend/staff/plans/YYYY-MM-DD-<feature>.md`

## Boundaries

- **Always:**
  - Verify gateway trust headers
  - Revoke sessions ผ่าน Auth internal API เมื่อ archive พนักงาน (retry with backoff)
  - รัน `npm run ci` ก่อน commit (enforced via Husky)
  - อัปเดต spec ก่อน code เมื่อเปลี่ยน business rules หรือ API (ดู WORKFLOW.md)
- **Ask first:**
  - การแก้ provision flow (เพราะกระทบ auth service)
  - การแก้ database schema (shared DB กับ auth)
  - การเพิ่ม/แก้ permission mode
- **Never:**
  - Commit credentials
  - แก้ auth DB tables โดยตรง (ใช้ auth internal API)
  - ข้าม session revocation เมื่อ archive

## Open Questions

- [ ] Auth `POST /internal/users/{user_id}/deactivate` — staff client เรียก best-effort orphan cleanup แต่ auth ยังไม่มี endpoint; ต้อง implement ที่ auth หรือลบ client path (non-blocking)
