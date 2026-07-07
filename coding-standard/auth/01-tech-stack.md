# 1. Tech Stack & Environment

## ⚡ ข้อกำหนดพิเศษของ Auth (ข้อยกเว้นจาก Backend)
ข้อบังคับหลักที่ Auth Service จะแตกต่างจากบริการภายใน (Internal Services) มีดังนี้:

| หัวข้อ | กฎข้อบังคับ (Rule) |
| :--- | :--- |
| **Module System** | **[Required] ต้องใช้ ESM** (`"type": "module"`) และใช้โครงสร้าง `import`/`export` เท่านั้น (แตกต่างจาก Backend ทั่วไปที่เป็น CommonJS)<br>*หมายเหตุ: จะต้องมีการเขียน ADR ระดับทีมอ้างอิงไว้ใน Repo ของบริการด้วย* |
| **Framework** | **[Required]** ใช้ `fastify` เป็น Core Framework (แทน Express) พร้อมกับ `@fastify/rate-limit` |
| **Security & JWT** | **[Required]** ใช้ `argon2` สำหรับ Hash รหัสผ่าน และ `jose` สำหรับการจัดการ JWT (แทน jsonwebtoken) |
| **Caching** | **[Required]** ใช้ `redis` สำหรับเก็บและจัดการ `token_gen` |
| **Testing** | **[Required]** บังคับใช้ Node Native Test Runner (`node --test`) แทน Jest และใช้ `c8` ในการวัด Coverage |

## 📦 การจัดการ Package และ Environment
| หัวข้อ | กฎข้อบังคับ (Rule) |
| :--- | :--- |
| **Node Version** | **`>=24 <25`** (บังคับระบุใน `engines.node` ของ `package.json`) |
| **Package Manager** | ใช้ **`npm`** เท่านั้น (พร้อมระบุ `packageManager` ใน `package.json` ผ่าน Corepack) |
| **.npmrc** | ต้องตั้งค่า **`engine-strict=true`** เพื่อบังคับการล็อกเวอร์ชัน Node ให้เข้มงวด |
| **Timezone (`TZ`)** | **`UTC`** ในทุก Environment แบบไม่มีข้อยกเว้น |
| **Environment** | `NODE_ENV` ต้องเป็น `production`, `development`, หรือ `test` เท่านั้น |
| **Secrets** | ดึงค่าผ่าน ENV เท่านั้น **[Forbidden]** ห้าม Commit รหัสผ่านหรือ Secret ลงใน Git เด็ดขาด |
