# Agent Fee Management (Specification) - Phase 2

## 🎯 Goal

พัฒนาระบบจัดการ Agent Fees (CRUD Operations: ค้นหา, เพิ่ม, ลบ, แก้ไข) โดยครอบคลุมทั้ง Frontend (UI) และ Backend (API) เพื่อให้สามารถตั้งค่าธรรมเนียมของแต่ละสาขา (Branch) แยกตามบริษัทเกมและประเภทเกมได้

## 🔄 Data Source / Master Data

ดึงข้อมูล Master Data จากระบบภายนอก (Source Database) เพื่อนำมาใช้เป็นตัวเลือก (Dropdowns) และใช้อ้างอิงเพื่อนำไปบันทึกลง Collection `agent_fees`

- **Source Database Connection:** `mongodb+srv://invocie-read-api:jWDPimjWyzvWlMTZ@777ww-prod.xiu0o.gcp.mongodb.net/?appName=agent-invoice`

**Collections จาก Source:**

1. `game_company`
   - ฟิลด์ที่นำมาใช้งาน: `name` (Game Provider), `description`, `game_platform` (Platform Name)
2. `game_main_category`
   - ฟิลด์ที่นำมาใช้งาน: `manin_cate_name.en` (Game Category), `description`

## 🗄️ Database Schema & Storage (Target)

บันทึกข้อมูลค่าธรรมเนียมที่ผูกแล้วลง Database ของระบบ Invoice

- **Target Database:** `agent-invoice`
- **Target Collection:** `agent_fees`

### Collection: `agent_fees`

**ความหมาย:** ข้อมูลค่าธรรมเนียมที่ผูกระหว่าง Agent (Branch) กับ Game Company & Category (แบบ Normalized ไม่บันทึกข้อมูลชื่อซ้ำซ้อน)

| Field | Type | Description / Source Mapping |
| :--- | :--- | :--- |
| `_id` | ObjectId | MongoDB Auto-generated PK |
| `ou_id` | ObjectId | อ้างอิงจาก `agents.ou_id` (สำหรับทำ Scope) |
| `branch_id` | ObjectId | อ้างอิงจาก `agents._id` |
| `game_company_id` | ObjectId | อ้างอิงจาก `game_company._id` |
| `game_main_cate_id` | ObjectId | อ้างอิงจาก `game_main_category._id` |
| `gcomp_cost` | Number | ต้นทุนจริงๆ ที่เราจ่ายให้ค่ายเกม |
| `agent_known_fee` | Number | เรทค่าธรรมเนียมตัวโชว์ (ที่แสดงให้ Agent รู้) |
| `agent_fee` | Number | อัตราค่าธรรมเนียมของจริงที่เราใช้คำนวณเก็บจาก Agent (%) |
| `cr_*` / `upd_*` | String/Date | Audit Log (ใครสร้าง/แก้ไข เวลาเท่าไหร่) |

*(โครงสร้างอ้างอิงจากไฟล์ `docs/database/erd.md` - ตัดการทำ Denormalization ออกทั้งหมดตามที่ตกลงใหม่)*

## ⚙️ Business Logic & Constraints

- **Optimistic Locking:** การแก้ไข (Update) และการลบ (Delete) ต้องบังคับส่งค่า `If-Match` ETag (สร้างจาก `upd_date`) เสมอเพื่อป้องกันปัญหาผู้ใช้แก้ไขข้อมูลพร้อมกัน
- **Validation:**
  - ค่าของ `gcomp_cost`, `agent_known_fee`, และ `agent_fee` ต้องเป็นตัวเลข
  - การบันทึกข้อมูลต้องไม่ซ้ำกัน (Duplicate check) ในระดับ `branch_id` + `game_company_id` + `game_main_cate_id`
  - **Smart Dropdown Filtering (DDL):** ในหน้าสร้าง/แก้ไข ตัวเลือกใน Dropdown ต้องกรองข้อมูลที่ถูกผูกไปแล้วออก เพื่อป้องกันการเลือกซ้ำ (เช่น ถ้าสร้าง Company A + Category SLOT ไปแล้ว ตอนเลือก Company A ตัว Category DDL ต้องไม่มี SLOT โผล่มาให้เลือกอีก)

## 🛠️ System Requirements

1. **Backend:**
   - สร้าง API `GET /api/v1/agents/:agentId/fees` สำหรับแสดงรายการ (รองรับ Pagination)
   - สร้าง API `POST /api/v1/agents/:agentId/fees` สำหรับบันทึกเพิ่ม Fee ใหม่
   - สร้าง API `PATCH /api/v1/agents/:agentId/fees/:feeId` สำหรับอัปเดตค่าธรรมเนียม (`gcomp_cost`, `agent_known_fee`, `agent_fee`)
   - สร้าง API `DELETE /api/v1/agents/:agentId/fees/:feeId` สำหรับลบรายการ Fee (เป็นแบบ **Hard Delete** ลบทิ้งจากระบบถาวร)
   - สร้าง API หรือปรับโครงสร้างสำหรับการอ่าน Master Data (`game_company`, `game_main_category`) ให้ฝั่ง Frontend ดึงไปทำ Dropdown
2. **Frontend:**
   - สร้าง UI (Data Table) แสดงรายการ Agent Fees ซ้อนอยู่ภายใต้หน้ารายละเอียดของ Agent แต่ละสาขา
   - สร้าง Modal / Form สำหรับ เพิ่ม/แก้ไข Agent Fee
   - ฟอร์มต้องมี Select Dropdown สำหรับเลือก **Game Company** และ **Game Category** โดยดึงจาก API Master Data
   - **(สำคัญ)** ตัว Dropdown ต้องทำ Smart Filtering กล่าวคือ:
     - ดึงรายการ Fee ทั้งหมดของ Agent นี้มาตรวจสอบ
     - Category DDL: จะไม่แสดง Category ที่ถูกผูกกับ Company ที่เลือกไปแล้ว
     - Company DDL: (Optional) อาจจะไม่แสดง Company เลยหาก Category ทั้งหมดของ Company นั้นถูกผูกครบแล้ว
