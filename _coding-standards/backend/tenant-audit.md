# Backend tenant + audit + concurrency standard

Audit fields, tenant scoping (`ou_id` / `branch_id`), optimistic concurrency (ETag + `If-Match`)

> **Tag legend:** [`README.md` → Tag legend](./README.md#tag-legend)

> **Scope:** ทุก service ที่มี persisted resource ใช้ tenant + audit model นี้ — std.min ถือเป็น **[Required]** baseline. Service ที่ไม่มี tenant concept (lookup, public catalog) ต้อง **ADR** + access control layer อื่นทดแทน

## Table of contents
1. **Audit & Traceability** (Audit fields contract)
2. **Data Isolation** (Tenant scoping, Header ID format)
3. **Concurrency Control** (ETag, If-Match enforcement)
4. **Forbidden Practices**

---

## 1. Audit & Traceability

### 1.1 Audit fields contract [Required]

ทุก resource ที่ persisted ต้อง track **audit fields** + **tenant scope**; std.min กำหนด **API-layer contract** ให้ client เห็น concept นี้แบบ **opaque** ผ่าน **ETag** โดยไม่ expose ฟิลด์จริงใน envelope

| Field | Type | Source | Set on |
| :--- | :--- | :--- | :--- |
| **`cr_by`** | String | `req.headers['x-user-id']` (trimmed) | **insert only** — immutable |
| **`cr_date`** | Date (UTC) | server `new Date()` at repository | **insert only** — immutable |
| **`cr_prog`** | String | **route template** (`req.baseUrl + req.route.path`) | **insert only** — immutable |
| **`upd_by`** | String | `req.headers['x-user-id']` (trimmed) | insert **และ** every update |
| **`upd_date`** | Date (UTC) | server `new Date()` — refresh ทุก update | insert **และ** every update |
| **`upd_prog`** | String | route template | insert **และ** every update |

**Rules:**

- **Hidden from response** — Repository / mapper ต้อง **strip** ทั้ง 6 fields ก่อน return envelope; `openapi.yaml` **ห้าม** ประกาศ fields นี้ใน response schema
- **Client ห้ามส่ง** audit fields ใน request body (**update รวม `upd_date`**) — Joi `.unknown(false)` จะ reject เป็น **400 `INVALID_PARAM`** sub-code `UNKNOWN_FIELD`
- **Server-only derivation** — derive ที่ **service / repository layer**; controller ห้ามเขียนตรงจาก body
- **Route template, not URL** — `cr_prog` / `upd_prog` ใช้ pattern (`/api/v1/users/:userId`) ไม่ใช่ URL จริง (กัน PII leak + ง่ายต่อ audit aggregation)
- **Missing `x-user-id`** บน route ที่ต้อง audit → **403 `MISSING_GATEWAY_USER_CONTEXT`** (ดู [API → Scope and authentication](./api.md#scope-and-authentication))

---

## 2. Data Isolation

### 2.1 Tenant scoping (`ou_id` / `branch_id`) [Required]

| Field | Source | Enforcement |
| :--- | :--- | :--- |
| **`ou_id`** | `req.headers['x-user-ou']` (trimmed) | **ทุก** query filter + insert body (server-side) |
| **`branch_id`** | `req.headers['x-user-branch']` (trimmed) | เหมือน `ou_id` |

### 2.2 Header ID format (MongoDB `ObjectId` profile)

ใช้เมื่อ service persist **`ou_id` / `branch_id` เป็น BSON `ObjectId`** (กรณีทั่วไปของ internal API บน MongoDB):

| Header | Rule |
| :--- | :--- |
| **`x-user-ou`** / **`x-user-branch`** | ต้องเป็น **สตริง hex ความยาว 24** (`[0-9a-fA-F]{24}`) ที่แมปไป **`ObjectId`** ได้; gateway ต้องไม่ส่งค่าอื่นที่นำไป query/insert เป็น `ObjectId` แล้วไม่ตรงชนิดกับเอกสาร |
| **`x-user-id`** | ถ้า **`cr_by` / `upd_by` persist เป็น `ObjectId`** — ใช้กฎเดียวกับแถวบน; ถ้า persist เป็น **สตริงอิสระ** (เช่น subject จาก IdP) — `x-user-id` เป็น opaque string ตาม OpenAPI **ไม่** บังคับ hex 24 |

**หมายเหตุ:** ถ้าบังคับทั้งสาม header เป็น ObjectId เสมอในองค์กร — ถือเป็น **นโยบายเดียวกับแถวแรก + บังคับ `cr_by`/`upd_by` เป็น `ObjectId`**; ระบุใน OpenAPI ของแต่ละ service และ validator ที่ขอบเขตเดียวกับ repo

**Deviation:** tenant หรือ actor ใช้ UUID / เลข running / รหัสอื่น — **ADR**; repository ต้องไม่ผสมชนิด BSON กับสตริงใน filter โดยไม่ตั้งใจ

**Rules:**

- **Repository invariant** — ทุก `find*` / `updateOne` / `deleteOne` / aggregation ต้อง **AND** `ou_id` + `branch_id` ใน filter stage แรก (tenant isolation; cross-tenant read/write = security incident)
- **Insert** — server merge `ou_id` + `branch_id` เข้า document ตอน create
- **Persisted field order** — document ที่ persisted ต้องวาง **`ou_id`** และ **`branch_id`** **ถัดจาก `_id` ทันทีเสมอ**; canonical order สำหรับต้นเอกสารคือ `_id`, `ou_id`, `branch_id`, แล้วค่อย business fields และ audit fields
- **Replace/update discipline** — ตอน `insertOne` / replacement-style write ต้อง materialize document ตาม canonical order ข้างต้น; partial update ห้ามย้าย `ou_id` / `branch_id` ไปท้าย document หรือสร้างใหม่ในตำแหน่งอื่น
- **Hidden from response** — strip ก่อน return envelope เหมือน audit fields
- **Client ห้ามส่ง** `ou_id` / `branch_id` ใน body/query; ผ่าน header เท่านั้น
- **Trust boundary** — service ห้ามเชื่อ `x-user-ou` / `x-user-branch` ที่ client forge ได้; ต้องผ่าน gateway secret validation ก่อน แล้วค่อยอ่าน `x-user-*`

**Deviation:** service ที่ global (ไม่มี tenant concept เช่น public lookup) ต้อง **ADR** + มี access control layer อื่น (role-based) แทน; ประกาศใน `openapi.yaml#info.description`

---

## 3. Concurrency Control

### 3.1 Optimistic concurrency (ETag + `If-Match`) [Required on update/delete]

Audit fields hidden → `upd_date` ไม่ expose → ใช้ **ETag** เป็น opaque version token (RFC 9110 §8.8.1, §13.1.1)

#### ETag generation

| Aspect | Rule |
| :--- | :--- |
| **Shape** | **`W/"<base64url(upd_date.toISOString())>"`** — weak ETag (semantic equivalence) |
| **Derive from** | `upd_date` เท่านั้น (ไม่ใช่ hash ทั้ง document — กัน CPU cost + internal-state leak) |
| **Emit on** | response ทุก **single-resource** op: `GET /:id`, `POST /` (create, 201), `PATCH /:id`, `PUT /:id` (ถ้าใช้) |
| **List responses** | **ไม่ emit** `ETag` ระดับ envelope; per-item version = client ต้อง `GET /:id` ซ้ำถ้าต้องการ token |
| **Opaque contract** | client treat เป็น string เท่านั้น; **ห้าม** parse / decode เพื่อ reconstruct `upd_date` หรือเปรียบเทียบ lexical |

#### `If-Match` enforcement (write endpoints)

| HTTP | `code` | Scenario |
| :--- | :--- | :--- |
| **428** | **`PRECONDITION_REQUIRED`** | `PATCH` / `PUT` / `DELETE` บน resource ที่มี audit fields แต่ client **ไม่ส่ง** `If-Match` |
| **412** | **`VERSION_CONFLICT`** | ส่ง `If-Match` แต่ค่าไม่ตรงกับ ETag ปัจจุบัน (resource ถูก update โดย actor อื่นระหว่าง GET → write) |

- **Scope** — บังคับเฉพาะ `PATCH` / `PUT` / `DELETE` บน resource ที่มี audit fields; `POST` create **ไม่ต้อง** `If-Match` (ยังไม่มี resource)
- **404 มาก่อน 412** — ถ้า id + `ou_id` + `branch_id` ไม่ match → **404 domain code** (เช่น `USER_NOT_FOUND`); **412** ใช้เฉพาะกรณี id พบแต่ token mismatch เพื่อไม่ leak existence ของ resource ข้าม tenant
- **Implementation pattern** — repository update filter รวม `{ _id, ou_id, branch_id, upd_date: <decoded If-Match> }`; ถ้า `matchedCount === 0` → re-query ด้วย `{ _id, ou_id, branch_id }` เปล่าเพื่อแยกเหตุ: พบ → **412** `VERSION_CONFLICT`, ไม่พบ → **404** domain code
- **Spec declaration** — operation ที่บังคับ `If-Match` **ต้อง** declare parameter + response 412 / 428 ใน `openapi.yaml`

### 3.2 Example flow

```http
GET /api/v1/users/usr_001
→ 200 OK
  ETag: W/"MjAyNi0wNC0xN1QwMzozMTo1MS4wMDBa"
  { "success": true, "code": "SUCCESS", "data": { "id": "usr_001", "name": "Alice" } }

PATCH /api/v1/users/usr_001
  If-Match: W/"MjAyNi0wNC0xN1QwMzozMTo1MS4wMDBa"
  Content-Type: application/merge-patch+json
  { "name": "Alice V2" }
→ 200 OK
  ETag: W/"MjAyNi0wNC0xN1QwMzozMjowMC4wMDBa"      (refreshed)
  { "success": true, "code": "SUCCESS", "data": { "id": "usr_001", "name": "Alice V2" } }
```

**Conflict example (412)**

```json
{
  "success": false,
  "code": "VERSION_CONFLICT",
  "message": "Resource was modified by another request. Refresh and retry.",
  "data": null,
  "requestId": "3b5d9c7e-1a4f-4c2e-9f8a-12ab34cd56ef"
}
```

**Missing precondition (428)**

```json
{
  "success": false,
  "code": "PRECONDITION_REQUIRED",
  "message": "If-Match header is required for this operation.",
  "data": null,
  "requestId": "3b5d9c7e-1a4f-4c2e-9f8a-12ab34cd56ef"
}
```

---

## 4. Forbidden Practices

- expose `cr_*` / `upd_*` / `ou_id` / `branch_id` ใน response envelope (รวม list / detail / error payload)
- รับ audit fields หรือ `upd_date` ใน request body (Joi ต้อง reject `UNKNOWN_FIELD`)
- เชื่อ `ou_id` / `branch_id` จาก query หรือ body (header เท่านั้น, หลัง `x-gateway-secret` validation)
- query MongoDB โดยไม่ filter `ou_id` + `branch_id` (cross-tenant leak)
- persist document ใหม่หรือ replacement document โดยวาง `ou_id` / `branch_id` หลัง business fields แทนที่จะอยู่ถัดจาก `_id`
- generate ETag จาก hash ทั้ง document (CPU + internal-state leak) — ต้อง derive จาก `upd_date` เท่านั้น
- ใช้ **strong ETag** (`"..."` ไม่มี `W/`) — std.min ใช้ weak เสมอ (internal semantic equivalence)
- ใช้ `If-Unmodified-Since` (HTTP date precision วินาที — ไม่พอสำหรับ millisecond-granular update)
- skip 404-vs-412 disambiguation (ต้อง re-query เพื่อไม่ leak existence)
