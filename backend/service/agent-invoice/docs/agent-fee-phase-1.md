# Agent Fee Management (Specification)

## 🎯 Goal
พัฒนาระบบจัดการ Agent Fees (CRUD Operations: ค้นหา, เพิ่ม, ลบ, แก้ไข) โดยครอบคลุมทั้ง Frontend และ Backend

## 🔄 Data Migration / Sync Source
ดึงข้อมูลเริ่มต้นจากระบบภายนอกเพื่อนำมาปรับปรุงโครงสร้างใหม่
- **Source Database:** `gpp_777ww.su_branch`
- **Connection String:** `mongodb+srv://invocie-read-api:jWDPimjWyzvWlMTZ@777ww-prod.xiu0o.gcp.mongodb.net/?appName=agent-invoice`
- **เงื่อนไขการ Sync:** 
  - ดึงข้อมูลเพียง **ครั้งเดียว (One-time)** โดยให้ User เลือกกดดึงข้อมูลทีละ Branch
  - หากต้นทางมีการแก้ไขข้อมูลหลังจากดึงมาแล้ว User จะต้องเข้ามาอัปเดตข้อมูลด้วยตัวเองในระบบนี้
- **Fields ที่ดึงมาใช้งาน:**
  - `_id` (นำมาเก็บไว้ในฟิลด์ `branch_id`)
  - `ou_id`
  - `branch_type`
  - `branch_name`
  - `branch_code`
  - `branch_desc`
  - `currency`
  - `reference_branch`

## 🗄️ Database Schema & Storage (Target)
บันทึกข้อมูลลง Database ของระบบ Invoice

- **Target Database:** `agent-invoice`
- **Target Collection:** `agents`
- **Connection String:** `mongodb://invoice-api:invoice-api@localhost:27017/agent-invoice?authSource=agent-invoice`

### Collection: `agents`
**ความหมาย:** ข้อมูล Branch (สาขา/คู่สัญญา)

| Field | Type | Description / Source Mapping |
| :--- | :--- | :--- |
| `_id` | ObjectId | MongoDB Auto-generated PK |
| `branch_id` | ObjectId | ใช้ `_id` ของต้นทาง (su_branch) |
| `ou_id` | ObjectId | แมปจาก `ou_id` (เก็บเป็น Reference) |
| `branch_code` | String | แมปจาก `branch_code` |
| `branch_name` | String | แมปจาก `branch_name` |
| `branch_type` | String | แมปจาก `branch_type` |
| `branch_desc` | String | แมปจาก `branch_desc` |
| `parent_branch_id` | ObjectId | แมปจาก `reference_branch` (เก็บเป็น Reference) |
| `currency` | String | แมปจาก `currency` |
| `default_fee_rate` | Decimal128 | Default fee (%) |
| `active` | Boolean | สำหรับ Soft Delete (Default: true) |

## ⚙️ Business Logic
- **การคำนวณเรท:** ในขั้นตอนการคำนวณ หากไม่พบค่าธรรมเนียม หรือ `default_fee_rate` ไม่มีค่า (Null) ให้ระบบถือว่าเรทเป็น 0% พร้อมทั้ง **แจ้งเตือน Error และหยุดการทำงานทันที**

## 🛠️ System Requirements
1. **Backend:**
   - สร้าง API สำหรับ CRUD (Create, Read, Update, Delete) ข้อมูลใน Collection `agents` โดยการ Delete จะต้องเป็นแบบ **Soft Delete** (`active: false`) เท่านั้น
   - สร้าง API สำหรับดึงข้อมูล (Sync) จาก Source Database แบบระบุทีละ Branch
2. **Frontend:**
   - สร้าง UI สำหรับแสดงผลรายการ (List/Data Table) พร้อมฟังก์ชันค้นหา (Search)
   - มีปุ่มสำหรับดึงข้อมูล (Sync) จากต้นทางทีละ Branch
   - สร้างฟอร์มสำหรับจัดการข้อมูล เพิ่ม (Create), แก้ไข (Update) และระบบ ลบ (Soft Delete) ข้อมูล
