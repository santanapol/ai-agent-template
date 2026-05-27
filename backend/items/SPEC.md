# Spec: items-service

> **Status:** Approved — ready for `/plan`
> **Last updated:** 2026-05-27

## Objective

สร้าง **Items Service** — REST API สำหรับ **บันทึก (สร้าง) ITEM ใหม่** ที่ประกอบด้วย `name` และ `desc` โดยเก็บใน MongoDB

### Target users
- **Internal services / Frontend** ที่เรียกผ่าน API Gateway (ส่ง trusted headers ตามมาตรฐานองค์กร)
- **Developers** ที่พัฒนาและทดสอบ service ใน local environment

### User stories
1. ในฐานะ **ผู้ใช้ระบบ** ฉันต้องการ **สร้าง ITEM ใหม่** ด้วย `name` และ `desc` เพื่อบันทึกข้อมูลสินค้า/รายการ
2. ในฐานะ **ระบบ** ฉันต้องการ **ป้องกันชื่อซ้ำ** ภายใน OU+Branch เดียวกัน เพื่อไม่ให้มี ITEM ชื่อเดียวกันในขอบเขตเดียวกัน

### Scope (v1)
- **In scope:** `POST /api/v1/items` + health probes (`/healthz`, `/readyz`)
- **Out of scope:** GET (list/detail), PATCH, DELETE — หากต้องการในอนาคต ให้เปิด Spec ใหม่

### Success criteria (testable)
- [ ] `POST /api/v1/items` สร้าง document ใน `items.items` สำเร็จ → HTTP **201** + `code: CREATED` + `ETag` response header
- [ ] `POST` ด้วย `name` ที่ซ้ำใน OU+Branch เดียวกัน → HTTP **409** + `code: DUPLICATE`
- [ ] Request ที่ไม่มี `x-gateway-secret` ถูกต้อง → HTTP **401** + `code: GATEWAY_SECRET_REJECTED`
- [ ] Request ที่ขาด tenant headers → HTTP **403** + `code: MISSING_GATEWAY_USER_CONTEXT`
- [ ] Validation ล้มเหลว (`name` ว่าง / เกิน 200 chars / `desc` เกิน 2000 chars) → HTTP **400** + `code: INVALID_PARAM`
- [ ] `npm test` ผ่านทั้งหมด, `npm run lint` ไม่มี error
- [ ] `openapi.yaml` ผ่าน Spectral validation

---

## Confirmed Decisions

| Topic | Decision |
| :--- | :--- |
| **API scope** | `POST` (create) เท่านั้น |
| **Unique name** | `name` unique ภายใน `ou_id` + `branch_id` |
| **Validation** | `name`: required, 1–200 chars — `desc`: optional, max 2000 chars |
| **Port** | `3000` |
| **Gateway secret** | Generate ใหม่สำหรับ local dev (ดู `.env.example`) |
| **Pagination defaults** | `page=1`, `limit=20`, `sort=-upd_date` — สำรองไว้สำหรับ GET ในอนาคต (out of scope v1) |

---

## Tech Stack

| Component | Specification |
| :--- | :--- |
| **Runtime** | Node.js v24.x LTS |
| **Framework** | Express ^4.18.2 |
| **Database** | MongoDB v8.0.x (driver `mongodb` ^7.2.0) |
| **Module system** | ESM (`"type": "module"`) |
| **Validation** | Joi ^17.13.3 |
| **Testing** | Jest ^30.2.0 + Supertest ^7.2.2 |
| **Lint / Format** | ESLint 9 + Prettier 3 |
| **Logging** | pino + pino-http |
| **API contract** | OpenAPI 3.1.0 (`openapi.yaml`) |

### Environment variables

| Variable | Description | Example (local dev) |
| :--- | :--- | :--- |
| `MONGODB_URI` | MongoDB connection string | `mongodb://admin:***@localhost:27017/?authSource=admin` |
| `DB_NAME` | Database name | `items` |
| `PORT` | HTTP listen port | `3000` |
| `GATEWAY_SECRET` | Expected `x-gateway-secret` value | `a2fecb45705b2cdc7a4ae447e39137b43d51e0451602024f0538cc14df30535b` |
| `NODE_ENV` | Environment | `development` / `test` / `production` |

> **Security note:** ค่า connection string จาก `raw_requirement.md` ใช้เฉพาะ local dev — ห้าม commit credentials ลง Git. `GATEWAY_SECRET` ใน `.env.example` เป็นค่า dev-only; production ต้อง rotate ใหม่

---

## Commands

```bash
# Install dependencies (local dev)
npm install

# Install in CI (from lockfile)
npm ci

# Run development server
npm run dev

# Run production server
npm start

# Run all tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint

# Lint with auto-fix
npm run lint -- --fix

# Format
npm run format

# Validate OpenAPI contract (Spectral)
npm run lint:openapi

# Health check (manual)
curl -s http://localhost:3000/healthz
```

---

## Project Structure

```text
services/items/
├── SPEC.md                             # This spec
├── raw_requirement.md                  # Original requirement
├── openapi.yaml                        # OpenAPI 3.1.0 contract
├── .env.example                        # Env template (dev gateway secret included)
├── package.json
├── package-lock.json
├── src/
│   ├── config/
│   │   └── database.js                 # MongoDB singleton connection
│   ├── controllers/
│   │   └── items.controller.js         # HTTP request/response handling
│   ├── middlewares/
│   │   ├── auth.middleware.js          # x-gateway-secret validation
│   │   ├── user-context.middleware.js  # x-user-* header parsing
│   │   ├── request-id.middleware.js    # x-request-id propagation
│   │   ├── error.middleware.js         # Global error handler
│   │   └── validate.middleware.js      # Joi validation wrapper
│   ├── models/
│   │   └── items.model.js              # Collection access + queries
│   ├── routes/
│   │   ├── items.routes.js             # POST /api/v1/items
│   │   └── health.routes.js            # /healthz, /readyz
│   ├── services/
│   │   └── items.service.js            # Business logic layer
│   ├── utils/
│   │   ├── response.js                 # Standard response envelope
│   │   ├── etag.js                     # Weak ETag from upd_date (POST response)
│   │   └── audit.js                    # Audit field helpers
│   ├── app.js                          # Express app setup
│   └── server.js                       # Entry point + DB connect
└── tests/
    ├── integration/
    │   └── items.routes.test.js        # POST endpoint integration tests
    └── unit/
        ├── items.service.test.js
        └── etag.test.js
```

---

## Data Model

### Collection: `items` (database: `items`)

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | auto | Primary key |
| `ou_id` | ObjectId | yes | Tenant — from `x-user-ou` |
| `branch_id` | ObjectId | yes | Branch — from `x-user-branch` |
| `name` | string | yes | Item name (1–200 chars, unique per OU+Branch) |
| `desc` | string | no | Item description (0–2000 chars, default `''`) |
| `cr_by` | string | yes | Creator user id |
| `cr_date` | Date | yes | Created timestamp |
| `cr_prog` | string | yes | Route that created (`POST /api/v1/items`) |
| `upd_by` | string | yes | Same as `cr_by` on create |
| `upd_date` | Date | yes | Same as `cr_date` on create |
| `upd_prog` | string | yes | Same as `cr_prog` on create |

### Indexes
- `{ ou_id: 1, branch_id: 1, name: 1 }` — **unique** (prevents duplicate names within tenant+branch)

### Validation rules (Joi)

| Field | Rule |
| :--- | :--- |
| `name` | `string().trim().min(1).max(200).required()` |
| `desc` | `string().trim().max(2000).optional().default('')` |

---

## API Endpoints

Base path: `/api/v1/items`

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/items` | Create item |
| `GET` | `/healthz` | Liveness probe |
| `GET` | `/readyz` | Readiness probe (includes DB check) |

### Required headers (POST)

| Header | Required | Description |
| :--- | :--- | :--- |
| `x-gateway-secret` | yes | Gateway authentication |
| `x-user-ou` | yes | Tenant OU id (ObjectId string) |
| `x-user-branch` | yes | Branch id (ObjectId string) |
| `x-user-id` | yes | Acting user id |
| `x-user-role` | yes | User role |
| `x-request-id` | no | Correlation id (generated if missing) |
| `Content-Type` | yes | Must be `application/json` when body present |

### Request body

```json
{
  "name": "Widget A",
  "desc": "Optional description"
}
```

### Response envelope (201 CREATED)

```json
{
  "success": true,
  "code": "CREATED",
  "message": "Item created successfully",
  "data": {
    "id": "665a1b2c3d4e5f6789012345",
    "name": "Widget A",
    "desc": "Optional description",
    "cr_by": "user-001",
    "cr_date": "2026-05-27T10:00:00.000Z",
    "upd_by": "user-001",
    "upd_date": "2026-05-27T10:00:00.000Z"
  }
}
```

Response headers: `ETag: W/"<base64(upd_date)>"` (weak ETag per coding standard)

Field order: `success` → `code` → `message` → `data`

### Error responses

| HTTP | Code | When |
| :--- | :--- | :--- |
| 400 | `INVALID_PARAM` | Joi validation failed |
| 400 | `INVALID_HEADER` | Duplicate critical headers |
| 401 | `GATEWAY_SECRET_REJECTED` | Wrong/missing `x-gateway-secret` |
| 403 | `MISSING_GATEWAY_USER_CONTEXT` | Missing `x-user-*` headers |
| 409 | `DUPLICATE` | `name` already exists in same OU+Branch |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Code Style

Follow `coding-standard/backend/13-code-quality.md`:

- **ESM imports** with explicit `.js` extensions
- **Single quotes**, **semicolons**, **2-space indent**
- **Layered architecture:** Route → Controller → Service → Model (no layer skipping)
- **No `console.log`** — use `pino` logger
- **Naming:** camelCase for variables/functions, kebab-case for routes, UPPER_SNAKE_CASE for response codes

### Example (service layer)

```javascript
import { ObjectId } from 'mongodb';
import * as itemsModel from '../models/items.model.js';
import { buildAuditCreate } from '../utils/audit.js';

export async function createItem({ ouId, branchId, userId, body, prog }) {
  const payload = {
    ou_id: new ObjectId(ouId),
    branch_id: new ObjectId(branchId),
    name: body.name,
    desc: body.desc ?? '',
    ...buildAuditCreate({ userId, prog }),
  };

  return itemsModel.insertOne(payload);
}
```

---

## Testing Strategy

| Level | Tool | Location | Scope |
| :--- | :--- | :--- | :--- |
| **Unit** | Jest | `tests/unit/` | Service logic, ETag utils, audit helpers |
| **Integration** | Jest + Supertest | `tests/integration/` | POST happy-path + error paths |
| **Contract** | Spectral | `openapi.yaml` | OpenAPI lint in CI |

### Coverage target
- **≥ 80%** line coverage for `src/services/` and `src/controllers/`
- POST endpoint: at minimum — create success, duplicate name (409), validation error (400), auth error (401), missing context (403)

### Test database
- Use `DB_NAME=items_test` in test environment
- Clean up test data in `afterEach` / `afterAll` hooks
- Do not run tests against production credentials

### Verify before commit
```bash
npm run lint && npm test -- --coverage && npm run lint:openapi
```

---

## Boundaries

### Always
- Scope every DB query with `ou_id` + `branch_id` from trusted headers
- Include audit fields (`cr_*`, `upd_*`) on create (`upd_*` = `cr_*` at creation time)
- Return `ETag` header on successful POST
- Return standard response envelope per `coding-standard/backend/6-api-response-codes.md`
- Validate input with Joi before hitting service layer
- Enforce unique `name` per OU+Branch (index + handle duplicate key error → 409)
- Keep secrets in `.env` only — provide `.env.example` with dev gateway secret
- Commit `package-lock.json`

### Ask first
- Adding dependencies outside the standard stack
- Expanding scope beyond POST (GET/PATCH/DELETE)
- Modifying tenant scoping rules
- Changing API versioning (`/api/v1/` → v2)
- Database schema migrations or index changes in shared environments

### Never
- Commit `.env` with production credentials or MongoDB passwords
- Use `console.log` in production code
- Return HTTP 200 with error codes in body
- Query MongoDB without tenant filters
- Call Model layer directly from Controller (bypass Service)

---

## Future scope (not in v1)

เมื่อต้องการเพิ่ม GET list endpoint ให้ใช้ pagination defaults ที่ยืนยันแล้ว:
- `page=1`, `limit=20`, `sort=-upd_date`
- Index แนะนำ: `{ ou_id: 1, branch_id: 1, upd_date: -1 }`
