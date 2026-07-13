# Database Design Document

## Smart Report Service

**Project:** Smart Report Service
**Database:** MongoDB
**Node.js:** 24 (ESM)
**Frontend:** React 19 + Vite + Ant Design
**Date:** 2026-06-11

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Collections Schema](#collections-schema)
3. [Database Indexes](#database-indexes)
4. [Entity Relationships](#entity-relationships)
5. [Data Examples](#data-examples)
6. [Design Decisions](#design-decisions)
7. [Constraints & Validations](#constraints--validations)

---

## System Overview

ระบบ **Smart Report** — ให้ staff สร้าง/จัดการรายงานที่ขับเคลื่อนด้วย MongoDB query script (สไตล์ mongo shell), รันแบบ manual หรือตั้งเวลาอัตโนมัติ (daily/weekly/monthly) แล้ว export ผลลัพธ์เป็น CSV/Excel เก็บไว้ใน local storage เพื่อดาวน์โหลด

**Scope ปัจจุบัน (collections ในเอกสารนี้):**

- ✅ จัดการ report definitions แบบ CRUD (`reports`) — script, output format, params, schedule
- ✅ รันสคริปต์รายงานผ่าน read-only MongoDB connection ภายใน VM sandbox
- ✅ Export ผลลัพธ์เป็น CSV/Excel ไปยัง local storage
- ✅ บันทึกประวัติการรันทุกครั้ง ทั้งสำเร็จและล้มเหลว (`download_history`)
- ✅ Scheduler อัตโนมัติ รวมเคส "วันสุดท้ายของเดือน" (`dayOfMonth: 'last'`)
- ✅ Audit fields (`cr_*` / `upd_*`) + optimistic locking (`upd_date` → ETag)

**ไม่อยู่ในขอบเขต / Accepted risk (ดู [Design Decisions](#design-decisions)):**

- ❌ Tenant scoping (`ou_id` / `branch_id`) บน `reports` และ `download_history`
- ❌ Role-based authorization แยกสิทธิ์ต่อ endpoint

---

## Collections Schema

### 1️⃣ Collection: `reports`

**ความหมาย:** Report definition — สคริปต์ query, output format, ค่าพารามิเตอร์เริ่มต้น และ schedule config

```javascript
{
  _id: ObjectId,
  name: String,                  // ชื่อรายงาน [Unique]
  description: String,           // รายละเอียด (nullable)
  script: String,                // MongoDB shell-style query script
  params: Object,                // ค่าพารามิเตอร์เริ่มต้น เช่น timezoneOffsetMinutes
  outputFormat: String,          // Enum: 'csv' | 'excel'
  schedule: Object,              // cron schedule config (nullable = manual only)
  enabled: Boolean,               // [Index] เปิด/ปิดการตั้งเวลา
  cr_by: String,
  cr_date: Date,
  cr_prog: String,
  upd_by: String,
  upd_date: Date,
  upd_prog: String
}
```

**Field Descriptions:**

- `name` — ชื่อรายงาน; **unique ทั้งระบบ** (`IDX_REPORTS_NAME_UNIQUE`)
- `script` — สคริปต์สไตล์ mongo shell (`db.getSiblingDB(<dbName>).<collection>.find/aggregate(...)`) รันผ่าน read-only connection (`MONGODB_URI_READ`) ภายใน Node `vm` sandbox เท่านั้น
- `params` — object อิสระ (key-value ใดก็ได้); ทุกค่าถูก inject เข้าสคริปต์โดยตรงผ่าน `params.*` (ไม่ใช่ template `{{...}}`) ทุกครั้งที่รัน ระบบจะเติม `params.startDate`/`params.endDate` (ช่วง "เมื่อวาน") ให้อัตโนมัติ; `params.timezoneOffsetMinutes` (นาทีจาก UTC) ใช้คำนวณช่วงเวลานี้
- `outputFormat` — รูปแบบไฟล์ export (`csv` | `excel`)
- `schedule` — `null` = manual เท่านั้น; รูปแบบ `{ frequency: 'daily'|'weekly'|'monthly', hour, minute, dayOfWeek, dayOfMonth: 1-31 | 'last', timezone }`
- `enabled` — `false` หรือ `schedule = null` จะไม่ถูกลงทะเบียนใน scheduler
- `cr_*` / `upd_*` — Audit และ optimistic locking (`upd_date` → weak ETag, ตรวจผ่าน `If-Match` บน `PUT`/`DELETE`)

---

### 2️⃣ Collection: `download_history`

**ความหมาย:** ประวัติการรันรายงานแต่ละครั้ง (manual หรือ scheduler) ทั้งสำเร็จและล้มเหลว

```javascript
{
  _id: ObjectId,
  reportId: ObjectId,            // อ้างอิง reports._id [FK, Index]
  reportName: String,            // ชื่อรายงาน ณ เวลารัน (denormalized)
  fileName: String,              // ชื่อไฟล์ที่ export (nullable เมื่อ failed)
  filePath: String,              // path ไฟล์ใน local storage (nullable เมื่อ failed)
  format: String,                // Enum: 'csv' | 'excel'
  status: String,                // Enum: 'running' | 'success' | 'failed'
  recordCount: Number,           // จำนวนแถวผลลัพธ์ (nullable เมื่อ failed)
  error: String,                 // ข้อความ error (nullable เมื่อสำเร็จ)
  triggeredBy: String,           // Enum: 'manual' | 'scheduler'
  startedAt: Date,                // [Index]
  finishedAt: Date,               // nullable ระหว่างรัน
  cr_by: String,
  cr_date: Date,
  cr_prog: String
}
```

**Field Descriptions:**

- `reportId` — FK → `reports._id` (ไม่มี DB-level constraint; report ต้นทางอาจถูกลบไปแล้ว)
- `reportName`, `format` — denormalized จาก `reports` ณ เวลารัน เพื่อให้ history ยังอ่านได้แม้ report ถูกแก้ชื่อหรือลบไปแล้ว
- `triggeredBy` — `manual` (`POST /:id/run`) หรือ `scheduler` (cron tick)
- `cr_by` — เป็น `"system"` เสมอ (insert โดย `runReport` ใน scheduler service)
- `cr_prog` — `/scheduler` หรือ `/api/v1/smart-reports/:id/run`
- ไม่มี `upd_*` — record เป็น **write-once** (insert อย่างเดียว ไม่มีการแก้ไขภายหลัง)

---

## Database Indexes

### Indexes for `reports`

```javascript
// Unique report name
db.reports.createIndex(
  { name: 1 },
  { unique: true, name: "IDX_REPORTS_NAME_UNIQUE" },
);

// Scheduler bootstrap filter (enabled reports)
db.reports.createIndex(
  { enabled: 1 },
  { name: "IDX_REPORTS_ENABLED" },
);

// List filter: GET ?schedule=daily|weekly|monthly
db.reports.createIndex(
  { "schedule.frequency": 1 },
  { name: "IDX_REPORTS_SCHEDULE_FREQUENCY" },
);
```

### Indexes for `download_history`

```javascript
// Per-report history, most recent first
db.download_history.createIndex(
  { reportId: 1, startedAt: -1 },
  { name: "IDX_DOWNLOAD_HISTORY_REPORT_LIST" },
);

// Global history list (GET /history), most recent first
db.download_history.createIndex(
  { startedAt: -1 },
  { name: "IDX_DOWNLOAD_HISTORY_RECENT" },
);
```

---

## Entity Relationships

### ER Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│                              REPORTS                               │
├───────────────────────────────────────────────────────────────────┤
│ _id (ObjectId) [PK]                                                │
│ name (String) [Unique]                                             │
│ description (String, nullable)                                     │
│ script (String)                                                    │
│ params (Object)                                                    │
│ outputFormat (String: 'csv' | 'excel')                             │
│ schedule (Object, nullable)                                        │
│ enabled (Boolean) [Index]                                          │
│ cr_by, cr_date, cr_prog, upd_by, upd_date, upd_prog                │
└───────────────────────────────────────────────────────────────────┘
                               │
                               │ 1 : Many
                               │ reportId → reports._id
                               ▼
┌───────────────────────────────────────────────────────────────────┐
│                         DOWNLOAD_HISTORY                           │
├───────────────────────────────────────────────────────────────────┤
│ _id (ObjectId) [PK]                                                │
│ reportId (ObjectId) [FK, Index]                                    │
│ reportName (String, denormalized)                                  │
│ fileName, filePath (String, nullable)                              │
│ format (String: 'csv' | 'excel')                                   │
│ status (String: 'running' | 'success' | 'failed')                  │
│ recordCount (Number, nullable)                                     │
│ error (String, nullable)                                           │
│ triggeredBy (String: 'manual' | 'scheduler')                       │
│ startedAt (Date) [Index]                                           │
│ finishedAt (Date, nullable)                                        │
│ cr_by, cr_date, cr_prog                                            │
└───────────────────────────────────────────────────────────────────┘
```

### Relationship Type

| From      | To                  | Type   | Description                                          |
| --------- | ------------------- | ------ | ----------------------------------------------------- |
| **reports** | **download_history** | 1:Many | report หนึ่งรายการมีประวัติการรันได้หลายครั้ง (manual/scheduler) |

---

## Data Examples

### `reports`

```json
{
  "_id": { "$oid": "665f0a1b2c3d4e5f6a7b8c01" },
  "name": "Daily New Members",
  "description": "รายชื่อสมาชิกใหม่ของเมื่อวาน",
  "script": "db.getSiblingDB('crm').members.find({ cr_date: { $gte: ISODate(params.startDate), $lte: ISODate(params.endDate) } })",
  "params": {
    "timezoneOffsetMinutes": 420
  },
  "outputFormat": "csv",
  "schedule": {
    "frequency": "daily",
    "hour": 7,
    "minute": 0,
    "timezone": "Asia/Bangkok"
  },
  "enabled": true,
  "cr_by": "user-001",
  "cr_date": { "$date": "2026-06-10T03:00:00.000Z" },
  "cr_prog": "/api/v1/smart-reports",
  "upd_by": "user-001",
  "upd_date": { "$date": "2026-06-10T03:00:00.000Z" },
  "upd_prog": "/api/v1/smart-reports"
}
```

### `download_history`

```json
{
  "_id": { "$oid": "665f0a1b2c3d4e5f6a7b8c02" },
  "reportId": { "$oid": "665f0a1b2c3d4e5f6a7b8c01" },
  "reportName": "Daily New Members",
  "fileName": "daily-new-members-2026-06-10t07-00-00-000z.csv",
  "filePath": "/var/data/smart-report/daily-new-members-2026-06-10t07-00-00-000z.csv",
  "format": "csv",
  "status": "success",
  "recordCount": 42,
  "error": null,
  "triggeredBy": "scheduler",
  "startedAt": { "$date": "2026-06-10T07:00:00.000Z" },
  "finishedAt": { "$date": "2026-06-10T07:00:02.500Z" },
  "cr_by": "system",
  "cr_date": { "$date": "2026-06-10T07:00:00.000Z" },
  "cr_prog": "/scheduler"
}
```

---

## Design Decisions

### `params.*` injection แทน template replace

ค่าใน `reports.params` (และค่า `startDate`/`endDate` ที่ระบบคำนวณให้) ถูก inject เข้า sandbox context โดยตรงและเข้าถึงผ่าน `params.*` ในสคริปต์ — ไม่ใช่การแทนที่ string แบบ `{{placeholder}}`

### Read-only connection สำหรับรันสคริปต์เสมอ

`runReportScript` รันผ่าน `MONGODB_URI_READ` (`secondaryPreferred`) ภายใน Node `vm` sandbox เท่านั้น — sandbox ไม่ expose `insert`/`update`/`remove` ให้เรียกใช้ ป้องกันสคริปต์ที่ผู้ใช้เขียนเองแก้ไขข้อมูลโดยไม่ตั้งใจ

### Denormalization บน `download_history`

`reportName` และ `format` ถูก copy มาจาก `reports` ณ เวลารัน เพื่อให้ประวัติการรันยังอ่านได้และถูกต้อง แม้ report ต้นทางจะถูกแก้ไขชื่อหรือลบไปแล้วภายหลัง

### Optimistic locking บน `reports`

`upd_date` ใช้เป็น version สำหรับ weak ETag (`W/"<base64url(iso)>"`) — `PUT`/`DELETE` ต้องส่ง `If-Match` ตรงกับ `upd_date` ปัจจุบัน มิฉะนั้นได้ `412 VERSION_CONFLICT`

### `schedule.dayOfMonth: 'last'`

แทนที่จะคำนวณวันสุดท้ายของเดือนล่วงหน้า ระบบลงทะเบียน cron ให้รันทุกวันที่ 28-31 แล้วใช้ `isLastDayOfMonth(now, schedule.timezone)` เป็น guard ภายใน callback เพื่อข้ามการรันถ้ายังไม่ใช่วันสุดท้ายของเดือนใน timezone ของ report นั้น

### No tenant isolation (accepted risk)

`reports` และ `download_history` **ไม่มี** `ou_id`/`branch_id` — รายชื่อรายงาน, ประวัติการรัน และไฟล์ export มองเห็น/ดาวน์โหลดได้โดยทุก branch/org ที่ผ่าน gateway โดยเจตนา เพื่อ replicate workflow เดิมที่ staff ใช้ MongoDB client (Mongobooster) รัน query เองอยู่แล้ว ([`docs/raw-requirment.md`](../raw-requirment.md)) — ยอมรับความเสี่ยงนี้ไว้ ณ ตอนนี้ ให้ทบทวนใหม่หาก threat model หรือกลุ่มผู้ใช้เปลี่ยนไป (เช่น เปิดให้ branch staff ทั่วไปใช้งานในวงกว้างขึ้น) — รายละเอียดเต็มใน [`_mission-control/SPEC.md`](../../_mission-control/SPEC.md) (Known Limitations / Accepted Risks)

### Pagination

`GET /api/v1/smart-reports` และ `GET /api/v1/smart-reports/history` ใช้ `skip`/`limit` (`page >= 1`, `1 <= limit <= 100`, default `limit = 20`) คืนค่า `pagination: { page, limit, total, totalPages }` ผ่าน `buildPagination`

---

## Constraints & Validations

### `reports`

| Field | Constraint | Notes |
| ----- | ---------- | ----- |
| `name` | Required, String, min length 1 | **Unique** ทั้งระบบ — `IDX_REPORTS_NAME_UNIQUE`; ซ้ำ → `409 DUPLICATE` |
| `description` | Optional, String \| null | Default `null` |
| `script` | Required, String, min length 1 | รันผ่าน read-only connection เท่านั้น |
| `params` | Optional, Object | Default `{}`; key-value ใดก็ได้ |
| `outputFormat` | Required | Enum: `csv`, `excel` |
| `schedule` | Optional, Object \| null | `frequency` required ถ้าไม่ใช่ `null`; `dayOfMonth`: integer 1-31 หรือ `'last'` |
| `enabled` | Optional, Boolean | Default `true` |
| `cr_by`, `cr_date`, `cr_prog`, `upd_by`, `upd_date`, `upd_prog` | Required | Audit; `upd_date` = optimistic-lock version |

### `download_history`

| Field | Constraint | Notes |
| ----- | ---------- | ----- |
| `reportId` | Required, ObjectId | FK → `reports._id` (ไม่บังคับด้วย DB constraint) |
| `reportName`, `format` | Required, String | Denormalized จาก `reports` ณ เวลารัน |
| `fileName`, `filePath` | Required, String \| null | `null` เมื่อ `status = 'failed'` |
| `status` | Required | Enum: `running`, `success`, `failed` |
| `recordCount` | Required, Number \| null | `null` เมื่อ `status = 'failed'` |
| `error` | Required, String \| null | `null` เมื่อ `status` ≠ `'failed'` |
| `triggeredBy` | Required | Enum: `manual`, `scheduler` |
| `startedAt` | Required, Date | |
| `finishedAt` | Required, Date \| null | ตั้งค่าเมื่อรันเสร็จ (สำเร็จหรือล้มเหลว) |
| `cr_by`, `cr_date`, `cr_prog` | Required | ไม่มี `upd_*` — write-once |

---

**Document Version:** 1.0
**Created:** 2026-06-11
**Updated:** 2026-06-11
**Status:** Active
