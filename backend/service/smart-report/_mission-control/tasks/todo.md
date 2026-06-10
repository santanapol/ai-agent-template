# Todo List: Smart Report Service

## Task 1: Initialize Backend `smart-report` Service

**Description:** สร้างโครงสร้างโฟลเดอร์ของบริการ `smart-report` พร้อมกำหนดการตั้งค่า `package.json`, `.env.example`, Prettier, ESLint และไฟล์เริ่มต้นเซิร์ฟเวอร์

**Acceptance criteria:**
- [x] ติดตั้งสคริปต์รัน dev, start, test, lint ได้อย่างสะอาดเรียบร้อย
- [x] สคริปต์ `npm run lint` และ `npm run format:check` ผ่านโดยไม่มีข้อผิดพลาด

**Verification:**
- [x] สั่งรัน `npm run lint`
- [x] สั่งรัน `npm run format:check`

**Dependencies:** None

**Files likely touched:**
- `backend/service/smart-report/package.json`
- `backend/service/smart-report/eslint.config.js`
- `backend/service/smart-report/.env.example`
- `backend/service/smart-report/src/app.js`
- `backend/service/smart-report/src/server.js`

**Estimated scope:** Small

---

## Task 2: Database Model & Connection Setup

**Description:** จัดทำส่วนเชื่อมต่อฐานข้อมูล MongoDB โดยแยกโครงสร้างการทำงาน 2 แบบ: Primary Connection (Read/Write) สำหรับจัดการ metadata ของรายงาน และ Secondary Connection (Read-only / Secondary Node) สำหรับประมวลผล Query

**Acceptance criteria:**
- [x] เมื่อเซิร์ฟเวอร์สตาร์ท สามารถสร้าง Connection ไปยัง MongoDB ได้ทั้ง 2 Connection
- [x] จัดเก็บสคีมาของรายงาน (Report Schema) และประวัติไฟล์ดาวน์โหลด (Download History Schema) ลงใน MongoDB ได้ถูกต้อง

**Verification:**
- [x] รันเซิร์ฟเวอร์แล้วเช็ก Connection logs ของ Database ทั้งสองตัว

**Dependencies:** Task 1

**Files touched:**
- `backend/service/smart-report/src/config/database-options.js`
- `backend/service/smart-report/src/config/database.js`
- `backend/service/smart-report/src/config/database-read.js`
- `backend/service/smart-report/src/modules/reports/reports.repository.js`
- `backend/service/smart-report/src/modules/reports/download-history.repository.js`
- `backend/service/smart-report/src/app.js` (เพิ่ม `/readyz`)
- `backend/service/smart-report/src/server.js`

**Estimated scope:** Small

---

## Task 3: VM Sandbox Runner Implementation (`sandboxRunner.js`)

**Description:** สร้างระบบรันสคริปต์ JavaScript ใน Sandbox ด้วย `vm` module โดยทำการแปลง Query Command สไตล์ Mongo Shell เช่น `aggregate` และ `find` ให้ส่งคืนข้อมูลในลักษณะ Array ภายใต้ข้อจำกัดความปลอดภัย

**Acceptance criteria:**
- [x] สามารถ execute สคริปต์ aggregate/find ที่ถูกส่งเข้ามาและได้ผลลัพธ์เป็น Array
- [x] Sandbox context รองรับ `ObjectId`, `ISODate`, และคำสั่ง `db.getSiblingDB()`
- [x] มีระบบดักจับ Timeout (ไม่เกิน 30 วินาที) และห้ามใช้งานโมดูลเครื่องภายในอื่นๆ เช่น `fs`

**Verification:**
- [x] รัน Unit test: `node --test src/modules/reports/tests/integration-test/sandbox-runner.service.test.js`

**Dependencies:** Task 2

**Files touched:**
- `backend/service/smart-report/src/modules/reports/sandbox-runner.service.js`
- `backend/service/smart-report/src/modules/reports/tests/integration-test/sandbox-runner.service.test.js`

**Estimated scope:** Medium

---

## Task 4: File Exporter Implementation (`fileExporter.js`)

**Description:** พัฒนาระบบส่งออกข้อมูลผลลัพธ์ (JSON Array) ออกมาเป็นไฟล์รูปแบบ CSV และ Excel และบันทึกลงโฟลเดอร์ Local Storage บนเซิร์ฟเวอร์

**Acceptance criteria:**
- [x] สามารถแปลงข้อมูลเป็นไฟล์ CSV โดยใช้ `json2csv` ได้ถูกต้อง
- [x] สามารถแปลงข้อมูลเป็นไฟล์ Excel (.xlsx) โดยใช้ `exceljs` ได้ถูกต้อง
- [x] บันทึกไฟล์ลง Local Path ของเซิร์ฟเวอร์แบบถาวรและส่งคืนข้อมูล File path กลับมาได้ถูกต้อง

**Verification:**
- [x] รัน Unit test: `node --test src/modules/reports/tests/unit-test/file-exporter.service.test.js`

**Dependencies:** Task 3

**Files touched:**
- `backend/service/smart-report/src/modules/reports/file-exporter.service.js`
- `backend/service/smart-report/src/modules/reports/tests/unit-test/file-exporter.service.test.js`
- `backend/service/smart-report/package.json` (เพิ่ม `json2csv`, `exceljs`)

**Estimated scope:** Small

---

## Task 5: Scheduler Implementation (`scheduler.js`)

**Description:** ติดตั้ง `node-cron` เพื่อทำระบบสแกนรายงานที่มีการตั้งรอบเวลา (Daily, Weekly, Monthly) แล้วนำมารันสคริปต์โดยแทนที่ตัวแปร Dynamic Parameters (`{{startDate}}`, `{{endDate}}`) ด้วยช่วงเวลาของวันเวลาจริง และสั่งสร้างไฟล์ดาวน์โหลดอัตโนมัติ

**Acceptance criteria:**
- [x] ระบบตั้งเวลารันทำงานได้อย่างถูกต้องตามเวลาที่กำหนดในสคริปต์รายงาน
- [x] สามารถสแกนและสลับแทนที่ placeholder เช่น `{{startDate}}` ด้วย ISO String ของวันเวลาที่ต้องคำนวณจริง

**Verification:**
- [x] ทดสอบสร้างสคริปต์จำลองรันทุกๆ 1 นาที แล้วเช็กว่ามีประวัติไฟล์ดาวน์โหลดถูกบันทึกจริง

**Dependencies:** Task 4

**Files touched:**
- `backend/service/smart-report/src/modules/reports/scheduler.service.js`
- `backend/service/smart-report/src/modules/reports/tests/unit-test/scheduler.service.test.js`
- `backend/service/smart-report/src/modules/reports/tests/integration-test/scheduler.service.test.js`
- `backend/service/smart-report/package.json` (เพิ่ม `node-cron`)

**Estimated scope:** Medium

---

## Task 6: CRUD and Execution Routes (`reports.js`)

**Description:** สร้าง API Route สำหรับจัดการรายงาน (CRUD) การสั่งรันรายงานด้วยตนเองทันที (Manual run) และ API สำหรับดาวน์โหลดไฟล์รายงานที่จัดเก็บบนเครื่องเซิร์ฟเวอร์

**Acceptance criteria:**
- [x] API Endpoints CRUD สคริปต์รายงานทำงานได้ถูกต้อง
- [x] API POST `/run` สั่งให้ระบบ Query และเซฟไฟล์ทันทีได้เรียบร้อย
- [x] API GET `/download/:id` ส่งคืนไฟล์รายงานกลับไปให้ผู้ใช้ดาวน์โหลดได้จริง

**Verification:**
- [x] รัน Integration tests ของ API endpoints ทั้งหมด: `npm test` (66/66 ผ่าน)

**Dependencies:** Task 5

**Files touched:**
- `backend/service/smart-report/src/lib/error-codes.js`
- `backend/service/smart-report/src/lib/envelope.js`
- `backend/service/smart-report/src/lib/http-error.js`
- `backend/service/smart-report/src/lib/secret-compare.js`
- `backend/service/smart-report/src/lib/etag.js`
- `backend/service/smart-report/src/lib/error-handler.js`
- `backend/service/smart-report/src/lib/test-helpers/mesh-headers.js`
- `backend/service/smart-report/src/plugins/duplicate-header.js`
- `backend/service/smart-report/src/plugins/gateway-secret.js`
- `backend/service/smart-report/src/plugins/user-context.js`
- `backend/service/smart-report/src/plugins/tests/unit-test/duplicate-header.test.js`
- `backend/service/smart-report/src/plugins/tests/integration-test/guards.test.js`
- `backend/service/smart-report/src/modules/reports/reports.schema.js`
- `backend/service/smart-report/src/modules/reports/reports.service.js`
- `backend/service/smart-report/src/modules/reports/reports.controller.js`
- `backend/service/smart-report/src/modules/reports/reports.route.js`
- `backend/service/smart-report/src/modules/reports/reports.repository.js` (เพิ่ม `findReportById`, `updateReport`, `deleteReport`)
- `backend/service/smart-report/src/modules/reports/download-history.repository.js` (เพิ่ม `findDownloadHistoryById`)
- `backend/service/smart-report/src/modules/reports/tests/integration-test/reports.route.test.js`
- `backend/service/smart-report/src/app.js` (เพิ่ม guards, content-type parser fix, nested `/api/v1/smart-reports` context)

**Estimated scope:** Medium

---

## Task 7: Gateway Routing Integration

**Description:** อัปเดตและกำหนดเส้นทาง API Gateway ให้ส่งผ่าน Request ที่ขึ้นต้นด้วย `/api/v1/smart-reports` ไปยังพอร์ต `3103` ของบริการ `smart-report`

**Acceptance criteria:**
- [x] เรียกใช้งาน API ผ่าน Gateway (พอร์ตหลัก) แล้วสามารถเชื่อมต่อไปยัง `smart-report` service ได้อย่างถูกต้อง

**Verification:**
- [x] ส่ง Request เข้าพอร์ต Gateway และได้รับคำตอบจากบริการ `smart-report` — `npm test` ใน `backend/gateway` (53/53 ผ่าน รวม `routes-files-alignment`) + smoke test: build gateway app ด้วย JWT จริง (JWKS local) ชี้ `/api/v1/smart-reports` → `http://127.0.0.1:3103`, ยิง `GET /api/v1/smart-reports` ผ่าน Gateway แล้วได้ `200 {"success":true,"code":"SUCCESS","data":[]}` จาก smart-report จริง

**Dependencies:** Task 6

**Files touched:**
- `backend/gateway/routes.json`
- `backend/gateway/routes.example.json`
- `backend/gateway/.env.example`
- `backend/gateway/README.md`

**Estimated scope:** Small

---

## Task 8: Frontend API Integration

**Description:** เชื่อมต่อหน้าจอ UI Mockup (`SmartReport.tsx`) เข้ากับ API ของระบบหลังบ้านจริงผ่าน Gateway

**Acceptance criteria:**
- [x] ตารางรายงานดึงข้อมูลจริงจากระบบหลังบ้าน
- [x] สามารถคลิกปุ่ม "สร้างสคริปต์รายงานใหม่" และทำการส่งข้อมูลบันทึกลง Database ได้จริง
- [x] คลิกปุ่ม "สั่งรันทันที" แล้วระบบทำการดึงไฟล์ และดาวน์โหลดไฟล์ผลลัพธ์ CSV/Excel จริงจากเครื่องเซิร์ฟเวอร์ได้สมบูรณ์

**Verification:**
- [x] ทดลองใช้หน้าจอเว็บจริงเพื่อทำโฟลวรันรายงานทั้งหมด

  ทดสอบผ่าน Chrome DevTools MCP โดย login เป็น `platform_admin` ผ่าน Gateway (`/auth` + `/api`):
  - `GET /api/v1/smart-reports` และ `/history` คืนข้อมูลจริงจาก MongoDB (เริ่มต้นว่างเปล่า ตารางแสดง "ไม่มีข้อมูล")
  - กดปุ่ม "สร้างสคริปต์รายงานใหม่" กรอกฟอร์ม (ชื่อ, คำอธิบาย, Schedule=Manual, Output Format=CSV, query script) แล้วกด "สร้างรายงาน" → `POST /api/v1/smart-reports` คืน `201`, แถวใหม่ปรากฏในตารางทันที
  - กดปุ่ม "สั่งรันทันที" (play-circle) → `POST /api/v1/smart-reports/:id/run` คืน `200` พร้อม `download_history` record (`status: "success"`, `fileName: "smart-report-e2e-....csv"`), สถานะแถวเปลี่ยนเป็น "Completed" พร้อมเวลารันล่าสุด
  - แท็บ "ประวัติไฟล์ดาวน์โหลดทั้งหมด" แสดง record จริงพร้อมสถานะ "Success" และปุ่ม Download ใช้งานได้
  - กดปุ่ม Download → `GET /api/v1/smart-reports/download/:fileId` คืน `200` พร้อม `Content-Disposition: attachment; filename="...csv"` และ `Content-Type: text/csv` (ไฟล์ถูกดาวน์โหลดผ่าน blob)
  - กดปุ่ม "edit" แก้ไขคำอธิบายแล้วกด "บันทึกการแก้ไข" → `PUT /api/v1/smart-reports/:id` (พร้อม `If-Match`) คืน `200`, ตารางแสดงคำอธิบายใหม่
  - กดปุ่ม "delete" → modal ยืนยัน → `DELETE /api/v1/smart-reports/:id` (พร้อม `If-Match`) คืน `200`, แสดงข้อความ "ลบรายงานเรียบร้อยแล้วค่ะ" และตารางกลับเป็น "ไม่มีข้อมูล"

**Dependencies:** Task 7

**Files touched:**
- `frontend/backoffice/src/pages/SmartReport.tsx`
- `frontend/backoffice/src/lib/smartReportApiClient.ts`
- `frontend/backoffice/src/lib/smartReportApiClient.test.ts`
- `frontend/backoffice/src/types/smartReport.ts`
- `frontend/backoffice/src/lib/apiError.ts`
- `frontend/backoffice/src/lib/apiError.test.ts`

**Estimated scope:** Medium
