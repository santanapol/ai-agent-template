# auth — Database Design (ERD & Schema)

## Metadata

| Field | Value |
| :--- | :--- |
| **Filename** | `docs/db/erd.md` |
| **Document index** | [README.md](../../README.md) |
| **Status** | Active — Persistence SoT ของ `auth` |
| **Parent doc** | [`architecture.md`](../architecture.md) |
| **Package version** | `0.1.6` |
| **Document version** | `1.0.1` |

| Layer | Document |
| :--- | :--- |
| HTTP contract | [`openapi.yaml`](../../openapi.yaml) |
| Business | [`domain.md`](../domain.md) |
| Service design | [`architecture.md`](../architecture.md) |
| Org MongoDB std | [`mongodb.md`](../../../../../_coding-standards/backend/mongodb.md) |
| Org tenant audit | [`tenant-audit.md`](../../../../../_coding-standards/backend/tenant-audit.md) |

**Scope:** MongoDB persistence สำหรับ login, refresh, throttle, audit — สร้าง index ผ่าน **`npm run init:db`** ([`scripts/init-db.mjs`](../../scripts/init-db.mjs))

## Contents

1. [MongoDB database design (normative)](#1-mongodb-database-design-normative)
2. [Collections](#2-collections)
3. [ER diagram](#3-er-diagram)
4. [Index bootstrap — ตัวอย่าง `mongosh`](#4-index-bootstrap--ตัวอย่าง-mongosh)

## 1. MongoDB database design (normative)

**ชื่อ database:** กำหนดผ่าน `DATABASE_URI` (เช่น `auth_login` — ชื่อจริงขึ้นกับ env)

**ชื่อ collection:** ใช้ prefix **`auth_*`** (`auth_users`, `auth_refresh_tokens`, `auth_credential_throttle`, `auth_audit_events`) — ค่าจริงอยู่ที่ [`mongo-collections.js`](../../src/config/mongo-collections.js)

**หลักการทั่วไป**

- เก็บค่าเวลาเป็น **`Date` (UTC)** ใน MongoDB
- **ห้าม** เก็บ refresh token แบบ plaintext — เก็บเฉพาะ **`token_hash`** (แนะนำ **SHA-256** ของ opaque token ที่ส่งให้ client)
- **Username:** application **ต้อง** normalize ก่อน persist/query (`trim` + **lowercase**) แล้วเก็บใน **`username`** — **Globally Unique** (ไม่ scope ตาม `ou_id` / `branch_id`)
- **ควร** ใช้ **MongoDB transaction** (หรือ pattern atomic เทียบเท่า) สำหรับ **refresh rotation**
- **Tenant + Audit** — `auth_users` **ต้อง** มี `ou_id`, `branch_id` และ audit fields ตาม [`tenant-audit.md`](../../../../../_coding-standards/backend/tenant-audit.md); สร้าง/แก้ผ่าน Admin UI หลัง login ผ่าน `gateway` (headers `x-user-id`, `x-user-ou`, `x-user-branch`)
- **`access_token_gen`:** SoT ใน MongoDB; เมื่อตั้ง **`REDIS_URL`** (production) หลัง internal revoke ต้อง **`SET`** `user:{sub}:token_gen` ให้สอดคล้อง DB — Gateway อาจอ่านจาก Redis (ดู [`architecture.md`](../architecture.md) §9)
- **Deviation — Operational collections:** `auth_refresh_tokens`, `auth_credential_throttle`, `auth_audit_events` **ยกเว้น** `ou_id` / `branch_id` / `cr_*` / `upd_*` — ถ้าเพิ่มในอนาคต **ต้อง** ADR

## 2. Collections

### 2.1 Collection `auth_users`

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | primary key |
| `ou_id` | ObjectId | Yes | tenant OU — [`tenant-audit.md`](../../../../../_coding-standards/backend/tenant-audit.md) |
| `branch_id` | ObjectId | Yes | tenant branch |
| `username` | string | Yes | หลัง normalize — login; **Globally Unique** |
| `password_hash` | string | Yes | **Argon2id** encoded — **ห้าม** plaintext |
| `role` | string | Yes | map ไป JWT role claim (`JWT_CLAIM_ROLE` บน Gateway) |
| `access_token_gen` | int | Yes | Monotonic counter → JWT **`token_gen`**; default **`0`**; **`$inc`** เมื่อ internal revoke (O-16) |
| `cr_by` | string | Yes | `x-user-id` — insert only |
| `cr_date` | Date | Yes | UTC — insert only |
| `cr_prog` | string | Yes | route template — insert only |
| `upd_by` | string | Yes | refresh ทุก update |
| `upd_date` | Date | Yes | UTC; basis for ETag |
| `upd_prog` | string | Yes | route template |

**Index (ต้องสร้าง)**

| Index | Spec | Purpose |
| :--- | :--- | :--- |
| `uniq_username` | `{ "username": 1 }` **unique** | login + global uniqueness |
| `by_ou_branch` | `{ "ou_id": 1, "branch_id": 1 }` | tenant-scoped admin queries |

### 2.2 Collection `auth_refresh_tokens`

หนึ่งแถว = opaque refresh หนึ่งชิ้น (หลัง hash) ภายใต้ `family_id` เดียวกัน

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | primary key |
| `user_id` | ObjectId | Yes | FK → `auth_users._id` |
| `family_id` | ObjectId | Yes | rotation group — revoke ทั้งกลุ่ม (O-03, O-13) |
| `token_hash` | string | Yes | SHA-256(hex/base64 ตาม implement) ของ token ที่ออกให้ client |
| `expires_at` | Date | Yes | `REFRESH_TOKEN_TTL_SECONDS` |
| `revoked_at` | Date | Optional | `null` = active; ตั้งเมื่อ rotate / logout / reuse |
| `replaced_by_id` | ObjectId | Optional | FK → `auth_refresh_tokens._id` หลัง rotation |
| `created_at` | Date | Yes | สร้างแถว |

**Index (ต้องสร้าง)**

| Index | Spec | Purpose |
| :--- | :--- | :--- |
| `uniq_token_hash` | `{ "token_hash": 1 }` **unique** | lookup ตอน refresh |
| `by_user_revoked_exp` | `{ "user_id": 1, "revoked_at": 1, "expires_at": 1 }` | revoke ตาม user / cleanup |
| `by_family` | `{ "family_id": 1 }` | revoke family |
| `ttl_expires_at` | `{ "expires_at": 1 }`, **`expireAfterSeconds`: 0** | TTL หลัง `expires_at` (reuse detection จนหมดอายุ) |

### 2.3 Collection `auth_credential_throttle`

หนึ่งเอกสารต่อ `throttle_key` — นับ login/refresh ผิดแยก **user** และ **IP**

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | primary key |
| `throttle_key` | string | Yes | **`user:<auth_users._id hex>`** หรือ **`ip:<normalized_ip>`** |
| `window_started_at` | Date | Yes | จุดเริ่ม rolling window 15 นาที |
| `fail_count` | int | Yes | จำนวนครั้งผิดใน window |
| `locked_until` | Date | Optional | lock จนถึงเวลานี้ (O-12) |

**Index (ต้องสร้าง)**

| Index | Spec | Purpose |
| :--- | :--- | :--- |
| `uniq_throttle_key` | `{ "throttle_key": 1 }` **unique** | upsert ต่อ key |

### 2.4 Collection `auth_audit_events`

**Implementation ปัจจุบัน:** service persist ลง MongoDB ผ่าน `AuthRepository.insertAudit` (พร้อม `retention_until` = `ts` + 180 วัน) — index ด้านล่าง **ต้อง** มีใน env ที่เปิด audit ใน DB; ทีมอาจ mirror ไป log stack (Loki ฯลฯ) เพิ่มได้โดยไม่แทน schema นี้

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | primary key |
| `event_type` | string | Yes | เช่น `auth.login`, `auth.refresh`, `auth.logout`, `auth.sessions_revoked_by_service` (O-16) |
| `ts` | Date | Yes | เวลาเหตุการณ์ (UTC) |
| `outcome` | string | Yes | `success` \| `fail` |
| `request_id` | string | Yes | correlation id |
| `user_id` | ObjectId | Optional | เมื่อรู้ตัวตนแล้ว |
| `ip_digest` | string | Optional | one-way digest (ไม่เก็บ IP เต็ม) |
| `detail_safe` | object | Optional | **ห้าม** password / token |
| `retention_until` | Date | Yes | TTL (O-14) |

**Index (ต้องสร้าง)**

| Index | Spec | Purpose |
| :--- | :--- | :--- |
| `by_request_id` | `{ "request_id": 1 }` | correlation lookup |
| `ttl_retention_until` | `{ "retention_until": 1 }`, **`expireAfterSeconds`: 0** | auto-delete หลัง retention |

## 3. ER diagram

Logical entities (ชื่อใน diagram ≠ ชื่อ collection ทุกตัว):

```mermaid
erDiagram
  auth_users ||--o{ auth_refresh_tokens : user_id
  auth_users ||--o{ auth_audit_events : user_id
  auth_users {
    ObjectId _id PK
    ObjectId ou_id
    ObjectId branch_id
    string username
    string role
    int access_token_gen
  }
  auth_refresh_tokens {
    ObjectId _id PK
    ObjectId user_id FK
    ObjectId family_id
    string token_hash
    date expires_at
    date revoked_at
  }
  auth_credential_throttle {
    string throttle_key PK
    date window_started_at
    int fail_count
    date locked_until
  }
  auth_audit_events {
    ObjectId _id PK
    string event_type
    date ts
    string outcome
    string request_id
  }
```

`auth_credential_throttle` ไม่ FK ไป `auth_users` — ผูกผ่าน `throttle_key` แบบ string

## 4. Index bootstrap — ตัวอย่าง `mongosh`

**ข้อจำกัด:** สคริปต์อ้างอิง — แก้ชื่อ database ให้ตรง `DATABASE_URI`; index ชื่อเดิมแต่ key ต่าง → **`dropIndex`** ก่อนสร้างใหม่

**แนะนำ:** รัน **`npm run init:db`** แทน copy-paste ด้วยมือ (สร้าง index + seed admin)

**Placeholder:** database **`auth_login`**

```javascript
// mongosh — สร้าง indexes ตาม section 2 (เทียบ init-db.mjs)
use auth_login;

db.auth_users.createIndex(
  { username: 1 },
  { unique: true, name: "uniq_username" }
);

db.auth_users.createIndex(
  { ou_id: 1, branch_id: 1 },
  { name: "by_ou_branch" }
);

db.auth_refresh_tokens.createIndex(
  { token_hash: 1 },
  { unique: true, name: "uniq_token_hash" }
);

db.auth_refresh_tokens.createIndex(
  { user_id: 1, revoked_at: 1, expires_at: 1 },
  { name: "by_user_revoked_exp" }
);

db.auth_refresh_tokens.createIndex(
  { family_id: 1 },
  { name: "by_family" }
);

db.auth_refresh_tokens.createIndex(
  { expires_at: 1 },
  { name: "ttl_expires_at", expireAfterSeconds: 0 }
);

db.auth_credential_throttle.createIndex(
  { throttle_key: 1 },
  { unique: true, name: "uniq_throttle_key" }
);

db.auth_audit_events.createIndex(
  { request_id: 1 },
  { name: "by_request_id" }
);

db.auth_audit_events.createIndex(
  { retention_until: 1 },
  { name: "ttl_retention_until", expireAfterSeconds: 0 }
);
```
