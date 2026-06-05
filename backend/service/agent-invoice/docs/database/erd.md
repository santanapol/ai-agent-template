# Database Design Document

## Branch & Fee Management System

**Project:** Branch & Fee Management System (Invoice module — deferred)  
**Database:** MongoDB  
**Node.js:** 24 (ESM)  
**Frontend:** React 18+ + Vite + Ant Design  
**Date:** 2024-05-31

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

ระบบจัดการ **Branch** (สาขา/คู่สัญญา) และ **ค่าธรรมเนียมแยกตาม Company + Category** โดยใช้ `ou_id` เป็น scope หลักสำหรับแยกข้อมูล

**Scope ปัจจุบัน (collections ในเอกสารนี้):**

- ✅ สร้างและจัดการ Branch
- ✅ กำหนดค่าธรรมเนียมระดับ Company + Category ต่อ Branch
- ✅ Fee lookup (specific rate → default rate → error)
- ✅ Audit fields (`cr_*` / `upd_*`)

**Out of scope (ชั่วคราว):** collection `invoices` — จะออกแบบในเอกสารแยกเมื่อพร้อม

---

## Collections Schema

### 1️⃣ Collection: `agents`

**ความหมาย:** ข้อมูล Branch (สาขา/คู่สัญญา)

```javascript
{
  _id: ObjectId,
  ou_id: ObjectId,                     // Organizational Unit ID [Index]
  branch_id: ObjectId,                 // Branch ID
  branch_code: String,                 // รหัสย่อ เช่น "RY", "1668" (Unique ภายใน ou_id)
  branch_name: String,                 // ชื่อเต็ม เช่น "Royal777"
  branch_desc: String,                 // รายละเอียดสาขา
  branch_type: String,                 // Enum: 'MA' | 'AG'
  parent_branch_id: ObjectId,          // อ้างอิง branches._id แม่ข่าย (nullable)
  ref_fee_branch_id: ObjectId,         // อ้างอิง fee จาก agent อื่น (nullable)
  currency: String,                    // เช่น 'thb', 'mmk' (lowercase)
  default_fee_rate: Decimal128,        // Default fee (%) เมื่อไม่มี category fee (nullable)
  active: Boolean,                     // สถานะการเปิดใช้งาน
  cr_by: String,
  cr_date: Date,
  cr_prog: String,
  upd_by: String,
  upd_date: Date,
  upd_prog: String
}
```

**Field Descriptions:**

- `ou_id` — หน่วยงานภายใน organization สำหรับจัดกลุ่ม Branch (ObjectId)
- `branch_id` — รหัส Branch สำหรับใช้อ้างอิง (ObjectId)
- `branch_code` — รหัสย่อ; **ไม่ซ้ำภายใน `ou_id`**
- `branch_type` — ประเภท Branch (`MA` | `AG`)
- `ref_fee_branch_id` — อ้างอิงเรทค่าธรรมเนียมจาก Agent อื่น (ObjectId)
- `parent_branch_id` — ลำดับชั้น Branch (nullable)
- `default_fee_rate` — ค่าธรรมเนียมเริ่มต้น (%) **Optional**; ใช้เมื่อไม่มี record ใน `branch_category_fees` (Decimal128)
- `active` — สถานะการเปิดใช้งาน (Boolean)
- `cr_*` / `upd_*` — Audit และ optimistic locking

---

### 2️⃣ Collection: `agent_fees`

**ความหมาย:** ค่าธรรมเนียม Agent (อ้างอิงจากข้อมูล Seed)

```javascript
{
  _id: ObjectId,
  ou_id: ObjectId,
  branch_id: ObjectId,
  game_company_id: ObjectId,
  game_main_cate_id: ObjectId,
  gcomp_cost: Number,
  agent_known_fee: Number,
  agent_fee: Number,
  cr_by: String,
  cr_date: Date,
  cr_prog: String,
  upd_by: String,
  upd_date: Date,
  upd_prog: String
}
```

**Field Descriptions:**

- `ou_id` — Organization Unit ID
- `branch_id` — Branch ID (อ้างอิง agents)
- `game_company_id` — Game Company ID
- `game_main_cate_id` — Game Main Category ID
- `gcomp_cost` — ต้นทุนจริงๆ ที่เราต้องจ่ายให้ค่ายเกม (Game Company Cost)
- `agent_known_fee` — เรทค่าธรรมเนียมที่แสดงให้ Agent เห็น/รับรู้ (Display Fee)
- `agent_fee` — เรทค่าธรรมเนียมจริงๆ ที่เราใช้คำนวณเพื่อเรียกเก็บเงินจาก Agent (Actual Charge Fee)

---

## Database Indexes

### Indexes for `agents`

```javascript
// Unique branch id ภายใน OU
db.agents.createIndex(
  { ou_id: 1, branch_id: 1 },
  { unique: true },
);

// OU-scoped agents
db.agents.createIndex({ ou_id: 1 });

// Hierarchy
db.agents.createIndex({ parent_branch_id: 1 });
```

### Indexes for `agent_fees`

```javascript
db.agent_fees.createIndex(
    {
        ou_id: 1,
        branch_id: 1,
        game_company_id: 1,
        game_main_cate_id: 1
    },
    {
        name: "ou_id_1_branch_id_1_game_company_id_1_game_main_cate_id_1",
        background: true
    }
);
```

---

## Entity Relationships

### ER Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                           AGENTS                                │
├─────────────────────────────────────────────────────────────────┤
│ _id (ObjectId) [PK]                                             │
│ ou_id (ObjectId) [Index]                                        │
│ branch_id (ObjectId) [Index]                                    │
│ branch_code (String) [Unique w/ ou]                             │
│ branch_name, branch_desc, branch_type                           │
│ parent_branch_id (ObjectId, nullable) [Index]                   │
│ ref_fee_branch_id (ObjectId, nullable)                          │
│ currency, default_fee_rate (Decimal128, nullable), active       │
│ cr_by, cr_date, cr_prog, upd_by, upd_date, upd_prog             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1 : Many
                              │ branch_id → agents._id
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AGENT_FEES                               │
├─────────────────────────────────────────────────────────────────┤
│ _id (ObjectId) [PK]                                             │
│ ou_id                                                           │
│ branch_id (ObjectId) [FK, Index]                                │
│ game_company_id                                                 │
│ game_main_cate_id                                               │
│ gcomp_cost, agent_known_fee, agent_fee                          │
│ cr_by, cr_date, cr_prog, upd_by, upd_date, upd_prog             │
│                                                                 │
│ [Index: ou_id + branch_id + game_company_id + main_cate_id]     │
└─────────────────────────────────────────────────────────────────┘
```

### Relationship Type

| From       | To                     | Type   | Description                                      |
| ---------- | ---------------------- | ------ | ------------------------------------------------ |
| **agents**   | **agent_fees**           | 1:Many | Agent หนึ่งรายการมี fee หลาย company/category  |
| **agents**   | **agents** (`parent_branch_id`) | 0:1 | Agent แม่ข่าย (self-reference, optional)       |

---

## Data Examples

### `agents`

```json
{
  "_id": { "$oid": "665f0a1b2c3d4e5f6a7b8c9d" },
  "ou_id": { "$oid": "5f4f9d57266ed249e45ecef5" },
  "branch_id": { "$oid": "5f4fb5bb3156af7a2db9e5a0" },
  "branch_code": "RY",
  "branch_name": "Royal777",
  "branch_desc": "Royal777 Master Branch",
  "branch_type": "MA",
  "parent_branch_id": null,
  "ref_fee_branch_id": null,
  "currency": "thb",
  "default_fee_rate": { "$numberDecimal": "20.00" },
  "active": true,
  "cr_by": "user-001",
  "cr_date": { "$date": "2024-05-31T08:00:00.000Z" },
  "cr_prog": "POST /api/branches",
  "upd_by": "user-001",
  "upd_date": { "$date": "2024-05-31T08:00:00.000Z" },
  "upd_prog": "POST /api/branches"
}
```

### `agent_fees`

```json
{
  "_id": { "$oid": "665f0a1b2c3d4e5f6a7b8c9e" },
  "ou_id": { "$oid": "5f4f9d57266ed249e45ecef5" },
  "branch_id": { "$oid": "665f0a1b2c3d4e5f6a7b8c9d" },
  "game_company_id": { "$oid": "64f84af28f47e3525191cb3d" },
  "game_main_cate_id": { "$oid": "5f157e0f0cd3be22cc236a6b" },
  "gcomp_cost": 6,
  "agent_known_fee": 6,
  "agent_fee": 9,
  "cr_by": "user-001",
  "cr_date": { "$date": "2024-05-31T09:00:00.000Z" },
  "cr_prog": "POST /api/agent-fees",
  "upd_by": "user-001",
  "upd_date": { "$date": "2024-05-31T09:00:00.000Z" },
  "upd_prog": "POST /api/agent-fees"
}
```

---

## Design Decisions

### `ou_id` เป็น data scope หลัก

ทุก API ที่อ่าน/เขียนต้อง filter `ou_id` เสมอ (จาก JWT หรือ payload ตามสิทธิ์ผู้ใช้)

### แบบ Normalized ใน `agent_fees`

ข้อมูลต่างๆ เช่นชื่อสาขาหรือชื่อบริษัทเกม ไม่ถูกบันทึกซ้ำเพื่อหลีกเลี่ยงความยุ่งยากในการอัปเดตข้อมูล (Denormalization ถูกยกเลิกตามความต้องการของระบบใหม่)

- Query fee อาจจะต้องพึ่งพาการ Join (Lookup) หรือดึงข้อมูลมารวมกันที่ Frontend
- Enforce compound unique index ตาม OU scope

### Unique `branch_id`

Unique แบบ `(ou_id, branch_id)` — รหัสซ้ำได้คนละ OU

### `default_fee_rate`

Optional; ถ้าไม่มี category fee และไม่มี default → business error

### Collection `invoices`

ถอนออกจากเอกสารชั่วคราว; เมื่อออกแบบจะ denormalize `ou_id`, `branch_name` จาก Branch และ snapshot `fee_rate` จาก lookup logic ด้านบน

---

## Constraints & Validations

### `agents`

| Field | Constraint | Notes |
| ----- | ---------- | ----- |
| `ou_id` | Required, ObjectId | |
| `branch_id` | Required, ObjectId | |
| `branch_code` | Required | |
| `(ou_id, branch_id)` | Unique | Compound index |
| `branch_name` | Required | |
| `branch_desc` | Optional | |
| `branch_type` | Enum: `MA`, `AG` | Required |
| `parent_branch_id` | Optional, ObjectId | ต้องชี้ `agents._id` ภาย OU เดียวกัน |
| `ref_fee_branch_id`| Optional, ObjectId | อ้างอิง fee จาก agent อื่น |
| `currency` | Required | lowercase ISO-style เช่น `thb` |
| `default_fee_rate` | Optional, 0–100 if set | Decimal128 |
| `active` | Required | Boolean |

### `agent_fees`

| Field | Constraint | Notes |
| ----- | ---------- | ----- |
| `ou_id` | Required | |
| `branch_id` | Required, ObjectId | FK → `agents._id` |
| `game_company_id`, `game_main_cate_id` | Required, ObjectId | |
| `gcomp_cost`, `agent_known_fee`, `agent_fee` | Required | Number |
| `(ou_id, branch_id, game_company_id, game_main_cate_id)` | Indexed | |

---

**Document Version:** 1.2  
**Created:** 2024-05-31  
**Updated:** 2026-06-02 (Branch rename, ใช้ `ou_id` เป็น scope เดียว, แก้ความสม่ำเสมอ schema/index, ถอน `invoices` ชั่วคราว)  
**Status:** Draft
