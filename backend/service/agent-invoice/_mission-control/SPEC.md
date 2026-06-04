# Spec: Agent Fee Management (Phase 2)

## Objective
พัฒนาระบบจัดการ Agent Fees (CRUD Operations: ค้นหา, เพิ่ม, ลบ, แก้ไข) โดยครอบคลุมทั้ง Frontend (UI) และ Backend (API) เพื่อให้สามารถตั้งค่าธรรมเนียมของแต่ละสาขา (Branch) แยกตามบริษัทเกมและประเภทเกมได้

**เป้าหมายหลัก:**
- สร้าง API สำหรับจัดการ `agent_fees` ใน Service `agent-invoice`
- สร้าง UI ในส่วน Backoffice เพื่อให้ผู้ดูแลระบบสามารถผูกและตั้งค่าธรรมเนียมให้ Agent (Branch) ได้
- จัดทำ Smart Dropdown DDL กรองตัวเลือกที่ถูกใช้ไปแล้ว

**การตัดสินใจและข้อสมมติฐาน (Decisions & Assumptions):**
1. หน้า UI ของ Frontend จะอยู่ในระบบ `zero-platform/frontend/backoffice`
2. **Database:** การเชื่อมต่อ Database 2 แหล่ง จะต้องสร้าง Connection สองชุดพร้อมกัน (เชื่อม target DB `agent-invoice` และ source DB `777ww-prod` แบบ Read-only)
3. **Optimistic Locking:** การตรวจสอบ ETag บังคับตรวจสอบ `If-Match` เสมอแม้แต่ตอนลบข้อมูล (Delete)
4. **Folder Structure:** การวางโครงสร้าง Folder แบบ Modular จะใช้เส้นทาง `src/modules/agent-fees/`

## Tech Stack
- **Backend:** Node.js (v24.xx LTS), Fastify, MongoDB (v8.0.x)
- **Frontend:** React / Vite (ตามที่โปรเจกต์ใช้งานปัจจุบัน)

## Commands
- **Backend Dev:** `npm run dev`
- **Backend Test:** `npm test` หรือ `node --test`
- **Frontend Dev:** `npm run dev`

## Project Structure
การจัดวางโค้ดใน Backend ตามแบบ Modular Vertical Slicing:
```text
src/modules/agent-fees/
├── agent-fees.route.js          # จัดการ Route แบบผสม: `/api/v1/agents/:agentId/fees` (Sub-resource) และ `/api/v1/master-data/game-...` (Global)
├── agent-fees.controller.js     # ควบคุมการทำงานของ Fees
├── agent-fees.service.js        # Business Logic (รวมถึง Master Data)
├── agent-fees.repository.js     # จัดการ Query Database สำหรับ agent_fees และ Master Data
└── agent-fees.schema.js         # OpenAPI/Validation Schema 
```

## Code Style
- ยึดตามมาตรฐาน `coding-standard/backend/*` ทุกประการ:
  - ใช้ `ou_id` และ `branch_id` ในทุก ๆ การสืบค้น Database (Tenant Isolation)
  - เก็บ Audit fields (`cr_by`, `cr_date`, `cr_prog`, `upd_by`, `upd_date`, `upd_prog`) สำหรับ `agent_fees`
  - ใช้ Optimistic Locking ตรวจสอบ `If-Match` เสมอ (Update/Delete) หากลืมส่งมาต้องตอบกลับ `428 PRECONDITION_REQUIRED` และหาก ETag ไม่ตรงกันต้องตอบกลับ `412 VERSION_CONFLICT`
  - ตอบกลับ API Response ด้วยมาตรฐาน (`success`, `code`, `message`, `data`) พร้อม Code ที่ถูกกำหนดใน `codes.yaml`

## Testing Strategy
- **Backend:** ทดสอบด้วย Native Node.js Test Runner (`node --test`) ทดสอบ Controller, Service และ Repository โดย Mock Data ให้ครอบคลุมทุกเคส Error (รวมทั้ง Validation และ Optimistic Locking)
- **Frontend:** ทดสอบการแสดงผล Table, การแสดงผล Form, และ Smart Dropdown Filtering ผ่าน Browser Testing 

## Boundaries
- **Always do:** 
  - บังคับใช้ Tenant Scoping (`ou_id` & `branch_id`) เมื่ออ่านเขียนข้อมูล `agent_fees`
  - รองรับ Pagination ใน API GET List
  - ส่ง HTTP Status Code ที่แท้จริงกลับไป (ไม่ใช่ 200 ทั้งหมด)
- **Ask first:**
  - ถ้ามีความจำเป็นต้องเปลี่ยนโครงสร้าง Database Schema สำหรับ `agent_fees` หรือใช้ตัวแปรชื่ออื่น
  - ถ้าต้องการให้ Backend เชื่อมต่อ DB `777ww-prod` แบบถาวร (มี Connection String แยกต่างหากหรือไม่?)
- **Never do:**
  - Hard Delete ข้อมูลในระดับ Master Data (แต่ Hard Delete ได้เฉพาะ `agent_fees` ตาม Spec)
  - ลืมตรวจสอบ Duplicate Validation `branch_id` + `game_company_id` + `game_main_cate_id` ก่อนบันทึกข้อมูล

## Success Criteria
- [ ] Backend API จัดการ Fee: ครอบคลุม `GET (List)`, `POST (Create)`, `PATCH (Update)`, และ `DELETE (Hard Delete)` ใน Path `/api/v1/agents/:agentId/fees`
- [ ] Backend API Master Data: สร้าง Route กลางแยกต่างหากเป็น `/api/v1/master-data/game-companies` และ `/api/v1/master-data/game-categories` 
- [ ] ทดสอบการทำ Optimistic Locking สำเร็จ: 
  - ลืมส่ง Header `If-Match` ➔ ได้รับ `428 PRECONDITION_REQUIRED`
  - เซฟทับข้อมูลที่ถูกคนอื่นแก้ไปแล้ว ➔ ได้รับ `412 VERSION_CONFLICT`
- [ ] Frontend UI ประกอบด้วยตารางและ Form (Modal/Dialog) รองรับ Validation และ Smart Dropdown Filtering 
- [ ] การบันทึกข้อมูลที่ซ้ำกัน (Company + Category คู่เดิมของสาขาเดิม) ถูกบล็อคไม่ให้เพิ่มลงฐานข้อมูล

## Open Questions
- (ไม่มีคำถามตกค้าง ทุกอย่างได้รับการยืนยันเรียบร้อยแล้ว)
