# Spec: Smart Report Service

> **Feature specs (ย่อย):** [Script Compiler, Validate & Test Run](./SPEC-script-compiler-validation.md) · [Plan](./PLAN-script-compiler-validation.md) *(อนุมัติแล้ว)*

## Objective
เราต้องการพัฒนา Backend Service ใหม่ชื่อ **`smart-report`** เพื่อรองรับระบบดึงข้อมูลรายงานอัตโนมัติ ช่วยลดภาระการรัน Query ดึงข้อมูลของ staff ในแต่ละวัน
- **ผู้ใช้:** Staff ทั่วไปที่มีหน้าที่ดาวน์โหลดรายงาน และ Admin/Developer ที่สามารถเพิ่ม/แก้ไขสคริปต์ Query
- **เป้าหมาย:** สั่งรันสคริปต์ JavaScript MongoDB Query, ตั้งเวลาประมวลผลอัตโนมัติ (Daily, Weekly, Monthly), ส่งออกผลลัพธ์เป็น CSV และ Excel เก็บใน Local Storage ของเซิร์ฟเวอร์เพื่อให้เข้าดาวน์โหลดได้โดยตรง

---

## Tech Stack
- **Runtime:** Node.js (>=24 <25)
- **Framework:** Fastify (v5)
- **Database Driver:** `mongodb` (v7)
- **Script Sandbox Execution:** Node.js built-in `vm` module
- **Scheduler:** `node-cron`
- **File Exporters:** `json2csv` (สำหรับ CSV) และ `exceljs` (สำหรับ Excel)
- **Linting & Formatting:** ESLint (v9) + Prettier (v3)

---

## Commands
```bash
# พัฒนา (Development)
npm run dev

# เริ่มทำงานระบบจริง (Production Start)
npm start

# รันระบบทดสอบ (Run Tests)
npm test

# ตรวจสอบโค้ด (Lint & Format Check)
npm run lint
npm run format:check
```

---

## Project Structure
```
backend/service/smart-report/
├── docs/                      # เอกสารอ้างอิงและ Requirement
├── src/
│   ├── config/                # การตั้งค่าระบบ (env, database connection)
│   ├── services/
│   │   ├── sandboxRunner.js   # โมดูลรัน JavaScript MongoDB Query ใน VM Sandbox
│   │   ├── scheduler.js       # ระบบจัดการรอบเวลาตั้งรัน (Cron Scheduler)
│   │   └── fileExporter.js    # ระบบแปลงข้อมูลเป็นไฟล์ CSV และ Excel
│   ├── routes/
│   │   ├── reports.js         # API สำหรับจัดการข้อมูลรายงาน (CRUD) และดาวน์โหลด
│   │   └── index.js
│   ├── models/
│   │   # เก็บ metadata ของรายงานและประวัติไฟล์ดาวน์โหลดใน MongoDB
│   ├── app.js                 # Fastify app setup
│   └── server.js              # Server entry point
├── tests/                     # Unit & Integration tests
├── package.json
└── eslint.config.js
```

---

## Technical Design & Code Style

### 1. Database Connection & Security
- การเก็บสคริปต์รายงานและประวัติไฟล์ดาวน์โหลด จะเก็บไว้ใน Database หลักผ่าน Primary Connection (สำหรับ CRUD)
- **การรัน Query สคริปต์:** จะถูกแยกออกไปใช้ Connection Read-only เสมอ (`MONGODB_URI_READ`) และใช้ตัวเลือก MongoDB Driver สำหรับอ่านจาก Replica Set Secondary Node (`readPreference=secondaryPreferred`) เพื่อความปลอดภัยสูงสุด

### 2. VM Sandbox Runner
เมื่อมีคำสั่งรันสคริปต์ ระบบจะประมวลผลด้วย Node.js `vm` module ภายใต้ Sandbox context ดังนี้:
- **Sandbox Context Variables:**
  - `ObjectId`: แผนผังจำลอง MongoDB `ObjectId`
  - `ISODate`: แผนผังจำลองและแปลงวันที่เป็น `Date` object
  - `withReport(fn)`: helper สำหรับรัน compiled script แบบ async (`withReport(async () => { return await ... })`)
  - `db`: ออบเจกต์ที่ครอบ DB Connection ซึ่งถูกจำกัดสิทธิ์เฉพาะ Read-only โดยมี `getSiblingDB(dbName)`
  - `params`: ออบเจกต์ที่เก็บ Dynamic parameters (`startDate`, `endDate`, `ou_id`, `branch_id`, ฯลฯ)
- **Runnable script:** ทุก production path รัน **`compiledScript`** ที่ AST compiler สร้างไว้เท่านั้น (ไม่มี regex transform ตอน runtime)
- **Collection wrappers:** `aggregate()` / `find()` คืน `Promise<array>`; `findOne()` คืน `Promise<object|null>`
- **Timeout:** `REPORT_SCRIPT_TIMEOUT_MS` (default **120s**) ใช้กับ manual run, test run, และ scheduler เท่ากัน

### 3. Script validation flow (UI + API)
1. **Validate** (`POST /api/v1/smart-reports/validate`) — parse + compile Booster script → `compiledScript` (ไม่เชื่อมต่อ read DB)
2. **Test Run** (`POST /api/v1/smart-reports/test-run`) — รัน `compiledScript` กับ read DB ช่วง **เมื่อวาน** → `recordCount`, `sample`, `testRunToken` (TTL 15 นาที)
3. **Save** — ต้องส่ง `compiledScript` + `testRunToken` เมื่อ `script` เปลี่ยน; update อื่นไม่ต้อง test ใหม่

Migration สำหรับ report เก่า: `npm run migrate:scripts -- --test-run --fail-on-error` (ดู `scripts/README.md`)

### 4. API Endpoints
- `GET /api/v1/smart-reports` - ดึงรายการสคริปต์รายงาน (ไม่รวม `script` / `compiledScript`)
- `GET /api/v1/smart-reports/:id` - ดึงรายละเอียดรายงาน (รวม `script`, `compiledScript`, validation fields)
- `POST /api/v1/smart-reports` - เพิ่มรายงานใหม่ (ต้อง `compiledScript` + `testRunToken`)
- `PUT /api/v1/smart-reports/:id` - แก้ไขรายงาน (gate เมื่อ `script` เปลี่ยน)
- `DELETE /api/v1/smart-reports/:id` - ลบรายงาน
- `POST /api/v1/smart-reports/validate` - compile script (no DB)
- `POST /api/v1/smart-reports/test-run` - test run compiled script (read DB)
- `POST /api/v1/smart-reports/:id/run` - สั่งรันสคริปต์รายงานทันที (Manual Trigger)
- `GET /api/v1/smart-reports/history` - ดูประวัติการรันและบันทึกไฟล์ทั้งหมด
- `GET /api/v1/smart-reports/download/:fileId` - ดาวน์โหลดไฟล์รายงาน (CSV หรือ Excel) จาก Local Storage

---

## Testing Strategy
- **Framework:** Node.js Built-in Test Runner (`node --test`)
- **Unit Tests:** ทดสอบโมดูล `sandboxRunner.js` ว่าสามารถ execute query, จัดการข้อผิดพลาดจาก code ผิดไวยากรณ์, และการจำกัดสิทธิ์ทำงานได้ถูกต้อง
- **Integration Tests:** ทดสอบ API endpoints ต่างๆ, ระบบจำลองดาวน์โหลดไฟล์, และระบบ Scheduler

---

## Boundaries
- **Always:**
  - บังคับการรัน Query สคริปต์ผ่าน Connection Read-only (`MONGODB_URI_READ`) เท่านั้น
  - รัน **`compiledScript`** เท่านั้นบน production path (manual / test-run / scheduler)
  - ตั้งเวลา Timeout ใน VM Sandbox ด้วย `REPORT_SCRIPT_TIMEOUT_MS` (default 120s)
  - Save ต้อง verify `testRunToken` เมื่อ `script` เปลี่ยน
- **Ask first:**
  - การลงทะเบียนพอร์ตระบบภายนอกเพิ่มเติมใน Gateway
- **Never:**
  - อนุญาตให้ใช้โมดูล Node.js อื่นๆ เช่น `fs`, `http`, `process` ภายใน VM Sandbox (ปิดกั้นการเข้าถึง Module Core ทั้งหมด)

---

## Known Limitations / Accepted Risks
- **No tenant isolation on report metadata:** `reports` และ `download_history` collections ไม่มีฟิลด์ `ou_id`/`branch_id` และ query ฝั่ง API (`findReports`, `findDownloadHistory`, `getDownloadFile`) ไม่ scope ตาม tenant — รายชื่อรายงาน, ประวัติการรัน และไฟล์ export มองเห็น/ดาวน์โหลดได้โดยทุก branch/org ที่ผ่าน gateway
- **No role-based authorization differentiation:** `x-user-role` (`staff` / `branch_admin` / `platform_admin`) ถูก validate ว่ามีค่าและอยู่ใน enum เท่านั้น (`src/plugins/user-context.js`) แต่ไม่ถูกใช้แยกสิทธิ์ต่อ endpoint — ทุก role สร้าง/แก้/ลบ/รัน report script และดาวน์โหลดไฟล์ได้เท่ากันหมด
- **Sandbox script DB access ไม่ถูกจำกัด scope:** `db.getSiblingDB(<dbName>)` ใน `sandbox-runner.service.js` รับ `dbName` ใดก็ได้ที่ connection แบบ read-only เข้าถึงได้ ไม่มี allowlist และไม่มีการบังคับ filter `ou_id`/`branch_id` ในตัว query — ผู้เขียน script ต้องใส่ filter เหล่านี้เอง

**เหตุผล:** เป็นการจงใจ replicate workflow เดิมที่ staff ใช้ MongoDB client (Mongobooster) รัน Query เองอยู่แล้ว (ดู `docs/raw-requirment.md`) — ยอมรับความเสี่ยงนี้ไว้ ณ ตอนนี้ ให้ทบทวนใหม่หาก threat model หรือกลุ่มผู้ใช้ของระบบเปลี่ยนไป (เช่น เปิดให้ branch staff ทั่วไปใช้งานในวงกว้างขึ้น)

---

## Success Criteria
- ระบบสามารถ inject ค่าตัวแปรวันที่และไอดีผ่าน `params.*` เข้าไปใน sandbox context ของสคริปต์ได้อย่างถูกต้อง
- ผลลัพธ์หลังการรันสคริปต์ สามารถแปลงเป็นไฟล์ CSV และ Excel ได้อย่างสมบูรณ์แบบ
- มี Scheduler คอยทริกเกอร์ตามเวลาที่ผู้ใช้ตั้งจาก UI Dropdown โดยอัตโนมัติ
- ไฟล์ CSV และ Excel ถูกเก็บบน Local Server และสามารถดาวน์โหลดผ่านหน้าระบบได้ตลอดเวลา
