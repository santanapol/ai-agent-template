# Task list: staff service

> อ้างอิง [`plan.md`](./plan.md) และ [`../SPEC.md`](../SPEC.md)  
> **Legend:** `[ ]` pending · `[~]` in progress · `[x]` done  
> **Gate:** T01–T17 complete — พร้อม human sign-off ตาม RUNBOOK

---

## Phase 0: Foundation

### T01: Bootstrap package & server shell

**Description:** สร้าง `package.json`, `src/server.js`, `src/app.js`, `.env.example`, eslint/prettier/husky ตาม `demo-service` — `PORT=3004`, scripts `dev|start|test|ci|lint|spec:lint|init:db`

**Acceptance criteria:**

- [x] `npm install` สำเร็จ; engines `node >=24 <25`
- [x] `npm run dev` ฟัง port 3004
- [x] `GET /healthz` → 200 (no Mongo required)
- [x] `GET /readyz` → 503 จนกว่า Mongo plugin จะต่อ (placeholder OK)
- [x] `.env.example` มี `GATEWAY_SHARED_SECRET`, `MONGODB_URI`, `DB_NAME`, `AUTH_INTERNAL_BASE_URL`, `AUTH_INTERNAL_SERVICE_SECRET`, `STAFF_PROVISION_DEFAULT_ROLE`

**Verification:**

- [x] `npm run lint` ผ่าน
- [x] `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3004/healthz` = 200

**Dependencies:** None

**Files likely touched:**

- `package.json`, `package-lock.json`, `eslint.config.js`, `.env.example`, `src/server.js`, `src/app.js`

**Estimated scope:** M

---

### T02: Shared lib — envelope, errors, ETag

**Description:** คัดลอก/adapt จาก `demo-service`: `envelope.js`, `error-codes.js` (loader จาก `codes.yaml`), `http-error.js`, `etag.js`, `validation-error.js`

**Acceptance criteria:**

- [x] `successEnvelope` / `errorEnvelope` ตาม [`6-api-response-codes.md`](../../../../../../../coding-standard/backend/6-api-response-codes.md) — field order `success` → `code` → `message` → `data`
- [x] Error responses: `data: null` + `requestId` จาก `x-request-id`
- [x] ETag `W/"..."` จาก `upd_date` ISO
- [x] Unit tests สำหรับ envelope field order และ etag round-trip

**Verification:**

- [x] `npm test -- --test-name-pattern="envelope|etag"`

**Dependencies:** T01

**Files likely touched:**

- `src/lib/envelope.js`, `src/lib/error-codes.js`, `src/lib/http-error.js`, `src/lib/etag.js`, `src/lib/tests/unit-test/*.test.js`, `codes.yaml` (skeleton)

**Estimated scope:** M

---

### T03: Mesh plugins, error handler & test harness

**Description:** Plugins `gateway-secret.js`, `user-context.js`, `error-handler.js` (adapt จาก `demo-service`) — mesh validation, global error → Custom JSON envelope; `src/lib/test-helpers/mesh-headers.js` สำหรับ integration tests

**Acceptance criteria:**

- [x] ไม่มี / secret ผิด → **401** `GATEWAY_SECRET_REJECTED`
- [x] Business routes ไม่มี user context → 403 `MISSING_GATEWAY_USER_CONTEXT`
- [x] `ou_id` / `branch_id` แปลง ObjectId ได้
- [x] Fastify validation errors → 400 `INVALID_PARAM` ผ่าน envelope (ไม่ unhandled rejection)
- [x] Test helper คืน headers ชุดมาตรฐาน (`x-gateway-secret`, `x-user-id`, …)

**Verification:**

- [x] Integration inject: missing secret → 401; invalid body → 400 + envelope
- [x] `npm test -- --test-name-pattern="gateway|user-context|error-handler"`

**Dependencies:** T02

**Files likely touched:**

- `src/plugins/gateway-secret.js`, `src/plugins/user-context.js`, `src/plugins/error-handler.js`, `src/lib/test-helpers/mesh-headers.js`, `src/app.js`, plugin tests

**Estimated scope:** M

---

### T04: MongoDB plugin & config

**Description:** `src/config/env.js`, `database.js`, `mongo-collections.js` (รวม `AUTH_AUDIT_EVENTS` / `auth_audit_events`); plugin เชื่อม Mongo; `readyz` ping

**Acceptance criteria:**

- [x] `MONGODB_URI`, `DB_NAME` จาก env (ชุดเดียวกับ auth ใน dev)
- [x] `GET /readyz` → 200 เมื่อ DB reachable
- [x] Singleton client / pool ตาม [`11-database-connection.md`](../../../../../../../coding-standard/backend/11-database-connection.md)

**Verification:**

- [x] `npm run dev` + `curl /readyz` = 200 (Mongo running)
- [x] `npm test` integration readyz

**Dependencies:** T01

**Files likely touched:**

- `src/config/env.js`, `src/config/database.js`, `src/config/mongo-collections.js`, `src/plugins/mongodb.js`

**Estimated scope:** M

---

## Phase 1: Contract & persistence

### T05: OpenAPI, codes.yaml, Spectral

**Description:** `openapi.yaml` (3.1), `openapi-via-gateway.yaml`, `codes.yaml`, `.spectral.yaml` — ประกาศ paths ทั้งหมดตาม SPEC; ลงทะเบียน `STAFF_AUTH_REVOKE_PENDING`; query `user_id`, `branch_id`, `status` (`active`|`archived`|`all`)

**Acceptance criteria:**

- [x] ทุก operation ใน SPEC HTTP table มี path + method
- [x] Global security `x-gateway-secret`; servers internal only
- [x] `npm run spec:lint` ผ่าน

**Verification:**

- [x] `npm run spec:lint`

**Dependencies:** T01

**Files likely touched:**

- `openapi.yaml`, `openapi-via-gateway.yaml`, `codes.yaml`, `.spectral.yaml`

**Estimated scope:** M

---

### T06: init-db, repository & audit writer base

**Description:** `scripts/init-db.mjs` — indexes + optional `$jsonSchema`; `profiles.repository.js` — insert, findById, findByUserId, mapToApi (ซ่อน `cr_*`/`upd_*`, join `user` snippet); `src/lib/audit/audit-writer.js` — insert `auth_audit_events` (ไม่มี reference ใน auth service — implement ใหม่ตาม docs §10)

**Acceptance criteria:**

- [x] Indexes: `uniq_user_id`, `uniq_ou_branch_code`, `list_by_branch_status`, `list_archived_by_ou`
- [x] ทุก query มี `ou_id` (+ branch ตาม scope)
- [x] `audit-writer` บันทึก `event_type`, `ou_id`, `branch_id`, actor จาก `x-user-id`, `*_prog` จาก route template
- [x] Integration: insert + find round-trip; audit document ปรากฏใน `auth_audit_events`

**Verification:**

- [x] `npm run init:db`
- [x] `npm test -- --test-name-pattern="repository|audit-writer"`

**Dependencies:** T04, T05

**Files likely touched:**

- `scripts/init-db.mjs`, `src/lib/audit/audit-writer.js`, `src/modules/profiles/profiles.repository.js`, integration tests

**Estimated scope:** M–L

---

## Phase 2: Read vertical slice

### T07: RBAC helpers & profiles.schema

**Description:** `assertProfileScope`, `resolveListScope`; JSON schemas สำหรับ query/body

**Acceptance criteria:**

- [x] `platform_admin` / `branch_admin` / self rules ตาม [`business-domain.md` §7](../../docs/business-domain.md)
- [x] `staff` → list 403 (`resolveListScope`)
- [x] Unit tests ครบ matrix หลัก (admin ข้ามสาขา / branch_admin บังคับ branch / self read)

**Verification:**

- [x] `npm test -- --test-name-pattern="rbac|scope"`

**Dependencies:** T03, T06

**Files likely touched:**

- `src/modules/profiles/profiles.schema.js`, `src/modules/profiles/profiles.service.js` (helpers), `src/modules/profiles/tests/unit-test/rbac.test.js`

**Estimated scope:** S

---

### T08: GET profile by id & lookup by user_id

**Description:** Vertical slice: register `profiles` routes ใน `app.js`; `GET /profiles/{id}`, `GET /profiles?user_id=`; ETag header; 404/403

**Acceptance criteria:**

- [x] Lookup คืน object เดียว + ETag (ไม่มี pagination)
- [x] `user_id` + `q`/`page`/`limit` → 400 `INVALID_PARAM`
- [x] Self: `user_id` = `x-user-id` ได้ภายใน ou/branch
- [x] Integration ใช้ `mesh-headers` helper

**Verification:**

- [x] `npm test -- --test-name-pattern="get.*profile|lookup"`
- [x] OpenAPI path ตรง implementation

**Dependencies:** T07

**Files likely touched:**

- `profiles.route.js`, `profiles.controller.js`, `profiles.service.js`, `src/app.js`, integration tests

**Estimated scope:** M

---

### T09: GET list — search, filter, pagination

**Description:** `GET /profiles` (ไม่มี `user_id`) — `q`, `status` (`active`|`archived`|`all`, default `active`), `branch_id`, `sort`, pagination; join username สำหรับ `q`

**Acceptance criteria:**

- [x] `data` เป็น array + `pagination`
- [x] `branch_admin` บังคับ branch; `platform_admin` optional `branch_id` filter
- [x] Sort default `upd_date` desc; รองรับ `code`, `firstname`, `lastname`, `upd_date`
- [x] `platform_admin` + `status=archived` ใช้ index `list_archived_by_ou` ได้

**Verification:**

- [x] `npm test -- --test-name-pattern="list.*profile"`

**Dependencies:** T08

**Files likely touched:**

- `profiles.service.js`, `profiles.repository.js`, integration tests, `openapi.yaml`

**Estimated scope:** M–L

---

## Phase 3: Write vertical slice

### T10: POST create — link existing user_id

**Description:** Admin create เมื่อส่ง `user_id` — validate user ใน ou/branch; **ห้าม** `username`/`password` ใน body; duplicate code → 409; duplicate `user_id` (1:1) → 409

**Acceptance criteria:**

- [x] 201 + profile + `user` snippet + `Location`
- [x] Audit `staff.profile_create`
- [x] Duplicate `(ou_id, branch_id, code)` → 409 `DUPLICATE`
- [x] Profile ที่มี `user_id` แล้ว → 409 `DUPLICATE`
- [x] `email` lowercase; `tel` E.164 ก่อน persist ([`business-domain.md` §3.4](../../docs/business-domain.md))

**Verification:**

- [x] `npm test -- --test-name-pattern="create.*user_id"`

**Dependencies:** T09

**Files likely touched:**

- `profiles.service.js`, `profiles.repository.js`, `src/lib/utils/normalize.js`, integration tests

**Estimated scope:** M

---

### T11: auth-internal client & POST create — provision

**Description:** `src/lib/clients/auth-internal.client.js`; create without `user_id` → `POST /internal/users` แล้ว insert profile; map auth `application/problem+json` errors → staff envelope codes

**Acceptance criteria:**

- [x] Body ต้องมี `username` (normalized **lowercase**, แยกจาก `code`) + `password` min 16
- [x] `STAFF_PROVISION_DEFAULT_ROLE` ส่งไป auth
- [x] ส่ง `user_id` พร้อม `username`/`password` → 400 `INVALID_PARAM`
- [x] auth fail → **ไม่** insert profile; propagate 503/409/400
- [x] Unit test mock axios; integration test happy path

**Verification:**

- [x] `npm test -- --test-name-pattern="provision|auth-internal"`

**Dependencies:** T10

**Files likely touched:**

- `src/lib/clients/auth-internal.client.js`, `profiles.service.js`, tests

**Estimated scope:** M

---

### T12: PATCH profile — admin & self (If-Match)

**Description:** `PATCH /profiles/{id}` — **`Content-Type: application/merge-patch+json`**; optimistic lock; own profile ละเว้น `code`; audit `staff.profile_update`

**Acceptance criteria:**

- [x] 428 ไม่มี If-Match; 412 stale; 200 + new ETag
- [x] ห้าม patch `user_id`, `ou_id`, `branch_id`, `status`, `password`
- [x] `email` lowercase + `tel` E.164 on update
- [x] Own profile: `code` ใน body ถูกละเว้น

**Verification:**

- [x] `npm test -- --test-name-pattern="patch.*profile"`

**Dependencies:** T08

**Files likely touched:**

- `profiles.service.js`, `profiles.controller.js`, `profiles.schema.js`, integration tests

**Estimated scope:** M

---

## Phase 4: Lifecycle & outbound

### T13: Archive & restore (admin only)

**Description:** `POST .../archive`, `POST .../restore` — If-Match only; **admin** (`platform_admin`|`branch_admin`) เท่านั้น — self ห้าม; restore ไม่เรียก auth

**Acceptance criteria:**

- [x] `active` ↔ `archived` transitions
- [x] Audit `staff.profile_archive` / `staff.profile_restore`
- [x] Non-admin (เช่น `staff`) → 403 `INVALID_USER_CONTEXT`

**Verification:**

- [x] `npm test -- --test-name-pattern="archive|restore"`

**Dependencies:** T12

**Files likely touched:**

- `profiles.service.js`, `profiles.route.js`, integration tests

**Estimated scope:** S

---

### T14: Archive outbound revoke & 503 path

**Description:** หลัง archive persist → `POST /internal/users/{id}/sessions/revoke` with **retry** (เช่น 3 ครั้ง, exponential backoff ตาม config env); fail → 503 `STAFF_AUTH_REVOKE_PENDING`

**Acceptance criteria:**

- [x] Mongo `status=archived` **ไม่ rollback** เมื่อ revoke fail หลัง retry
- [x] Integration: mock revoke fail → 503 + archived ใน DB
- [x] Retry policy ระบุใน `.env.example` (เช่น `AUTH_REVOKE_MAX_RETRIES`, `AUTH_REVOKE_BACKOFF_MS`)

**Verification:**

- [x] `npm test -- --test-name-pattern="revoke|503"`

**Dependencies:** T11, T13

**Files likely touched:**

- `profiles.service.js`, `auth-internal.client.js`, `codes.yaml`, `src/config/env.js`, tests

**Estimated scope:** M

---

### T15: POST admin password reset

**Description:** `POST /profiles/{id}/password` — admin scope; ห้าม own profile; auth `setPassword` + optional revoke; **204** empty body

**Acceptance criteria:**

- [x] `revoke_sessions` default `true`
- [x] 403 own profile; 404 no profile
- [x] 503 เมื่อ auth down (mapped จาก problem+json)

**Verification:**

- [x] `npm test -- --test-name-pattern="password"`

**Dependencies:** T11, T08

**Files likely touched:**

- `profiles.route.js`, `profiles.service.js`, `openapi.yaml`, tests

**Estimated scope:** S

---

## Phase 5: Hardening & ship

### T16: Metrics & observability

**Description:** `/metrics` (prom-client); counter `staff_auth_revoke_pending_total`; structured logging (pino); optional `duplicate-header` guard จาก demo

**Acceptance criteria:**

- [x] Counter increment เมื่อ archive 503 revoke path
- [x] `/metrics` เปิดตาม env (private network only)

**Verification:**

- [x] `npm test -- --test-name-pattern="metrics"`
- [x] Manual scrape `/metrics` หลัง simulate 503

**Dependencies:** T14

**Files likely touched:**

- `src/plugins/metrics.js`, `src/config/logger.js`, `src/app.js`

**Estimated scope:** S

---

### T17: CI gate & gateway manual checklist

**Description:** `README.md`, `RUNBOOK.md`; `npm run ci` ครบ; manual E2E ผ่าน gateway; coverage ≥80% บน `src/modules/profiles/**` + `auth-internal.client.js`

**Acceptance criteria:**

- [x] `npm run ci` ผ่าน
- [x] RUNBOOK: env vars, `init:db`, ports, gateway curl examples (lookup `?user_id=`, provision body)
- [x] SPEC Success Criteria 1–9 ติ๊กได้ (ยกเว้น frontend)

**Verification:**

- [x] `npm run ci`
- [ ] Manual checklist ใน RUNBOOK ทำครบ 1 รอบ (human sign-off)

**Dependencies:** T01–T16

**Files likely touched:**

- `README.md`, `RUNBOOK.md`, `.env.example`, `package.json` (coverage threshold)

**Estimated scope:** S

---

## Checkpoints (quick reference)

| ID  | After | Gate                                           |
| :-- | :---- | :--------------------------------------------- |
| CP0 | T04   | healthz/readyz + mesh **401** + error envelope |
| CP1 | T06   | spec:lint + init:db + audit writer smoke       |
| CP2 | T09   | read APIs + list RBAC                          |
| CP3 | T12   | create (link + provision) + patch              |
| CP4 | T14   | lifecycle + revoke 503                         |
| CP5 | T15   | admin password                                 |
| CP6 | T17   | `npm run ci` + human sign-off                  |

---

## Parallelization notes

| หลัง task | ทำขนานได้                                       |
| :-------- | :---------------------------------------------- |
| T02       | T05 (openapi) — sync merge ที่ paths            |
| T08       | Unit tests คู่ T09                              |
| T12       | คู่ T09/T10 บางส่วน (PATCH ไม่ต้องรอ list)      |
| T13       | เริ่มได้หลัง T12 (archive ยังไม่ revoke จน T14) |

**ห้ามขนาน:** T06 กับ integration ที่ต้องการ indexes; T14 กับ T11 (ต้องมี auth client)

---

## Progress tracker

| Task | Status |
| :--- | :----- |
| T01  | `[x]`  |
| T02  | `[x]`  |
| T03  | `[x]`  |
| T04  | `[x]`  |
| T05  | `[x]`  |
| T06  | `[x]`  |
| T07  | `[x]`  |
| T08  | `[x]`  |
| T09  | `[x]`  |
| T10  | `[x]`  |
| T11  | `[x]`  |
| T12  | `[x]`  |
| T13  | `[x]`  |
| T14  | `[x]`  |
| T15  | `[x]`  |
| T16  | `[x]`  |
| T17  | `[x]`  |
