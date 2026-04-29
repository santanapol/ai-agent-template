# Auth Runtime Standard

มาตรฐานเกี่ยวกับการตั้งค่า Runtime, Process และ Package สำหรับ **Auth / Identity Services** 

> **หมายเหตุสำคัญ:** ค่า Default และกฎเกณฑ์ทุกอย่างที่ไม่ได้ระบุแยกในไฟล์นี้ ให้ถือว่า **อ้างอิงและสอดคล้องตามมาตรฐาน [Backend Runtime](../backend/runtime.md)** เป็นหลัก (Baseline)

---

## 1. ⚡ ข้อกำหนดพิเศษของ Auth (ข้อยกเว้นจาก Backend)

ข้อบังคับหลักที่ Auth Service จะแตกต่างจากบริการภายใน (Internal Services) มีดังนี้:

| หัวข้อ | กฎข้อบังคับ (Rule) |
| :--- | :--- |
| **Module System** | **[Required] ต้องใช้ ESM** (`"type": "module"`) และใช้โครงสร้าง `import`/`export` เท่านั้น (แตกต่างจาก Backend ทั่วไปที่เป็น CommonJS)<br>*หมายเหตุ: จะต้องมีการเขียน ADR ระดับทีมอ้างอิงไว้ใน Repo ของบริการด้วย* |

---

## 2. 📦 การจัดการ Package และ Environment

| หัวข้อ | กฎข้อบังคับ (Rule) |
| :--- | :--- |
| **Node Version** | **`>=24 <25`** (บังคับระบุใน `engines.node` ของ `package.json`) |
| **Package Manager** | ใช้ **`npm`** เท่านั้น (พร้อมระบุ `packageManager` ใน `package.json` ผ่าน Corepack) |
| **.npmrc** | ต้องตั้งค่า **`engine-strict=true`** เพื่อบังคับการล็อกเวอร์ชัน Node ให้เข้มงวด |
| **Timezone (`TZ`)** | **`UTC`** ในทุก Environment แบบไม่มีข้อยกเว้น |
| **Environment** | `NODE_ENV` ต้องเป็น `production`, `development`, หรือ `test` เท่านั้น |
| **Secrets** | ดึงค่าผ่าน ENV เท่านั้น **[Forbidden]** ห้าม Commit รหัสผ่านหรือ Secret ลงใน Git เด็ดขาด |

---

## 3. 🔄 Process Lifecycle และ NPM Scripts

- **Process Error Handling:** จัดการ `uncaughtException` และ `unhandledRejection` โดยการพ่น Log ข้อผิดพลาดออกมา แล้วสั่ง `process.exit(1)` เพื่อให้ระบบ Container สั่งรันแอปขึ้นมาใหม่
- **Graceful Shutdown:** ต้องตอบสนองต่อ Event `SIGINT` / `SIGTERM` ➔ สั่งหยุดรับ Request ใหม่ (`server.close()`) ➔ คืนค่า Database Connection ตามลำดับอย่างปลอดภัย
- **NPM Scripts:** **[Recommended]** ควรมีสคริปต์มาตรฐานเตรียมไว้เสมอ ได้แก่: `lint`, `test`, `format:check`, `ci`

---

## 🚫 ข้อห้ามเด็ดขาดระดับ Runtime (Forbidden)

- **[Forbidden]** ห้ามใช้คำสั่งซ่อนคำเตือนของระบบ (`--no-warnings`) บนเซิร์ฟเวอร์ Production เด็ดขาด
- **[Forbidden]** ห้ามเปิดใช้งาน Experimental Node Flags บน Production โดยปราศจากการเขียนเอกสาร ADR ขออนุมัติ
