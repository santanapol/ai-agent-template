# Implementation Plan: Agent Fee CRUD (Backend)

## 📌 1. Dependency Graph
- **Database Layer (MongoDB):** ตาราง `agent_category_fees` (ไม่มี Mongoose ใช้ raw MongoDB Driver)
- **Shared Utils/Plugins:** ตัวแปร DB Connection, การคืนค่า Response (ตามมาตรฐาน)
- **Module `agent-fees`:** ประกอบด้วย Route -> Controller -> Service -> Repository

## 📋 2. Vertical Slices (Phases)
### Phase 1: Core Setup & Read (GET)
- สร้างโครงสร้างโฟลเดอร์สำหรับ Module
- เขียน Repository เชื่อมต่อกับ MongoDB
- สร้าง API `GET` สำหรับดึงข้อมูล Fee 
- **Checkpoint 1:** ตรวจสอบข้อมูล Fee ของ Agent ได้

### Phase 2: Create (POST)
- พัฒนา API `POST`
- Validate Body & ป้องกันข้อมูลซ้ำซ้อน
- **Checkpoint 2:** สร้าง Override Fee สำเร็จ และมี Audit fields (`cr_*`, `upd_*`) ครบถ้วน

### Phase 3: Update & Concurrency (PATCH)
- พัฒนา API `PATCH`
- ใส่ระบบ Optimistic Locking โดยใช้ `upd_date`
- **Checkpoint 3:** แก้ไข Fee สำเร็จ / ป้องกันการเซฟทับได้

### Phase 4: Delete (DELETE)
- พัฒนา API `DELETE` (Hard Delete)
- **Checkpoint 4:** ลบข้อมูล Fee ออกจากตารางได้จริง

## 🧪 3. Verification & Acceptance
- รัน Service โดยไม่มี Error
- ทดสอบเรียก API ทุกเส้นด้วย HTTP Client (เช่น Postman/Bruno) ตาม Acceptance Criteria ของแต่ละ Phase
