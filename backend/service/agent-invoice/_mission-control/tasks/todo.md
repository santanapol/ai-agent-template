## Task 1: Backend Setup & Master Data API
**Description:** สร้างโครงสร้างโฟลเดอร์สำหรับ `agent-fees`, เชื่อมต่อ Source DB (`777ww-prod`), และทำ API สำหรับ GET Master Data (Companies/Categories)
**Acceptance criteria:**
- [x] โฟลเดอร์และไฟล์ `src/modules/agent-fees/*` ถูกเตรียมไว้
- [x] สามารถเชื่อม DB ทั้งสองฝั่งพร้อมกันได้
- [x] มี API `/api/v1/master-data/game-companies` และ `game-categories` ที่คืนค่าข้อมูล Master Data ได้
**Verification:**
- [x] ยิง API ผ่าน cURL / Postman คืนค่า `200 SUCCESS` พร้อมข้อมูล `data` ถูกต้อง
**Dependencies:** None
**Estimated scope:** Medium

---

## Task 2: Backend GET Agent Fees API
**Description:** สร้าง API ค้นหาและดึงรายการ Agent Fees พร้อมแบ่งหน้า (Pagination) และตรวจสอบ Tenant Isolation
**Acceptance criteria:**
- [x] Endpoint `GET /api/v1/agents/:agentId/fees` สามารถทำงานได้
- [x] รองรับ `page` และ `limit`
- [x] บังคับผูก `ou_id` และ `branch_id` จาก Context/Auth
**Verification:**
- [x] รัน API และตรวจสอบว่าข้อมูลที่ดึงมามีเฉพาะของสาขาตัวเอง
**Dependencies:** Task 1
**Estimated scope:** Small

---

## Task 3: Frontend Agent Fees Table UI
**Description:** สร้าง API Client, ดึงข้อมูลจาก Task 1-2 มาแสดงเป็นตารางในหน้า Agent Details
**Acceptance criteria:**
- [x] มี API Clients ฝั่ง Frontend สำหรับ GET Fees และ Master Data
- [x] ตารางแสดงข้อมูลอย่างถูกต้อง (Mapping ค่า Game Company ID กับชื่อ)
- [x] Pagination หน้าบ้านกดเปลี่ยนหน้าได้
**Verification:**
- [x] เปิดหน้า UI ตรวจสอบความถูกต้องของข้อมูลในตาราง และทดลองเปลี่ยนหน้า
**Dependencies:** Task 1, 2
**Estimated scope:** Medium

---

## Task 4: Backend POST Agent Fee API
**Description:** สร้าง API สำหรับเพิ่มข้อมูล Agent Fee พร้อมตรวจสอบ Validation (Duplicate check)
**Acceptance criteria:**
- [x] ถ้ามีการบันทึกซ้ำ (Branch + Company + Category คู่เดิม) จะต้องคืนค่า `409 DUPLICATE`
- [x] ค่าถูกเซฟลง `agent_fees` ใน Target DB พร้อม Audit fields
**Verification:**
- [x] ยิง POST ซ้ำกัน 2 ครั้ง ครั้งที่สองต้องโดน 409
**Dependencies:** Task 1
**Estimated scope:** Small

---

## Task 5: Frontend Create Form Modal
**Acceptance criteria:**
- [ ] ผู้ใช้กด "สร้าง" แล้วมี Modal ขึ้นมาให้เลือก Company, Category และกรอกราคา
- [ ] Category Dropdown ต้องกรองเอาตัวเลือกที่ผูกกับ Company นี้ในตารางไปแล้วออกไป
**Verification:**
- [ ] ถ้าสร้าง Category "SLOT" ไปแล้ว ครั้งต่อไปที่เปิด Modal ตัวเลือก SLOT ต้องหายไป
- [ ] สร้างข้อมูลสำเร็จ ตารางโหลดข้อมูลใหม่ (Refresh) อัตโนมัติ
**Dependencies:** Task 3, Task 4
**Estimated scope:** Medium

---

## Task 6: Backend PATCH & DELETE APIs
**Description:** สร้าง API อัปเดตและลบ Agent Fee โดยบังคับการทำ Optimistic Locking
**Acceptance criteria:**
- [x] ถ้าลืมส่ง `If-Match` มา จะต้องเตือน `428 PRECONDITION_REQUIRED`
- [x] ถ้า ETag ไม่ตรงกับ `upd_date` ใน DB ให้เตือน `412 VERSION_CONFLICT`
- [x] ลบแบบ Hard Delete ออกจาก Database
**Verification:**
- [x] จำลองยิง PATCH ด้วย ETag ปลอม ต้องโดนเตะ 412
**Dependencies:** Task 4
**Estimated scope:** Medium

---

## Task 7: Frontend Edit/Delete Actions
**Description:** เพิ่มปุ่ม Action ในตารางเพื่อให้แก้ไขหรือลบค่าธรรมเนียมได้
**Acceptance criteria:**
- [x] ผู้ใช้สามารถกดลบ (มีแจ้งเตือน Confirm) และส่ง `If-Match` ETag ไปให้ Backend ลบสำเร็จ
- [x] ผู้ใช้สามารถกด Edit, แก้ไขข้อมูล, และส่ง `If-Match` ETag ไปให้ Backend เซฟสำเร็จ
- [x] ถ้าระบบจับได้ว่าถูกเซฟทับ UI ต้องแสดง Popup แจ้งให้รีเฟรชข้อมูล
**Verification:**
- [x] ทดสอบความสมบูรณ์การแก้-ลบ
- [x] จำลองเปิด 2 Browser แก้ข้อมูลเดียวกัน คนหลังต้องโดนเตือน (Optimistic Locking UI Check)
**Dependencies:** Task 5, Task 6
**Estimated scope:** Medium
