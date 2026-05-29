# Spec: staff service (MVP bootstrap & implementation)

> **Status:** Plan approved — พร้อม `/build` (backend staff เท่านั้น; frontend แยก PR)  
> **Source of Truth (business/technical/persistence):** [`../docs/business-domain.md`](../docs/business-domain.md), [`../docs/technical-architecture.md`](../docs/technical-architecture.md), [`../docs/database-erd.md`](../docs/database-erd.md)  
> **Package status today:** **implemented** — `package.json`, `src/`, OpenAPI, tests, `README.md`, `RUNBOOK.md`

---

## Objective

สร้างและ bootstrap **backend service `staff`** ใน monorepo `zero-platform` ให้เป็น **internal API** สำหรับ back-office จัดการโปรไฟล์พนักงาน (`staff_profiles`) ตามเอกสาร SoT ที่มีอยู่แล้ว

### ผู้ใช้เป้าหมาย

| ผู้ใช้                                       | ช่องทาง                      | ความต้องการหลัก                                                     |
| :------------------------------------------- | :--------------------------- | :------------------------------------------------------------------ |
| **Admin** (`platform_admin`, `branch_admin`) | Backoffice → Gateway → staff | CRUD โปรไฟล์, list/search, archive/restore, admin reset password    |
| **พนักงานทุก role**                          | My Profile (frontend)        | อ่าน/แก้โปรไฟล์ตัวเอง (`GET ?user_id`, `PATCH` own — ไม่แก้ `code`) |
| **auth service**                             | Internal mesh (staff → auth) | provision user, set password, revoke sessions                       |
| **วิศวกร / Agent**                           | Repo + OpenAPI               | Contract ชัด, test ครอบคลุม, ปฏิบัติตาม coding-standard             |

### User stories (สรุป)

1. **As admin**, I can create a staff profile (with optional link to existing `user_id` or provision new auth user with `username` + `password`).
2. **As admin**, I can list/search/filter staff in my OU/branch scope with pagination.
3. **As admin**, I can archive/restore profiles with optimistic locking (`If-Match` / ETag).
4. **As admin**, I can reset another user's password (not own profile) via dedicated action endpoint.
5. **As any logged-in user**, I can view and patch my own profile fields (except `code`, `status`, tenant ids).
6. **As platform**, after archive or password change, stale sessions must not remain valid (auth revoke + `token_gen`).

### Acceptance criteria (measurable)

- [x] Service รันที่ **`PORT=3004`** (ตรง [`gateway/routes.json`](../../../gateway/routes.json)) พร้อม `/healthz`, `/readyz` (Mongo ping ที่ `readyz`)
- [x] ทุก business route ใช้ mesh headers (`x-gateway-secret`, `x-user-*`) — ไม่ verify JWT ใน staff
- [x] CRUD + lifecycle ครบตาม [HTTP intent](../docs/business-domain.md#5-http-operations-intent--ก่อน-openapi)
- [x] `GET /api/v1/staff/profiles` รองรับ **list** (ไม่มี `user_id`) และ **lookup** (`user_id` query) แยกโหมดชัด — ห้ามผสม list params กับ lookup
- [x] Response ใช้ Custom JSON wrapper + `codes.yaml` ตาม [`6-api-response-codes.md`](../../../../../../coding-standard/backend/6-api-response-codes.md)
- [x] Mongo: collection `staff_profiles` + indexes ตาม [`database-erd.md`](../docs/database-erd.md)
- [x] Outbound auth: provision / set password / revoke ตาม [`technical-architecture.md` §6](../docs/technical-architecture.md#6-outbound-auth)
- [x] Archive สำเร็จแต่ revoke ล้ม → **`503`** + code ที่ลงทะเบียน (เช่น `STAFF_AUTH_REVOKE_PENDING`) — profile ค้าง `archived` ไม่ rollback (MVP)
- [x] Audit events `staff.profile_*` ลง `auth_audit_events`
- [x] `openapi.yaml` + `openapi-via-gateway.yaml` + Spectral lint ผ่านใน CI
- [x] Unit + integration tests (`node --test`) ผ่านใน `npm run ci`
- [ ] **นอก scope รอบนี้:** แก้ `frontend/backoffice` — แยก PR ภายหลัง (ดู [Decisions](#decisions-resolved))

---

## Out of scope (this round)

| รายการ                                                     | เหตุผล                                                                                  |
| :--------------------------------------------------------- | :-------------------------------------------------------------------------------------- |
| **`frontend/backoffice`** (`staffApiClient.ts`, types, UI) | แยก PR — consumer จะ sync หลัง staff API + OpenAPI พร้อม                                |
| **Gateway / auth** changes                                 | มี route + internal API อยู่แล้ว — แก้เฉพาะเมื่อ docs กำหนด (ไม่จำเป็นใน MVP bootstrap) |

**หมายเหตุ:** Frontend ปัจจุบันใช้ `GET /profiles/by-user/{userId}` และ UI "Username = Staff Code" — **ไม่** กำหนด contract ของรอบนี้; canonical ตาม docs ด้านล่าง

---

## Tech Stack

| Layer                  | Choice                                  | Notes                                                                              |
| :--------------------- | :-------------------------------------- | :--------------------------------------------------------------------------------- |
| Runtime                | **Node.js** `>=24 <25` (LTS)            | ตาม [`1-tech-stack.md`](../../../../../../coding-standard/backend/1-tech-stack.md) |
| Framework              | **Fastify** `^5.x`                      | อ้างอิง pattern จาก `demo-service`, `auth`                                         |
| Database               | **MongoDB** `^7.x` driver               | แชร์ DB กับ auth (`auth_*` collections)                                            |
| Module system          | **ESM**                                 | `"type": "module"`                                                                 |
| HTTP client (outbound) | **axios**                               | `auth-internal.client.js`                                                          |
| Contract               | **OpenAPI 3.1.0** YAML                  | root `openapi.yaml`                                                                |
| Tests                  | **`node --test`** (native)              | ไม่ใช้ Jest                                                                        |
| Env                    | **`node --env-file=.env`**              | ไม่ใช้ dotenv                                                                      |
| Lint / format          | ESLint 9 + Prettier                     | เหมือน `demo-service`                                                              |
| Observability          | pino, prom-client (optional `/metrics`) | ตาม technical-architecture                                                         |

### Key environment variables

| Variable                       | Purpose                       | Dev default (intent)            |
| :----------------------------- | :---------------------------- | :------------------------------ |
| `PORT`                         | HTTP listen                   | `3004`                          |
| `MONGODB_URI`, `DB_NAME`       | Mongo (often same DB as auth) | จาก auth dev setup              |
| `GATEWAY_SHARED_SECRET`        | Mesh secret                   | ตรง `GATEWAY_SECRET` ใน gateway |
| `AUTH_INTERNAL_BASE_URL`       | auth internal base            | `http://127.0.0.1:3001`         |
| `AUTH_INTERNAL_SERVICE_SECRET` | Bearer สำหรับ staff → auth    | แยกจาก gateway secret           |
| `STAFF_PROVISION_DEFAULT_ROLE` | role เมื่อ provision          | `staff`                         |

**Database:** ใช้ **MongoDB DB เดียวกับ auth** (`DB_NAME` / `MONGODB_URI` ชุดเดียวกับ auth) — ตาม [`database-erd.md`](../docs/database-erd.md) (prefix `auth_*`, staff read `auth_users`)

---

## Commands

รันจาก root แพ็กเกจ `backend/service/staff/` (หลัง bootstrap):

```bash
# Development (watch)
TZ=UTC npm run dev

# Production start
TZ=UTC npm start

# Tests
NODE_ENV=test TZ=UTC npm test
NODE_ENV=test TZ=UTC npm run test:coverage

# Quality gate (CI)
npm run ci
# = lint + format:check + spec:lint + test + audit:check

# OpenAPI
npm run spec:lint

# DB init (indexes + optional jsonSchema)
npm run init:db

# Lint / format
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

**Monorepo (local E2E กับ gateway + auth + backoffice):**

```bash
# auth (port 3001), gateway (3002), staff (3004), backoffice dev — ตาม local-ports ของทีม
# Gateway มี route ล็อกแล้ว: prefix /api/v1/staff → 127.0.0.1:3004
```

---

## Project Structure

```text
backend/service/staff/
├── _mission-control/
│   └── SPEC.md                 ← ไฟล์นี้
├── docs/                       ← SoT ที่มีอยู่ (ห้ามลบ)
│   ├── business-domain.md
│   ├── technical-architecture.md
│   └── database-erd.md
├── src/
│   ├── server.js               # Entry: connect DB, listen
│   ├── app.js                  # Fastify factory + plugins
│   ├── config/                 # env, collection names
│   ├── lib/
│   │   ├── envelope.js         # success/error wrapper
│   │   ├── error-codes.js      # จาก codes.yaml
│   │   ├── etag.js             # W/"..." จาก upd_date
│   │   ├── audit/              # auth_audit_events writer (staff-owned; no auth module to copy)
│   │   ├── clients/
│   │   │   └── auth-internal.client.js
│   │   ├── test-helpers/       # mesh-headers.js for integration tests
│   │   ├── utils/              # normalize.js (email, tel E.164)
│   │   └── observability/
│   ├── plugins/                # gateway-secret, user-context, error-handler, mongodb, metrics
│   ├── modules/
│   │   └── profiles/
│   │       ├── profiles.route.js
│   │       ├── profiles.controller.js
│   │       ├── profiles.service.js
│   │       ├── profiles.repository.js
│   │       ├── profiles.schema.js
│   │       └── tests/
│   │           ├── unit-test/
│   │           └── integration-test/
├── scripts/
│   └── init-db.mjs             # indexes + validator
├── openapi.yaml
├── openapi-via-gateway.yaml    # Bearer จาก client perspective
├── codes.yaml
├── .env.example
├── README.md
├── RUNBOOK.md
├── .spectral.yaml
├── package.json
└── package-lock.json
```

**Module boundary:** `profiles` เป็น feature เดียวใน MVP — controller → service → repository เท่านั้น (ห้ามข้าม layer)

---

## Code Style

อ้างอิง [`2-folder-structure.md`](../../../../../../coding-standard/backend/2-folder-structure.md), pattern จาก `demo-service` และ `auth`.

### Naming & layers

- ไฟล์: `kebab-case` หรือ `profiles.*.js` ตาม convention monorepo
- Export: named exports สำหรับ handlers; factory สำหรับ plugins
- Route template ใน audit `*_prog`: จาก `request.routeOptions.url`

### Response envelope (ตัวอย่าง)

```javascript
// success — list
reply.status(200).send(successEnvelope(items, null, "SUCCESS", pagination));

// success — detail + ETag
reply
  .header("etag", etag)
  .status(200)
  .send(successEnvelope(profile, null, "SUCCESS"));

// error
reply
  .status(404)
  .send(errorEnvelope("RESOURCE_NOT_FOUND", "Profile not found", requestId));
```

### Tenant scoping (บังคับทุก query)

```javascript
const filter = {
  ou_id: new ObjectId(request.userContext.ouId),
  branch_id: new ObjectId(scopeBranchId), // branch_admin: บังคับ x-user-branch
  status: requestedStatus,
};
```

### Optimistic locking

```javascript
const matched = await profilesRepository.updateOne(
  { _id: id, ou_id, branch_id, upd_date: originalUpdDate },
  { $set: payload, ...auditUpd },
);
if (matched.matchedCount === 0) throw versionConflict(); // HTTP 412 VERSION_CONFLICT
```

### API resource shape (JSON)

```json
{
  "id": "<profile ObjectId hex>",
  "user_id": "<auth_users ObjectId hex>",
  "ou_id": "...",
  "branch_id": "...",
  "status": "active",
  "code": "EMP-001",
  "firstname": "Somchai",
  "lastname": "Example",
  "email": "somchai@example.invalid",
  "tel": "+66812345678",
  "user": { "username": "somchai.e", "role": "staff" }
}
```

- ห้าม expose `cr_*`, `upd_*` ใน response
- ห้ามคืน `password` หลัง create/reset

---

## Testing Strategy

| Level         | Tool                                            | Location                                                               | ครอบคลุม                                         |
| :------------ | :---------------------------------------------- | :--------------------------------------------------------------------- | :----------------------------------------------- |
| Unit          | `node --test`                                   | `src/modules/profiles/tests/unit-test/`, `src/lib/**/tests/unit-test/` | validators, RBAC helpers, ETag, envelope mapping |
| Integration   | `node --test` + Mongo (test DB)                 | `src/modules/profiles/tests/integration-test/`                         | routes ผ่าน Fastify inject + mesh headers        |
| Contract      | Spectral                                        | `openapi.yaml`, `openapi-via-gateway.yaml`                             | `npm run spec:lint`                              |
| Outbound auth | integration (mock axios หรือ auth test harness) | profiles tests                                                         | provision fail, revoke fail → 503                |

**Coverage:** เป้าหมาย **≥ 80%** บน `src/modules/profiles/**` และ `src/lib/clients/auth-internal.client.js` (ปรับใน `/plan` ถ้าทีมกำหนดต่าง)

**Verify ก่อน merge:**

```bash
npm run ci
```

**Test data:** ใช้ seed จาก auth (`auth_users`) + script init staff indexes — ไม่ hardcode production secrets

---

## HTTP Surface (summary)

Prefix: **`/api/v1/staff/profiles`**

| Method  | Path                      | RBAC (สรุป)                            |
| :------ | :------------------------ | :------------------------------------- |
| `POST`  | `/profiles`               | admin — create (+ optional provision)  |
| `GET`   | `/profiles`               | admin list **หรือ** lookup `?user_id=` |
| `GET`   | `/profiles/{id}`          | admin scope / self                     |
| `PATCH` | `/profiles/{id}`          | admin หรือ self (own: ignore `code`)   |
| `POST`  | `/profiles/{id}/archive`  | admin — `If-Match`                     |
| `POST`  | `/profiles/{id}/restore`  | admin — `If-Match`                     |
| `POST`  | `/profiles/{id}/password` | admin — not own profile                |

**Infra:** `/healthz`, `/readyz`, optional `/metrics`

รายละเอียดเต็ม: [`business-domain.md` §5–§9](../docs/business-domain.md)

---

## Boundaries

### Always

- อ่าน SoT ใน `docs/` ก่อนเปลี่ยน behavior — ถ้า code ขัด docs ให้แก้ docs ก่อนแล้วค่อย code
- ทุก query/write ใส่ `ou_id` (+ `branch_id` ตาม scope) — [`12-data-management.md`](../../../../../../coding-standard/backend/12-data-management.md)
- ใส่ audit fields `cr_*`, `upd_*` ทุก write
- ใช้ `If-Match` / ETag บน `PATCH`, archive, restore
- รัน `npm run ci` ก่อน PR
- ลงทะเบียน error `code` ใน `codes.yaml` + OpenAPI
- staff **ไม่** hash/store password — ส่งต่อ auth internal เท่านั้น

### Ask first

- เพิ่ม index ใหม่นอก [`database-erd.md`](../docs/database-erd.md)
- เปลี่ยน gateway `routes.json` หรือ port allocation
- เพิ่ม dependency นอกแผนใน [`1-tech-stack.md`](../../../../../../coding-standard/backend/1-tech-stack.md)
- Hard delete profiles หรือ rollback archive เมื่อ revoke ล้ม
- เปลี่ยน HTTP contract ที่ล็อกใน [Decisions](#decisions-resolved) (เช่น กลับไปใช้ `/by-user/:id`)

### Never

- Commit secrets (`.env`, `AUTH_INTERNAL_SERVICE_SECRET`, …)
- Forward/process `Authorization` Bearer ใน staff business routes
- `PATCH` เปลี่ยน `status` โดยตรง (ใช้ archive/restore)
- ส่ง `password` ใน `PATCH` profile
- staff แก้ `auth_users.password_hash` / `role` โดยตรง
- คืน `200` พร้อม error code ใน body
- Hard delete `staff_profiles` ใน MVP

---

## Success Criteria

1. **`npm run ci`** ผ่านใน `backend/service/staff` โดยไม่มี warning ที่ fail pipeline
2. **Gateway E2E manual:** ผ่าน gateway ด้วย JWT จริง — create → list → get → patch → archive → restore → admin password (204)
3. **Lookup:** `GET /api/v1/staff/profiles?user_id={sub}` คืน object เดียว + ETag สำหรับ My Profile
4. **List:** `GET /api/v1/staff/profiles` คืน array + `pagination`; `staff` role ได้ **403**
5. **Concurrency:** `PATCH` ด้วย stale `If-Match` → **412** `VERSION_CONFLICT`
6. **Duplicate code:** create ซ้ำใน OU+branch → **409** `DUPLICATE`
7. **Archive + revoke failure:** Mongo archived + **503** (`STAFF_AUTH_REVOKE_PENDING` หรือ `SERVICE_UNAVAILABLE` ตาม `codes.yaml`) + counter **`staff_auth_revoke_pending_total`** เมื่อเปิด `/metrics` — ตาม [`technical-architecture.md`](../docs/technical-architecture.md)
8. **OpenAPI:** paths ตรง implementation; `spec:lint` ผ่าน
9. **Indexes:** `npm run init:db` สร้าง indexes ตาม ERD ครบ

---

## Implementation phases (high-level — ดู [`tasks/plan.md`](tasks/plan.md))

| Phase                       | Tasks   | Deliverable                                          |
| :-------------------------- | :------ | :--------------------------------------------------- |
| **0. Foundation**           | T01–T04 | bootstrap, envelope, mesh + **error-handler**, Mongo |
| **1. Contract & DB**        | T05–T06 | OpenAPI, `init-db`, repository, **audit-writer**     |
| **2. Read**                 | T07–T09 | RBAC, GET lookup/id, list                            |
| **3. Write**                | T10–T12 | create (link + provision), PATCH                     |
| **4. Lifecycle & outbound** | T13–T15 | archive/restore, revoke 503, admin password          |
| **5. Ship**                 | T16–T17 | metrics, CI, RUNBOOK                                 |

_(Frontend sync: **แยก PR / นอกรอบนี้**)_

---

## Decisions (resolved)

อ้างอิง **docs SoT** เท่านั้น — ไม่ตาม frontend ชั่วคราว

|  #  | หัวข้อ                    | การตัดสินใจ                                                                                                                                                   | อ้างอิง                                                                                                                                                                                     |
| :-: | :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|  1  | **Profile lookup**        | **`GET /api/v1/staff/profiles?user_id={hex24}`** — คืน object เดียว + ETag; ห้ามผสมกับ `q` / pagination ของ list                                              | [`business-domain.md` §5, §8](../docs/business-domain.md#5-http-operations-intent--ก่อน-openapi) · [`technical-architecture.md` §5](../docs/technical-architecture.md#5-http-surface-infra) |
|  2  | **Provision `username`**  | **`username` เป็น field แยกจาก `code`** — required เมื่อไม่ส่ง `user_id`; normalized **lowercase**; global unique (auth); **ห้าม** derive จาก `code` ใน staff | [`business-domain.md` §3.5, §6.1](../docs/business-domain.md#61-สร้างโปรไฟล์) · [`technical-architecture.md` §5.1](../docs/technical-architecture.md#51-password-endpoints)                 |
|  3  | **Frontend**              | **นอก scope รอบนี้** — PR แยก sync `staffApiClient`, types, form (`username`, lookup URL) หลัง staff + OpenAPI merge                                          | คำยืนยันจากเบียร์                                                                                                                                                                           |
|  4  | **MongoDB**               | **แชร์ DB กับ auth** — collection `staff_profiles`; read/join `auth_users`                                                                               | [`database-erd.md`](../docs/database-erd.md)                                                                                                                                                |
|  5  | **Metric revoke pending** | **`staff_auth_revoke_pending_total`** — implement ใน phase Hardening เมื่อเปิด observability (`/metrics`)                                                     | [`technical-architecture.md`](../docs/technical-architecture.md) (operations / revoke 503)                                                                                                  |
|  6  | **`_mission-control`**    | เก็บที่ **`backend/service/staff/_mission-control/`** (คู่กับแพ็กเกจที่ implement)                                                                            | —                                                                                                                                                                                           |

### Create body (provision path — normative)

เมื่อ **ไม่** ส่ง `user_id` — required: `code`, `firstname`, `lastname`, `email`, `tel`, **`username`**, **`password`** (min 16).  
เมื่อส่ง `user_id` — **ห้าม** ส่ง `username` / `password` ใน create (ตาม docs).

---

## Frontend follow-up (separate PR — not this round)

| รายการปัจจุบัน (frontend)           | เป้าหมายหลัง staff API                                     |
| :---------------------------------- | :--------------------------------------------------------- |
| `GET .../profiles/by-user/{userId}` | `GET .../profiles?user_id={userId}`                        |
| Create ไม่มี `username` ใน type     | ส่ง `username` แยกจาก `code` (หรือ UI แยก field — product) |
| Copy "Username = Staff Code"        | ไม่ bind implementation รอบนี้                             |

---

## Related documents

- [`tasks/plan.md`](tasks/plan.md) — implementation plan (approved)
- [`tasks/todo.md`](tasks/todo.md) — task list T01–T17
- [`../docs/business-domain.md`](../docs/business-domain.md)
- [`../docs/technical-architecture.md`](../docs/technical-architecture.md)
- [`../docs/database-erd.md`](../docs/database-erd.md)
- [`../../../gateway/routes.json`](../../../gateway/routes.json)
- [`../../../auth/src/modules/internal/internal.route.js`](../../../auth/src/modules/internal/internal.route.js)
- [`../../../ARCHITECTURE.md`](../../../ARCHITECTURE.md) (ถ้ามี)
- Coding standards: `coding-standard/backend/1-tech-stack.md` … `13-code-quality.md`
- Frontend consumer: `frontend/backoffice/src/lib/staffApiClient.ts`

---

## Changelog

| Date       | Change                                                                          |
| :--------- | :------------------------------------------------------------------------------ |
| 2026-05-28 | Initial SPEC from staff/docs SoT + monorepo context                             |
| 2026-05-28 | Locked decisions per docs; frontend out of scope this round                     |
| 2026-05-28 | Plan review: plugins layout, audit-writer, plan/todo 17 tasks — ready for build |
