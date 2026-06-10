# Spec: Smart Report Service

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
  - `db`: ออบเจกต์ที่ครอบ DB Connection ซึ่งถูกจำกัดสิทธิ์เฉพาะ Read-only โดยมี `getSiblingDB(dbName)`
  - `params`: ออบเจกต์ที่เก็บ Dynamic parameters ที่ถูก replace แล้ว
- **Auto Capture Wrapper:**
   Backend จะจำลอง method ต่างๆ บนคอลเลกชัน เช่น `aggregate()`, `find()`, `findOne()` ให้ดึงข้อมูลมาแปลงเป็น Array หรือ Object โดยอัตโนมัติ เพื่อส่งคืนให้ระบบประมวลผลเป็นไฟล์ต่อ

### 3. API Endpoints
- `GET /api/v1/smart-reports` - ดึงรายการสคริปต์รายงานทั้งหมด
- `POST /api/v1/smart-reports` - เพิ่มรายงานใหม่
- `PUT /api/v1/smart-reports/:id` - แก้ไขรายงาน
- `DELETE /api/v1/smart-reports/:id` - ลบรายงาน
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
  - ตั้งเวลา Timeout ใน VM Sandbox (เช่น ไม่เกิน 30 วินาที) เพื่อป้องกัน Query ค้างหรือทำงานไม่มีสิ้นสุด
  - ตรวจเช็ค JWT token สิทธิ์ความเป็นแอดมิน/staff ในทุกๆ Endpoint
- **Ask first:**
  - การลงทะเบียนพอร์ตระบบภายนอกเพิ่มเติมใน Gateway
- **Never:**
  - อนุญาตให้ใช้โมดูล Node.js อื่นๆ เช่น `fs`, `http`, `process` ภายใน VM Sandbox (ปิดกั้นการเข้าถึง Module Core ทั้งหมด)

---

## Success Criteria
- ระบบสามารถใช้ Template Replace แทนที่ตัวแปรวันที่และไอดีในการรันได้อย่างถูกต้อง
- ผลลัพธ์หลังการรันสคริปต์ สามารถแปลงเป็นไฟล์ CSV และ Excel ได้อย่างสมบูรณ์แบบ
- มี Scheduler คอยทริกเกอร์ตามเวลาที่ผู้ใช้ตั้งจาก UI Dropdown โดยอัตโนมัติ
- ไฟล์ CSV และ Excel ถูกเก็บบน Local Server และสามารถดาวน์โหลดผ่านหน้าระบบได้ตลอดเวลา
