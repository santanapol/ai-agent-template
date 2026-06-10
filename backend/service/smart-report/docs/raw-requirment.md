# Smart Report Requirements

## 1. Overview & Problem Statement
ปัจจุบัน staff ต้องเปิดโปรแกรม MongoDB client (เช่น Mongobooster) เพื่อทำการรัน Query ดึงข้อมูลรายงานในทุก ๆ วัน ซึ่งกระบวนการนี้ใช้เวลาค่อนข้างนานเนื่องจากมีรายงานหลายตัว และขั้นตอนการ Query ตลอดจนการ Export ไฟล์ออกมาใช้งานค่อนข้างซับซ้อนและต้องทำซ้ำด้วยตัวเองทุกวัน

**แนวทางแก้ไข:**
ต้องการให้มีระบบดึงข้อมูลรายงานอัตโนมัติ (Smart Report) ที่ผู้ใช้สามารถนำ Query ที่ต้องการรันมาแปะ ตั้งเวลาการรันรายงานล่วงหน้า (Scheduler) และให้ระบบทำการ Export ข้อมูลเก็บไว้เพื่อให้ staff คนอื่น ๆ สามารถเข้ามากดดาวน์โหลดไฟล์รายงานไปใช้งานได้ทันที

---

## 2. Database Connection (Read-only / Secondary Node)
เพื่อหลีกเลี่ยงผลกระทบต่อประสิทธิภาพการทำงานของ Database หลัก (Primary Node) การรัน Query จากตัวรายงานทั้งหมดจะถูกบังคับให้อ่านจาก Secondary Node และใช้งานสิทธิ์ Read-only เท่านั้น โดยมีรายละเอียด Connection string ดังนี้:

```env
MONGODB_URI_READ=mongodb+srv://<REDACTED_USER>:<REDACTED_PASSWORD>@777ww-prod.xiu0o.gcp.mongodb.net/zero-platform?appName=agent-invoice
```

---

## 3. Confirmed Statement of Intent (มีนา & เบียร์)
- **ผลลัพธ์ (Outcome):** ระบบตั้งเวลาและสั่งรัน JavaScript Query Script อัตโนมัติ โดยมี UI ให้ผู้ใช้เขียนหรือแปะ Query, มีระบบ Template Replace สำหรับ Dynamic parameters และแปลงผลลัพธ์บันทึกเป็นไฟล์ CSV/Excel ไว้บน Local Server
- **ผู้ใช้ (User):** Staff ที่ต้องการสร้างรายงาน, ตั้งเวลาสั่งรันรายงาน และต้องการดาวน์โหลดรายงานประจำวัน
- **ทำไมต้องตอนนี้ (Why now):** ปัจจุบัน staff ต้องเข้าไปรัน Query ผ่าน MongoDB client เพื่อ export ข้อมูลเองทุกวัน ซึ่งใช้เวลานานและทำซ้ำๆ ทุกวัน
- **ความสำเร็จ (Success):** Staff สามารถใส่สคริปต์เพื่อตั้งเวลารัน และเข้ามาดาวน์โหลดรายงานเป็น CSV/Excel ที่รันสำเร็จแล้วผ่านหน้าระบบได้เสร็จสรรพ
- **ข้อจำกัด (Constraint):**
  - การรัน Query จากสคริปต์ทั้งหมดจะต้องบังคับอ่าน Database แบบ Secondary และ Read-only เท่านั้น ผ่าน Connection string ที่กำหนด เพื่อความปลอดภัยของ Database หลัก (`MONGODB_URI_READ`)
  - **การจับผลลัพธ์ (Query Output Capture):** Backend จะต้องทำ wrapper ครอบ JavaScript Script ที่รันให้อัตโนมัติ เพื่อดึงผลลัพธ์จาก aggregate/find cursor (เช่น แปลงเป็น Array) โดยที่ staff ไม่ต้องแก้ไขโค้ดสคริปต์
  - **การตั้งเวลารัน (Scheduler UI):** ใน UI สำหรับตั้งเวลาจะเป็น Simple UI Dropdown (เพื่อให้ staff ทั่วไปใช้งานง่าย) แล้วระบบจะแปลงเป็นรอบการรันเองเบื้องหลัง
  - **นโยบายการจัดเก็บไฟล์ (Retention Policy):** ไฟล์ CSV และ Excel ทั้งหมดที่ถูกรันโดยระบบ จะต้องบันทึกไว้ใน Local Storage ของ Server แบบถาวร (ไม่มีการ Auto-delete)
- **ไม่อยู่ในขอบเขต (Out of scope):** การอัปโหลดไฟล์รายงานขึ้น Cloud Storage (S3/GCS), การทำ Chart/Dashboard แสดงผลสถิติ, และการรองรับ Database ประเภทอื่นนอกเหนือจาก MongoDB


---

## 4. Query Template & Example (MongoDB Shell Style)
ตัวอย่างโครงสร้าง Query ที่นำมารันในระบบ ซึ่งจะใช้รูปแบบสคริปต์ JavaScript คล้าย MongoDB Shell และรองรับระบบ Template Replace สำหรับ Dynamic parameters (เช่น `startDate`, `endDate`, `ou_id`, `branch_id`):

```javascript
// --- 0. กำหนดค่าการค้นหา (Constants & Placeholders) ---
const ou_id = ObjectId("5f4f9d57266ed249e45ecef5");
const branch_id = ObjectId("5f4fb5bb3156af7a2db9e5a0");
const timezone = "+07:00"; // UTC offset จาก config ตาม branch_id

// ช่วงวันที่: คำนวณจากปฏิทินสาขา + timezone
// ตัวอย่าง: เริ่ม 2026-03-01 00:00:00.000+07 → UTC 2026-02-28T17:00:00.000Z
//          จบ 23:59:59.999+07 → UTC 2026-03-01T16:59:59.999Z
const startDate = ISODate("2026-02-28T17:00:00.000Z");
const endDate = ISODate("2026-03-01T16:59:59.999Z");

const username = null;    // Optional — exact match (staff username) ตัวอย่าง "WATCHARA_N"
const ip_address = null;  // Optional — exact match ตัวอย่าง "88.216.56.153"
const status = null;      // Optional — "Success" | "Failed" ตาม Dropdown; null = All

// --- 1. เตรียม Database Connection ---
const mainDB = db.getSiblingDB("gpp_777ww");

// --- 2. เตรียมเงื่อนไขการค้นหา (Match Query) ---
let matchQuery = {
    ou_id: ou_id,
    branch_id: branch_id,
    date: { $gte: startDate, $lte: endDate }
};

if (username) matchQuery.username = username;
if (ip_address) matchQuery.ip_address = ip_address;
if (status) matchQuery.status = status;

// --- 3. ดึงข้อมูลและประมวลผล (Execution) ---
mainDB.su_staff_login_log.aggregate([
    { $match: matchQuery },
    { $sort: { date: -1 } },
    {
        $project: {
            date: {
                $dateToString: {
                    format: "%Y-%m-%d %H:%M:%S",
                    date: "$date",
                    timezone: timezone
                }
            },
            username: "$username",
            ip_address: "$ip_address",
            status: "$status"
        }
    }
]);
```
