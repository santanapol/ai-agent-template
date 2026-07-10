# staff — MongoDB ERD & persistence notes

> **Package status:** **implemented** — ดู [staff-spec.md](./staff-spec.md) เป็น entry point

**SoT ฝั่ง persistence** สำหรับ **`staff_profiles`** — ความหมายธุรกิจและ HTTP อยู่ [`./business-domain.md`](./business-domain.md)

| ชั้น SoT                  | เอกสาร                                                       |
| :------------------------ | :----------------------------------------------------------- |
| **Business**              | [`./business-domain.md`](./business-domain.md)               |
| **Technical**             | [`./technical-architecture.md`](./technical-architecture.md) |
| **Persistence (ไฟล์นี้)** | ERD, constraints, indexes, search                            |

สอดคล้อง [`11-database-connection.md`](../../../../coding-standard/backend/11-database-connection.md), [`12-data-management.md`](../../../../coding-standard/backend/12-data-management.md)

> **Database:** ร่วมกับ auth ได้ — prefix `auth_*` ตาม [`../../../auth/src/config/mongo-collections.js`](../../../../backend/auth/src/config/mongo-collections.js)

## Data ownership

```mermaid
flowchart LR
  subgraph staff_writes [staff writes]
    P[(staff_profiles)]
  end
  subgraph auth_writes [auth writes]
    U[(auth_users)]
    R[(auth_refresh_tokens)]
  end
  P -->|user_id FK| U
  staff_svc[staff service] --> P
  staff_svc -.->|read only| U
  auth_svc[auth service] --> U
  auth_svc --> R
```

## ER diagram (logical)

```mermaid
erDiagram
  AUTH_USERS ||--o| AUTH_STAFF_PROFILES : "user_id -> _id"
  AUTH_USERS {
    objectId _id PK
    objectId ou_id
    objectId branch_id
    string username
    string password_hash
    string role
    string cr_by
    date cr_date
    string cr_prog
    string upd_by
    date upd_date
    string upd_prog
  }
  AUTH_STAFF_PROFILES {
    objectId _id PK
    objectId user_id UK
    objectId ou_id
    objectId branch_id
    string status
    string code
    string firstname
    string lastname
    string email
    string tel
    string cr_by
    date cr_date
    string cr_prog
    string upd_by
    date upd_date
    string upd_prog
  }
```

## Collection: `staff_profiles`

### Field definitions

| Field           | BSON        | Required | Constraints (MVP)                                                                          |
| :-------------- | :---------- | :------: | :----------------------------------------------------------------------------------------- |
| `_id`           | ObjectId    |   yes    | PK                                                                                         |
| `user_id`       | ObjectId    |   yes    | FK → `auth_users._id`; **unique**                                                          |
| `ou_id`         | ObjectId    |   yes    | immutable; ตรง user + tenant                                                               |
| `branch_id`     | ObjectId    |   yes    | immutable                                                                                  |
| `status`        | string      |   yes    | `active` \| `archived`                                                                     |
| `code`          | string      |   yes    | 1–32 chars; **unique** with `ou_id`+`branch_id`                                            |
| `firstname`     | string      |   yes    | 1–128                                                                                      |
| `lastname`      | string      |   yes    | 1–128                                                                                      |
| `email`         | string      |   no     | optional; max 254; lowercase; **not unique** in MVP                                        |
| `tel`           | string      |   no     | optional; E.164, max 16                                                                    |
| `cr_*`, `upd_*` | string/date |   yes    | [`12-data-management.md`](../../../../coding-standard/backend/12-data-management.md) |

**Out of scope:** `display_name`, `job_title`, `department`, `employment_status`

**API response:** ห้าม expose `cr_*`, `upd_*` ดิบ

### Uniqueness & validation

| Rule                      | Enforcement                                |
| :------------------------ | :----------------------------------------- |
| 1 user → 1 profile        | index `uniq_user_id`                       |
| 1 code ต่อ OU+สาขา        | index `uniq_ou_branch_code`                |
| Duplicate `email` / `tel` | **อนุญาต** ใน MVP                          |
| `status` enum             | แนะนำ MongoDB `$jsonSchema` + OpenAPI enum |

### Join `auth_users`

- `$lookup` บน DB เดียวกัน — projection เฉพาะ `username`, `role` สำหรับ list/read
- staff service account ต้อง **read** `auth_users`

### Cross-service: archive / restore

| Operation | Mongo                            | auth                                                                               |
| :-------- | :------------------------------- | :--------------------------------------------------------------------------------- |
| Archive   | `$set status: archived`, `upd_*` | revoke หลัง persist — [`./technical-architecture.md`](./technical-architecture.md) |
| Restore   | `$set status: active`, `upd_*`   | ไม่เรียก auth                                                                      |

### Optimistic concurrency

- **`upd_date`** → ETag `W/"<base64url(iso)>"`
- **`If-Match`** บน `PATCH`, `POST .../archive`, `POST .../restore`

## Indexes

| Name                    | Keys                                                  | Type       | Purpose                                   |
| :---------------------- | :---------------------------------------------------- | :--------- | :---------------------------------------- |
| `uniq_user_id`          | `{ user_id: 1 }`                                      | unique     | 1:1 user; lookup `GET /profiles?user_id=` |
| `uniq_ou_branch_code`   | `{ ou_id: 1, branch_id: 1, code: 1 }`                 | unique     | business key                              |
| `list_by_branch_status` | `{ ou_id: 1, branch_id: 1, status: 1, upd_date: -1 }` | non-unique | list ต่อสาขา + filter status              |
| `list_archived_by_ou`   | `{ ou_id: 1, status: 1, upd_date: -1 }`               | non-unique | archived list (platform_admin ข้ามสาขา)   |

### Search (`q` parameter)

MVP แนะนำ **case-insensitive regex** บนฟิลด์ที่มี index รองรับ list ก่อน แล้ว filter ใน application หรือ:

- **`code`:** ใช้ index `uniq_ou_branch_code` prefix ถ้า `q` สั้นและตรงรูปแบบรหัส
- **`firstname` / `lastname`:** compound index ถ้าโหลด list สูง — **optional** `{ ou_id: 1, branch_id: 1, lastname: 1, firstname: 1 }` เมื่อมีปัญหา performance
- **`username`:** ค้นหาหลัง `$lookup` หรือ pre-query `auth_users` ด้วย regex แล้วจำกัด `user_id` `$in` — ระวัง performance

**ไม่บังคับ** Atlas Search ใน MVP

### Schema validation (`$jsonSchema`)

`validationLevel: "moderate"` — SoT: [`collection-validators.mjs`](../../../../backend/service/staff/scripts/collection-validators.mjs). Applied by [`init-db.mjs`](../../../../backend/service/staff/scripts/init-db.mjs). Policy: [ADR 005](../../../adrs/005-mongodb-collection-validators-policy.md).

**Required:** `user_id`, `ou_id`, `branch_id`, `status`, `code`, `firstname`, `lastname`, audit (`cr_*`, `upd_*`).  
**Optional:** `email`, `tel`  
**Properties:** `status` enum `active` \| `archived`; string length bounds on `code`, `firstname`, `lastname`, `email`, `tel`.

## Collection: `auth_users` (auth-owned)

- Read/join only — [`../../../auth/src/modules/auth/auth.repository.js`](../../../../backend/auth/src/modules/auth/auth.repository.js)
- ห้าม staff แก้ `password_hash` / `role`

## Audit

- `auth_audit_events` — `staff.profile_*` ตาม [`./business-domain.md` §10](./business-domain.md#10-audit-business-events)

## Connection

- Singleton client / pool — [`11-database-connection.md`](../../../../coding-standard/backend/11-database-connection.md)

## Related documents

- [`staff-spec.md`](./staff-spec.md) — central spec
- [`./business-domain.md`](./business-domain.md)
- [`./technical-architecture.md`](./technical-architecture.md)

Indexes และ schema: [`../../../../backend/service/staff/scripts/init-db.mjs`](../../../../backend/service/staff/scripts/init-db.mjs)

## Last updated

2026-07-02 — Implemented status; central spec backlink; `init-db.mjs` reference
2026-05-28 — อ้างอิง lookup `GET /profiles?user_id=` ที่ index `uniq_user_id`
2026-05-21 — แยก persistence notes จาก business domain
