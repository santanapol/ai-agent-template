# Implementation Plan: items-service

> **Source spec:** [`../SPEC.md`](../SPEC.md)  
> **Status:** Pending human review  
> **Created:** 2026-05-27

## Overview

สร้าง **items-service** ใหม่ทั้งหมดใน `services/items/` — Express (ESM) microservice ที่รับ `POST /api/v1/items` เพื่อบันทึก ITEM (`name`, `desc`) ลง MongoDB พร้อม tenant isolation, audit fields, unique name per OU+Branch, และ health probes

งานนี้เป็น **greenfield** (ยังไม่มีโค้ดเดิม) แผนหั่นแนวตั้ง (vertical slice) เพื่อให้แต่ละ Task ส่งมอบส something ที่รันและทดสอบได้

---

## Architecture Decisions

| Decision | Choice | Rationale |
| :--- | :--- | :--- |
| **Layering** | Route → Controller → Service → Model | ตาม `coding-standard/backend/2-folder-structure.md` และ boundary enforcement |
| **DB access** | MongoDB native driver + singleton | ตาม `coding-standard/backend/11-database-connection.md` |
| **Unique constraint** | Compound unique index `{ ou_id, branch_id, name }` | ป้องกัน race condition ดีกว่า check-then-insert; map duplicate key → 409 |
| **Auth model** | Trust Gateway headers (`x-gateway-secret`, `x-user-*`) | Service ไม่ implement login เอง — รับ context จาก Gateway |
| **Validation** | Joi middleware ก่อน controller | Fail fast ด้วย 400 `INVALID_PARAM` |
| **ETag** | Weak ETag จาก `upd_date` บน POST 201 | ตาม `coding-standard/backend/4-request-headers.md` |
| **Logging** | pino + pino-http | ตาม `coding-standard/backend/10-observability-and-logging.md` |
| **Test DB** | `DB_NAME=items_test` ใน test env | แยกจาก dev DB, cleanup หลัง test |
| **Index bootstrap** | `ensureIndex` ตอน server startup | ไม่ต้อง migration tool สำหรับ scope v1 |

---

## Dependency Graph

```
package.json + .env.example
        │
        ▼
src/config/database.js ─────────────────────────────┐
        │                                          │
        ▼                                          ▼
src/utils/ (response, audit, etag)     src/middlewares/ (auth, user-context,
        │                               request-id, validate, error)
        │                                          │
        └──────────────┬───────────────────────────┘
                       ▼
              src/models/items.model.js
              (insertOne + ensureIndex)
                       │
                       ▼
              src/services/items.service.js
                       │
                       ▼
           src/controllers/items.controller.js
                       │
                       ▼
              src/routes/items.routes.js
              src/routes/health.routes.js
                       │
                       ▼
                 src/app.js → src/server.js
                       │
                       ▼
              tests/ (unit + integration)
                       │
                       ▼
                 openapi.yaml
```

**ลำดับบังคับ:** Foundation → Shared infra → POST happy path → Error paths → Contract/docs  
**ทำขนานได้ (หลัง Task 2):** unit tests ของ utils กับ openapi.yaml draft

---

## Task List

### Phase 1: Foundation

---

## Task 1: Project bootstrap + health probes

**Description:** ตั้งโครงสร้างโปรเจกต์ Node.js ESM, dependencies ตาม tech stack, ESLint/Prettier config, `.env.example`, Express app skeleton, และ health endpoints ที่ไม่ต้องพึ่ง business logic

**Acceptance criteria:**
- [ ] `package.json` มี `"type": "module"`, scripts: `start`, `dev`, `test`, `lint`, `format`
- [ ] `.env.example` มี `MONGODB_URI`, `DB_NAME`, `PORT=3000`, `GATEWAY_SECRET`, `NODE_ENV`
- [ ] `GET /healthz` → 200 (liveness)
- [ ] `GET /readyz` → 503 ก่อนต่อ DB (หรือ 200 หลัง mock DB ใน test)
- [ ] `npm run lint` รันได้โดยไม่ error (แม้ยังไม่มี business code)

**Verification:**
- [ ] `npm install && npm run lint`
- [ ] `npm start` แล้ว `curl http://localhost:3000/healthz` ได้ 200

**Dependencies:** None

**Files likely touched:**
- `package.json`
- `.env.example`
- `eslint.config.js` (หรือเทียบเท่า)
- `.prettierrc`
- `src/app.js`
- `src/server.js`
- `src/routes/health.routes.js`

**Estimated scope:** M (5 ไฟล์)

---

## Task 2: MongoDB connection + readiness + index bootstrap

**Description:** เชื่อมต่อ MongoDB แบบ singleton, ทำให้ `/readyz` ตรวจ DB ได้จริง, และสร้าง unique index `{ ou_id, branch_id, name }` ตอน startup

**Acceptance criteria:**
- [ ] `connectDatabase()` / `getDatabase()` ตาม pattern ใน coding standard
- [ ] `GET /readyz` → 200 เมื่อ MongoDB พร้อม, 503 เมื่อไม่พร้อม
- [ ] Unique index ถูกสร้างบน collection `items` ตอน startup
- [ ] Fail-fast เมื่อไม่มี `MONGODB_URI` หรือ `DB_NAME`

**Verification:**
- [ ] `npm start` กับ MongoDB local → `/readyz` 200
- [ ] หยุด MongoDB → `/readyz` 503

**Dependencies:** Task 1

**Files likely touched:**
- `src/config/database.js`
- `src/models/items.model.js` (ensureIndex เท่านั้น)
- `src/server.js`
- `src/routes/health.routes.js`

**Estimated scope:** S–M (3–4 ไฟล์)

---

### Checkpoint: Foundation

- [ ] Server boot ได้, `/healthz` และ `/readyz` ทำงาน
- [ ] MongoDB connect + unique index พร้อม
- [ ] `npm run lint` ผ่าน
- [ ] **Human review** ก่อนเริ่ม Phase 2

---

### Phase 2: Core Feature (POST create — vertical slices)

---

## Task 3: Shared utilities + middleware stack

**Description:** สร้าง response envelope, audit helpers, ETag generator, และ middleware chain ที่ POST ต้องใช้ (auth, user-context, request-id, validate, error handler)

**Acceptance criteria:**
- [ ] `sendSuccess()` / `sendError()` คืน envelope ตาม field order: `success` → `code` → `message` → `data`
- [ ] `buildAuditCreate()` ตั้ง `cr_*` และ `upd_*` ให้เท่ากันตอน create
- [ ] `generateETag(updDate)` คืน weak ETag `W/"..."`
- [ ] Auth middleware: wrong/missing secret → 401 `GATEWAY_SECRET_REJECTED`
- [ ] User-context middleware: missing `x-user-*` → 403 `MISSING_GATEWAY_USER_CONTEXT`
- [ ] Duplicate critical headers → 400 `INVALID_HEADER`
- [ ] Joi validate middleware สำหรับ `{ name, desc }` ตาม SPEC
- [ ] Unit tests สำหรับ audit + etag utils

**Verification:**
- [ ] `npm test -- tests/unit/etag.test.js`
- [ ] `npm test -- tests/unit/audit.test.js` (ถ้าแยกไฟล์)

**Dependencies:** Task 1

**Files likely touched:**
- `src/utils/response.js`
- `src/utils/audit.js`
- `src/utils/etag.js`
- `src/middlewares/auth.middleware.js`
- `src/middlewares/user-context.middleware.js`
- `src/middlewares/request-id.middleware.js`
- `src/middlewares/validate.middleware.js`
- `src/middlewares/error.middleware.js`
- `tests/unit/etag.test.js`
- `tests/unit/audit.test.js`

**Estimated scope:** M (8–10 ไฟล์ — แต่เป็น shared infra ที่ POST ต้องใช้)

---

## Task 4: POST /api/v1/items — happy path

**Description:** Vertical slice สร้าง ITEM สำเร็จ — model insert, service logic, controller, route wiring, integration test ครบ flow

**Acceptance criteria:**
- [ ] `POST /api/v1/items` + headers ครบ + body valid → **201** `CREATED`
- [ ] Response `data` มี `id`, `name`, `desc`, audit fields; `_id` แปลงเป็น `id`
- [ ] Response header มี `ETag`
- [ ] Document ถูกบันทึกใน `items.items` พร้อม `ou_id`, `branch_id`, audit fields
- [ ] Integration test happy path ผ่าน

**Verification:**
- [ ] `npm test -- tests/integration/items.routes.test.js --grep "creates item"`
- [ ] Manual: `curl -X POST ...` ได้ 201

**Dependencies:** Task 2, Task 3

**Files likely touched:**
- `src/models/items.model.js` (insertOne)
- `src/services/items.service.js`
- `src/controllers/items.controller.js`
- `src/routes/items.routes.js`
- `src/app.js`
- `tests/integration/items.routes.test.js`
- `tests/helpers/` (test headers factory — optional)

**Estimated scope:** M (5–6 ไฟล์)

---

## Task 5: POST error paths + duplicate handling

**Description:** ครอบคลุม error scenarios ที่ SPEC กำหนด — validation, auth, tenant context, duplicate name

**Acceptance criteria:**
- [ ] `name` ว่าง / เกิน 200 chars → **400** `INVALID_PARAM`
- [ ] `desc` เกิน 2000 chars → **400** `INVALID_PARAM`
- [ ] Missing/wrong `x-gateway-secret` → **401** `GATEWAY_SECRET_REJECTED`
- [ ] Missing `x-user-ou` / `x-user-branch` / `x-user-id` / `x-user-role` → **403** `MISSING_GATEWAY_USER_CONTEXT`
- [ ] Duplicate `name` ใน OU+Branch เดียวกัน → **409** `DUPLICATE`
- [ ] Integration tests ครบทุก error path ด้านบน

**Verification:**
- [ ] `npm test -- tests/integration/items.routes.test.js`
- [ ] ทุก test case ใน SPEC success criteria (error paths) ผ่าน

**Dependencies:** Task 4

**Files likely touched:**
- `src/services/items.service.js` (duplicate mapping)
- `src/middlewares/error.middleware.js` (MongoDB duplicate key)
- `tests/integration/items.routes.test.js`

**Estimated scope:** S–M (3 ไฟล์)

---

### Checkpoint: Core Feature

- [ ] `POST /api/v1/items` happy path + ทุก error path ทำงาน
- [ ] `npm test` ผ่านทั้งหมด
- [ ] Coverage ≥ 80% บน `src/services/` และ `src/controllers/`
- [ ] **Human review** ก่อน Phase 3

---

### Phase 3: Contract & Quality Gate

---

## Task 6: OpenAPI contract + Spectral lint

**Description:** เขียน `openapi.yaml` (OpenAPI 3.1.0) สำหรับ POST + health probes ตาม coding standards และเพิ่ม script `lint:openapi`

**Acceptance criteria:**
- [ ] `openapi.yaml` ที่ root ของ service — OpenAPI 3.1.0
- [ ] `info.title` = `items-service` (ตรง `package.json` name)
- [ ] Global security: `x-gateway-secret`
- [ ] Header parameters เรียงลำดับตาม standard (ou → branch → id → role → request-id)
- [ ] `POST /api/v1/items` documented พร้อม request/response schemas
- [ ] `npm run lint:openapi` รัน Spectral ผ่าน (หรือ documented skip ถ้ายังไม่มี org ruleset — ต้องมี script พร้อม)

**Verification:**
- [ ] `npm run lint:openapi`
- [ ] เปรียบเทียบ contract กับ integration tests — status codes + body shape ตรงกัน

**Dependencies:** Task 4, Task 5

**Files likely touched:**
- `openapi.yaml`
- `package.json` (script + devDependency `@stoplight/spectral-cli`)
- `.spectral.yaml` (ถ้าจำเป็น)

**Estimated scope:** S–M (2–3 ไฟล์)

---

## Task 7: Final quality gate + service unit tests

**Description:** เติม unit tests ที่ขาด, ตั้ง Jest coverage threshold, และยืนยัน quality gate ก่อนส่งมอบ

**Acceptance criteria:**
- [ ] `tests/unit/items.service.test.js` ครอบ create logic + duplicate error mapping
- [ ] Jest coverage threshold ≥ 80% สำหรับ `src/services/` และ `src/controllers/`
- [ ] `npm run lint && npm test -- --coverage && npm run lint:openapi` ผ่านทั้งหมด
- [ ] ไม่มี `console.log` ใน `src/`

**Verification:**
- [ ] `npm run lint && npm test -- --coverage && npm run lint:openapi`
- [ ] ตรวจ SPEC success criteria checklist ครบทุกข้อ

**Dependencies:** Task 5, Task 6

**Files likely touched:**
- `tests/unit/items.service.test.js`
- `jest.config.js`
- `package.json`

**Estimated scope:** S (2–3 ไฟล์)

---

### Checkpoint: Complete

- [ ] SPEC success criteria ครบทุกข้อ
- [ ] Quality gate ผ่าน: lint + test + openapi
- [ ] พร้อม `/build` (implementation phase)

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| MongoDB local ไม่รัน / credentials ผิด | High | Document ใน `.env.example`; `/readyz` fail-fast; test ใช้ `items_test` DB |
| Duplicate name race condition | Med | ใช้ unique compound index + catch error code 11000 → 409 |
| Spectral org ruleset ยังไม่มีใน repo | Med | ใช้ base Spectral rules ก่อน; ถ้า CI ต้อง org ruleset ให้ copy จาก standard ภายหลัง |
| ObjectId ใน test headers ไม่ valid | Low | สร้าง test helper ที่ generate valid ObjectId strings |
| pino ไม่อยู่ใน standard dependencies list | Low | เพิ่มตาม observability standard — ถือเป็น required deviation ที่ documented |

---

## Parallelization Opportunities

| ทำขนานได้ | ต้องทำตามลำดับ |
| :--- | :--- |
| Unit tests (etag, audit) หลัง Task 3 | Task 1 → Task 2 → Task 4 |
| Draft `openapi.yaml` หลัง Task 4 route นิ่ง | Task 3 ก่อน Task 4 (middleware) |
| README/dev docs (optional) | Task 5 ก่อน merge error paths |

---

## Open Questions

- [ ] มี Spectral org ruleset (`org-api.yaml`) ใน repo หรือต้องใช้ default rules ชั่วคราว?
- [ ] ต้องการ `pino-pretty` ใน dev dependency หรือใช้ JSON log อย่างเดียว?
- [ ] CI pipeline สำหรับ service นี้อยู่ที่ repo root หรือแยก — out of scope v1 แต่ควรรู้ก่อน ship

---

## Estimated Timeline

| Phase | Tasks | ประมาณ |
| :--- | :--- | :--- |
| Foundation | 1–2 | 1 session |
| Core Feature | 3–5 | 2 sessions |
| Contract & QA | 6–7 | 1 session |
| **Total** | **7 tasks** | **~3–4 focused sessions** |
