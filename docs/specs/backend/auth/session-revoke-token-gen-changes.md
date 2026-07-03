# auth — session revoke + access token generation (implementation checklist)

## Metadata

| Field                | Value                                      |
| :------------------- | :----------------------------------------- |
| **Filename**         | `docs/session-revoke-token-gen-changes.md` |
| **Document index**   | [auth-spec.md](./auth-spec.md) · [backend/auth/README.md](../../../../backend/auth/README.md) |
| **Status**           | Active — Implementation checklist (all items **implemented**)          |
| **Parent doc**       | [technical-architecture.md](./technical-architecture.md)     |
| **Document version** | `1.0.1`                                    |

> **สถานะ (2026-07-03):** O-16 + **Redis `SET user:{sub}:token_gen`** **implemented** (auth v0.1.4+) — normative ที่ [technical-architecture.md](./technical-architecture.md) และ [openapi.yaml](../../../../backend/auth/openapi.yaml). **Gateway** `token_gen` verify (**implemented**) — [`gateway` doc](../../../../backend/gateway/docs/session-revoke-token-gen-changes.md). **Staff** archive → revoke (**implemented**) — [`staff-spec.md`](../staff/staff-spec.md).

เอกสารนี้เก็บ **checklist รายการ implement** (อ้างอิง PR / review) สำหรับ:

1. **Internal revoke-by-user** — ตัดทุก **refresh session** ของ `user_id` โดยไม่ต้องมี refresh token ในมือ (ให้ service ที่ trusted เรียก เช่น **staff**)
2. **ตัดสิทธิ์ access JWT แบบทันที** — ใช้ **credential / token generation version** (`access_token_gen` ใน DB + claim ใน access JWT เช่น `token_gen`) และให้ **gateway** ตรวจเทียบค่าปัจจุบัน (ดู [`gateway` session-revoke doc](../../../../backend/gateway/docs/session-revoke-token-gen-changes.md))

คู่มือ SoT หลักของ auth คือ [technical-architecture.md](./technical-architecture.md) และ [openapi.yaml](../../../../backend/auth/openapi.yaml) — registry error อยู่ที่ [`coding-standard/auth/codes.yaml`](../../../../../../coding-standard/auth/codes.yaml)

---

## 1. ข้อมูล (`auth_users`)

| งาน        | รายละเอียด                                                                                              |
| :--------- | :------------------------------------------------------------------------------------------------------ |
| เพิ่มฟิลด์ | **`access_token_gen`** — integer, monotonic (เช่นเริ่ม **0** หรือ **1** — ล็อกค่า default ใน migration) |
| SoT เอกสาร | อัปเดต [database-erd.md](./database-erd.md) (ตาราง `auth_users`, diagram ถ้ามี)                              |
| Migration  | backfill ผู้ใช้เดิมให้มีฟิลด์ + default; script/init pipeline ตามทีม                                    |

---

## 2. การออก access JWT (login + refresh)

| งาน           | รายละเอียด                                                                            |
| :------------ | :------------------------------------------------------------------------------------ |
| อ่านค่าจาก DB | หลังพบ user สำหรับ login / หลัง refresh สำเร็จ — อ่าน **`access_token_gen`** ปัจจุบัน |
| Claim ใน JWT  | ใส่ claim ที่ตกลงกับ gateway (เช่น **`token_gen`**) ให้ตรงกับค่าใน DB ณ เวลา mint     |
| จุดแก้โค้ด    | ชั้น sign access JWT (เช่น `lib/jwt-access.js`, `auth.service.js`)                    |

---

## 3. Internal API — `POST /internal/users/{user_id}/sessions/revoke`

| งาน            | รายละเอียด                                                                                                                                                                                             |
| :------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Path / method  | `POST` ใต้ **`/internal/*`** (สอดคล้อง O-15 — ห้าม public โดยไม่มี network/auth แยก)                                                                                                                   |
| Auth caller    | ตรวจ **`AUTH_INTERNAL_SERVICE_SECRET`** — **`Authorization: Bearer <secret>`** — **constant-time**; **แยกจาก** `GATEWAY_SHARED_SECRET`; ผิด → **401**                                                  |
| Request body   | Optional: **`reason`** (เช่น `staff.profile_archive`), **`correlation_id`** — สำหรับ audit + idempotent retry จาก staff                                                                                |
| Idempotency    | เรียกซ้ำด้วย `user_id` เดิม → **200** + `revoked_refresh_tokens` (อาจเป็น 0) — staff ใช้ retry หลัง archive ล้ม                                                                                        |
| Validate       | `user_id` เป็น **ObjectId** 24-hex — ไม่ valid → **400**                                                                                                                                               |
| Persistence    | (แนะนำ) **transaction** หรือลำดับเขียนที่กำหนด: (1) **`$inc` `access_token_gen`** บน `auth_users` (2) **`updateMany`** `auth_refresh_tokens` ที่ `user_id` + `revoked_at: null` → set **`revoked_at`** |
| Response       | **200** + JSON เล็ก เช่น **`revoked_refresh_tokens`**, **`access_token_gen`** (หลัง bump) — รองรับ idempotent retry                                                                                    |
| Redis (D1)     | เมื่อตั้ง **`REDIS_URL`** — หลัง revoke สำเร็จ auth **`SET`** `user:{sub}:token_gen` = string ของ `access_token_gen` (ดู `src/lib/redis-access-token-gen.js`)                                          |
| Rate limit     | แยกจาก `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` — ระบุใน OpenAPI                                                                                                                  |
| Hook / headers | ตัดสินใจว่า internal route ยกเว้น duplicate-header guard ของ edge หรือไม่ — ต้องไม่ลดความปลอดภัยแบบเงียบๆ                                                                                              |
| Audit          | `auth_audit_events` เช่น `auth.sessions_revoked_by_service` + `detail_safe.reason`                                                                                                                     |

---

## 4. Config / env

| งาน             | รายละเอียด                                                                                                                                                                                   |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Env             | **`AUTH_INTERNAL_SERVICE_SECRET`** (required เมื่อเปิด internal route)                                                                                                                       |
| Joi / `loadEnv` | อัปเดต [`src/config/env.js`](../../../../backend/auth/src/config/env.js)                                                                                                                                           |
| ตัวอย่าง        | `.env.example` + runbook deploy                                                                                                                                                              |
| Redis (D1)      | **`REDIS_URL`** optional — เมื่อตั้งแล้ว auth ใช้ client `redis` เชื่อมต่อ startup; หลัง internal revoke สำเร็จ **`SET`** key `user:{sub}:token_gen`; **`GET /readyz`** รวม **`PING`** Redis |

---

## 5. Repository & tests

| งาน              | รายละเอียด                                                                                                            |
| :--------------- | :-------------------------------------------------------------------------------------------------------------------- |
| `AuthRepository` | method อ่าน/อัปเดต `access_token_gen`; method revoke refresh ตาม `user_id`; รองรับ `ClientSession` ถ้าใช้ transaction |
| Tests            | secret ผิด → 401; bump + revoke ครบ; idempotent; JWT หลัง login/refresh มี claim ตรง DB                               |

---

## 6. Contract

| งาน            | รายละเอียด                                                            |
| :------------- | :-------------------------------------------------------------------- |
| `openapi.yaml` | path internal, security scheme, responses, `x-ratelimit`              |
| `codes.yaml`   | เพิ่ม `code` เช่น **`AUTH_INTERNAL_UNAUTHORIZED`** (และอื่นที่จำเป็น) |
| `Problem` enum | sync กับ OpenAPI                                                      |

---

## 7. บริการที่เรียกใช้ (ไม่ใช่โค้ดในแพ็กเกจ auth)

| Caller    | พฤติกรรมที่คาดหวัง                                                                                                                                                                             |
| :-------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **staff** | หลัง **archive profile สำเร็จ** (Mongo) → เรียก internal revoke — **archive ก่อน revoke**; retry idempotent + `correlation_id`; env: `AUTH_INTERNAL_BASE_URL` + `AUTH_INTERNAL_SERVICE_SECRET` |

---

## Last updated

2026-07-03 — Re-audit round 3: gateway + staff caller marked implemented; link fixes
2026-05-21 — เอกสารเป็น implementation checklist (auth O-16/D1 done); ไม่ใช่ backlog งานใหม่
