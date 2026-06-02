# Database Design Document

## Invoice & Agent Fee Management System

**Project:** Invoice & Agent Fee Management System  
**Database:** MongoDB  
**Node.js:** 24 (ESM)  
**Frontend:** React 18+ + Vite + Ant Design  
**Report Engine:** Puppeteer (PDF) + exceljs (Excel)  
**Date:** 2024-05-31

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Collections Schema](#collections-schema)
3. [Database Indexes](#database-indexes)
4. [Entity Relationships](#entity-relationships)
5. [Data Examples](#data-examples)
6. [Design Decisions](#design-decisions)

---

## System Overview

ระบบซอฟต์แวร์แบบ Single-user สำหรับจัดการวงจรชีวิตของ Invoice และ Agent Fee อย่างครบวงจร โดยมี features:

- ✅ สร้างและจัดการ Invoice
- ✅ กำหนดค่าธรรมเนียมแยกตาม Company + Category
- ✅ การ Approval workflow (Pending → Ready → Paid/Waive)
- ✅ Audit trail แบบ complete
- ✅ Export เป็น PDF และ Excel

---

## Collections Schema

### 1️⃣ Collection: `agents`

**ความหมาย:** ข้อมูลของ Agent (ตัวแทน/คู่สัญญา)

```javascript
{
  _id: ObjectId,
  agent_code: String,                  // รหัสย่อ เช่น "RY", "1668" (Unique)
  agent_name: String,                  // ชื่อเต็ม เช่น "Royal777"
  agent_type: String,                  // Enum: 'vip' | 'affiliate'
  parent_agent_id: ObjectId,           // อ้างอิง Agent แม่ข่าย (nullable)
  currency: String,                    // เช่น 'thb', 'mmk'
  default_fee_rate: Decimal128,        // Default fee (%) เผื่อหาไม่เจอ (nullable)
  status: String,                      // Enum: 'active' | 'inactive'
  cr_by: String,                       // user_id ของผู้สร้าง
  cr_date: Date,                       // วันที่สร้าง
  cr_prog: String,                     // โปรแกรม/Endpoint ที่สร้าง
  upd_by: String,                      // user_id ของผู้แก้ไขล่าสุด
  upd_date: Date,                      // วันที่แก้ไขครั้งสุดท้าย
  upd_prog: String                     // โปรแกรม/Endpoint ที่แก้ไขล่าสุด
}
```

**Field Descriptions:**

- `agent_code` - Unique identifier รหัสย่อสำหรับ Agent (ต้องไม่ซ้ำกัน)
- `default_fee_rate` - ค่าธรรมเนียมเริ่มต้น (%) (Optional) ใช้เมื่อไม่มี Specific Fee
- `status` - สถานะ active/inactive (Soft Delete ใช้ status='inactive')
- `cr_*` / `upd_*` - Audit Fields สำหรับบันทึกประวัติและป้องกันการเซฟทับ (Optimistic Locking)

---

### 2️⃣ Collection: `agent_category_fees`

**ความหมาย:** ค่าธรรมเนียมแยกตาม Company + Category สำหรับแต่ละ Agent

```javascript
{
  _id: ObjectId,
  agent_id: ObjectId,                  // Reference: _id จาก agents [Index]
  company_id: String,                  // ID ระดับระบบของค่ายเกม เช่น "6A0..." [Index]
  main_cate_id: String,                // ID ระดับระบบของประเภทเกม เช่น "1B2..." [Index]
  platform_name: String,               // ชื่อ Platform เช่น "AWC"
  game_provider: String,               // ชื่อค่ายเกมสำหรับแสดงผล เช่น "SEXY"
  game_category: String,               // ชื่อหมวดหมู่สำหรับแสดงผล เช่น "LIVE CASINO"
  fee_rate: Decimal128,                // Override fee (%): เช่น 25
                                       // Validation: min=0, max=100, required
  cr_by: String,
  cr_date: Date,
  cr_prog: String,
  upd_by: String,
  upd_date: Date,
  upd_prog: String
}
```

**Field Descriptions:**

- `agent_id` - ObjectId ตัวอ้างอิงไป agents collection
- `company_id` / `main_cate_id` - ID ระดับระบบของค่ายเกมและหมวดหมู่
- `game_provider` / `game_category` - ชื่อค่ายเกมและหมวดหมู่ (ใช้สำหรับแสดงผล Denormalization โดยไม่ต้อง JOIN)
- `fee_rate` - ค่าธรรมเนียมเฉพาะ (Override จาก default_fee_rate)
- `cr_*` / `upd_*` - Audit Fields สำหรับบันทึกประวัติและตรวจสอบเวอร์ชันข้อมูล

**Fee Lookup Logic:**

```
1. ค้นหา (agent_id, company_id, main_cate_id) → เจอ? ใช้ fee_rate นี้
2. ไม่เจอ → ใช้ agents.default_fee_rate
3. ไม่มี default → Error
```

---

### 3️⃣ Collection: `invoices`

**ความหมาย:** ข้อมูล Invoice หลัก พร้อมรายละเอียดค่าธรรมเนียม

```javascript
{
  _id: ObjectId,

  // ========== ข้อมูลพื้นฐาน ==========
  invoice_number: String,              // Unique: "INV-2024-05-0001" [Unique Index]
                                       // Format: INV-YYYY-MM-SEQ (SEQ reset ทุกต้นเดือน)
  agent_id: String,                    // Reference: agent_id จาก agents [Index]
  agent_name: String,                  // Denormalized: ชื่อ Agent ณ เวลาสร้าง Invoice
  organization_id: String,             // Organization จาก JWT Token [Index]
                                       // รองรับ Multi-tenant ในอนาคต

  // ========== ช่วงเวลา ==========
  issue_date: Date,                    // วันที่ออก Invoice
  billing_period: {
    start: Date,                       // วันเริ่มต้นของรอบบิล เช่น 2024-05-01
    end: Date                          // วันสิ้นสุดของรอบบิล เช่น 2024-05-31
  },

  // ========== จำนวนเงิน ==========
  base_amount: Decimal128,             // ผลรวม base_fee_amount ทั้งหมด
                                       // Validation: > 0, required
  total_fee_amount: Decimal128,        // ผลรวม fee_amount ทั้งหมด
  total_amount: Decimal128,            // base_amount + total_fee_amount

  // ========== สถานะ ==========
  status: String,                      // Enum: 'Pending' | 'Ready' | 'Paid' | 'Waive'
                                       // [Index]
  remarks: String,                     // หมายเหตุ (บังคับกรอกเมื่อ status='Waive')

  // ========== Soft Delete ==========
  is_deleted: Boolean,                 // default: false
  deleted_at: Date,                    // null = ยังใช้งาน, Date = ถูกลบแล้ว
  deleted_by: String,                  // user_id ที่ทำการลบ (nullable)

  // ========== รายละเอียดค่าธรรมเนียม (Embedded Array) ==========
  invoice_fees: [
    {
      fee_id: String,                  // UUID: ระบุ Fee แต่ละรายการ
      company_id: String,              // บริษัท/ค่ายเกม
      main_cate_id: String,            // หมวดหมู่
      fee_description: String,         // รายละเอียด เช่น "gameA-slot Commission"
      base_fee_amount: Decimal128,     // จำนวนเงินก่อนคิดค่าธรรมเนียม
                                       // Validation: > 0, required
      fee_rate_applied: Decimal128,    // % ที่ใช้คำนวณ ณ เวลาสร้าง Invoice (Immutable)
                                       // Snapshot จาก agent_category_fees หรือ default_fee_rate
                                       // Validation: 0-100, required
      fee_amount: Decimal128,          // base_fee_amount × fee_rate_applied / 100
      total_fee_amount: Decimal128     // base_fee_amount + fee_amount
    }
  ],

  // ========== Workflow Metadata ==========
  approved_date: Date,                 // เมื่อ Approve (nullable)
  approved_by: String,                 // user_id ที่ Approve (nullable)
  waived_date: Date,                   // เมื่อ Waive (nullable)
  waived_by: String,                   // user_id ที่ Waive (nullable)
  paid_date: Date,                     // เมื่อชำระแล้ว (nullable)
  paid_by: String,                     // user_id ที่บันทึกการชำระ (nullable)

  // ========== Audit (Standard) ==========
  cr_by: String,                       // user_id ของผู้สร้าง
  cr_date: Date,                       // วันที่สร้าง Invoice
  cr_prog: String,                     // โปรแกรม/Endpoint ที่สร้าง
  upd_by: String,                      // user_id ของผู้แก้ไขล่าสุด
  upd_date: Date,                      // วันที่แก้ไขครั้งสุดท้าย (ใช้เช็ค Version ตอน Pending)
  upd_prog: String,                    // โปรแกรม/Endpoint ที่แก้ไขล่าสุด

  // ========== Audit Log (ประวัติการเปลี่ยนแปลง - Immutable) ==========
  audit_log: [
    {
      action: String,                  // 'created' | 'edited' | 'approved'
                                       // | 'waived' | 'paid' | 'deleted' | 'restored'
      timestamp: Date,                 // เมื่อทำ Action
      user: String,                    // user_id ที่ทำ Action
      old_status: String,              // Status เดิม (nullable)
      new_status: String,              // Status ใหม่
      notes: String                    // หมายเหตุเพิ่มเติม (nullable)
    }
  ]
}
```

**Field Descriptions:**

- `invoice_number` - หมายเลข Invoice ที่ไม่ซ้ำกัน รูปแบบ INV-YYYY-MM-SEQ
- `organization_id` - ดึงจาก JWT Token รองรับ Multi-tenant
- `billing_period` - ช่วงเวลาที่ Invoice ครอบคลุม (อาจต่างจาก issue_date)
- `base_amount` - ผลรวมยอดเงินก่อนคิดค่าธรรมเนียมทั้งหมด
- `total_fee_amount` - ผลรวมค่าธรรมเนียมทั้งหมด
- `total_amount` - ยอดรวมสุดท้าย (base + fees)
- `is_deleted` - Soft Delete flag
- `invoice_fees[].fee_rate_applied` - Snapshot ของ % ที่ใช้ตอนสร้าง Invoice (ไม่เปลี่ยนแม้ Fee จะถูกแก้ไขภายหลัง)
- `audit_log` - ประวัติการเปลี่ยนแปลงทุกขั้นตอน (Immutable)

---

## Database Indexes

### Indexes for `agents`

```javascript
// Unique Index: ค้นหา Agent ด้วย agent_id
db.agents.createIndex({ agent_id: 1 }, { unique: true });

// Filter Active Agents
db.agents.createIndex({ status: 1 });

// Soft Delete Query Support
db.agents.createIndex({ deleted_at: 1 });

// Organization + Status (Multi-tenant support)
db.agents.createIndex({ organization_id: 1, status: 1 });
```

### Indexes for `agent_category_fees`

```javascript
// Fee Lookup (Primary Use Case: ดึง Specific Fee)
// Query: { agent_id, company_id, main_cate_id }
db.agent_category_fees.createIndex(
  { agent_id: 1, company_id: 1, main_cate_id: 1 },
  { unique: true }, // Enforce ไม่มี duplicate combination
);

// ดู Fee ทั้งหมดของ Agent
// Query: { agent_id }
db.agent_category_fees.createIndex({ agent_id: 1 });

// Soft Delete Query Support
db.agent_category_fees.createIndex({ deleted_at: 1 });
```

### Indexes for `invoices`

```javascript
// Unique Invoice Number
db.invoices.createIndex({ invoice_number: 1 }, { unique: true });

// === Single Field Indexes ===

// Query by Agent
db.invoices.createIndex({ agent_id: 1 });

// Query by Status (Pending List, Ready List)
db.invoices.createIndex({ status: 1 });

// Organization Index (Multi-tenant)
db.invoices.createIndex({ organization_id: 1 });

// Soft Delete Filter
db.invoices.createIndex({ is_deleted: 1 });

// Multikey Index: ค้นหาตาม Company/Category ใน invoice_fees
// Query: { "invoice_fees.company_id": "gameA", "invoice_fees.main_cate_id": "slot" }
// หมายเหตุ: Multikey Index มีข้อจำกัดเรื่อง Compound Multikey
db.invoices.createIndex({
  "invoice_fees.company_id": 1,
  "invoice_fees.main_cate_id": 1,
});

// === Compound Indexes (เลือกตาม Query Pattern) ===

// Pattern A: ค้นหาตาม Agent + กรอง Status + เรียงตามวันที่
// Query: { agent_id: X, status: Y } sort by cr_date
// Use case: "Invoice ของ Agent นี้ที่ยังค้างอยู่ (Pending)"
db.invoices.createIndex({
  agent_id: 1,
  status: 1,
  cr_date: -1,
});

// Pattern B: ค้นหาตามช่วงวันที่ + กรอง Agent + Status
// Query: { cr_date: { $gte, $lte }, agent_id: X, status: Y }
// Use case: "Export รายงานช่วงเดือนนี้"
db.invoices.createIndex({
  cr_date: 1,
  agent_id: 1,
  status: 1,
});

// Pattern C: Organization + Status + Date (Multi-tenant Search)
// Query: { organization_id: X, status: Y, cr_date: range }
db.invoices.createIndex({
  organization_id: 1,
  status: 1,
  cr_date: -1,
});

// Pattern D: Billing Period Search
// Query: { "billing_period.start": { $gte }, "billing_period.end": { $lte } }
db.invoices.createIndex({
  "billing_period.start": 1,
  "billing_period.end": 1,
});
```

---

## Entity Relationships

### ER Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          AGENTS                                 │
├─────────────────────────────────────────────────────────────────┤
│ _id (ObjectId)                                                  │
│ agent_code (String) [Unique Index]                              │
│ agent_name (String)                                             │
│ agent_type, parent_agent_id                                     │
│ currency                                                        │
│ default_fee_rate (Decimal128) [Nullable]                        │
│ status ('active' | 'inactive')                                  │
│ cr_date, upd_date, cr_by, upd_by                                │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ 1-to-Many (Reference)
                ┌─────────────┴──────────────┐
                │                             │
                │                             │
                ▼                             ▼
     ┌──────────────────────┐    ┌──────────────────────────┐
     │AGENT_CATEGORY_FEES   │    │      INVOICES            │
     ├──────────────────────┤    ├──────────────────────────┤
     │ _id (ObjectId)       │    │ _id (ObjectId)           │
     │ agent_id [FK, Index] │    │ invoice_number [Unique]  │
     │ company_id [Index]   │    │ agent_id [Index, FK]     │
     │ main_cate_id [Index] │    │ agent_name (denorm)      │
     │ platform_name        │    │ issue_date               │
     │ game_provider        │    │ base_amount              │
     │ game_category        │    │ total_amount             │
     │ fee_rate             │    │ status [Index]           │
     │                      │    │ remarks                  │
     │ cr_date, upd_date    │    │ invoice_fees [           │
     │                      │    │   {                      │
     │ [Compound Index:     │    │     fee_id               │
     │  agent_id +          │    │     company_id           │
     │  company_id +        │    │     main_cate_id         │
     │  main_cate_id]       │    │     fee_description      │
     └──────────────────────┘    │     base_fee_amount      │
              ▲                   │     fee_rate             │
              │                   │     fee_amount           │
              │ Lookup fee_rate   │     total_fee_amount     │
              │ (if specific)     │   }                      │
              │                   │ ]                        │
              └───────────────────┤ approved_date, by        │
                                  │ waived_date, by          │
                                  │ paid_date, by            │
                                  │ cr_date, upd_date        │
                                  │ cr_by, upd_by            │
                                  │ cr_prog, upd_prog        │
                                  │ audit_log [              │
                                  │   {                      │
                                  │     action, timestamp    │
                                  │     user, old_status     │
                                  │     new_status, notes    │
                                  │   }                      │
                                  │ ]                        │
                                  └──────────────────────────┘
```

### Relationship Type

| From                    | To                      | Type       | Description                                         |
| ----------------------- | ----------------------- | ---------- | --------------------------------------------------- |
| **agents**              | **agent_category_fees** | 1:Many     | Agent มี multiple category-specific fees            |
| **agents**              | **invoices**            | 1:Many     | Agent มี multiple invoices                          |
| **agent_category_fees** | **invoices**            | Referenced | Invoice ดึง fee_rate จาก category_fees (via lookup) |

## Constraints & Validations

| Field                                                         | Constraint                    | Notes                       |
| ------------------------------------------------------------- | ----------------------------- | --------------------------- |
| `agent_id`                                                    | Unique, Required              | ต้องไม่ซ้ำกัน               |
| `default_fee_rate`                                            | 0-100, Decimal128, Required   | เปอร์เซ็นต์ค่าธรรมเนียม     |
| `invoice_number`                                              | Unique, Required              | รูปแบบ INV-YYYY-MM-SEQ      |
| `organization_id`                                             | Required                      | ดึงจาก JWT Token            |
| `base_amount`                                                 | > 0, Decimal128, Required     | ต้องมีค่ามากกว่า 0          |
| `total_fee_amount`                                            | >= 0, Decimal128              | คำนวณอัตโนมัติ              |
| `total_amount`                                                | > 0, Decimal128               | คำนวณอัตโนมัติ              |
| `fee_rate`                                                    | 0-100, Decimal128, Required   | เปอร์เซ็นต์ค่าธรรมเนียม     |
| `fee_rate_applied`                                            | 0-100, Decimal128, Immutable  | Snapshot ณ เวลาสร้าง        |
| `base_fee_amount`                                             | > 0, Decimal128, Required     | ต้องมากกว่า 0               |
| `status`                                                      | Enum (4 values), Required     | Pending, Ready, Paid, Waive |
| `remarks`                                                     | Required เมื่อ status='Waive' | บังคับกรอกเหตุผลเมื่อ Waive |
| `is_deleted`                                                  | Boolean, default: false       | Soft Delete flag            |
| `billing_period.start`                                        | Date, Required                | วันเริ่มต้นรอบบิล           |
| `billing_period.end`                                          | Date >= start, Required       | วันสิ้นสุดรอบบิล            |
| `(company_id, main_cate_id)` ใน invoice_fees                  | No duplicate ใน Invoice เดียว | Validate ก่อน Save          |
| `(agent_id, company_id, main_cate_id)` ใน agent_category_fees | Unique                        | Compound Unique Index       |

**Document Version:** 1.1
**Created:** 2024-05-31
**Updated:** 2024-05-31 (เพิ่ม fee_rate_applied, Soft Delete fields, billing_period, organization_id, Mongoose Validations, Query Pattern Indexes, Design Decisions ครบถ้วน)
**Status:** ✅ Approved
