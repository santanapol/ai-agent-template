# Task Breakdown: Agent Fee CRUD

- [x] **Task 1: Project Skeleton & GET API (List Fees)**
  - สร้างโครงสร้างไฟล์ใน `src/modules/agent-fees/` (`*.route.js`, `*.controller.js`, `*.service.js`, `*.repository.js`, `*.schema.js`)
  - ร่าง JSON Schema สำหรับ Path params (`agentId`)
  - พัฒนา `Repository`: ฟังก์ชัน `getFeesByAgentId(agentId)`
  - พัฒนา `Service`: นำข้อมูลมาประมวลผล
  - พัฒนา `Controller` & `Route`: รองรับ `GET /api/v1/agents/:agentId/fees`
  - **Verification:** เรียก GET ต้องได้ Array ของ Fee พร้อม HTTP 200

- [ ] **Task 2: POST API (Create Fee)**
  - สร้าง JSON Schema สำหรับ Request Body (`company_id`, `main_cate_id`, `fee_rate`)
  - พัฒนา `Repository`: `createFee(data)` 
  - พัฒนา `Service`: ตรวจสอบ Unique (`agent_id, company_id, main_cate_id`) และเพิ่ม `cr_*`, `upd_*`
  - พัฒนา `Controller` & `Route`: รองรับ `POST /api/v1/agents/:agentId/fees`
  - **Verification:** เรียก POST ต้องบันทึกสำเร็จ (HTTP 201), ถ้าสร้างซ้ำต้องได้ HTTP 409 Conflict

- [ ] **Task 3: PATCH API (Update Fee)**
  - สร้าง JSON Schema สำหรับ Request Body (`fee_rate`, `upd_date`)
  - พัฒนา `Repository`: `updateFee(feeId, data, updDateForLocking)`
  - พัฒนา `Service`: จัดการ Logic เช็ค Optimistic Lock และอัปเดต `upd_*`
  - พัฒนา `Controller` & `Route`: รองรับ `PATCH /api/v1/agents/:agentId/fees/:feeId`
  - **Verification:** ส่ง `upd_date` ถูกต้องแก้ไขสำเร็จ, ส่งไม่ตรงต้อง Error (HTTP 409/412)

- [ ] **Task 4: DELETE API (Hard Delete Fee)**
  - สร้าง JSON Schema สำหรับ Validation
  - พัฒนา `Repository`: `deleteFee(feeId, agentId)`
  - พัฒนา `Service` & `Controller` & `Route`: รองรับ `DELETE /api/v1/agents/:agentId/fees/:feeId`
  - **Verification:** เรียก DELETE ลบสำเร็จ (HTTP 204 หรือ 200) และ GET ดูต้องไม่เจอ
