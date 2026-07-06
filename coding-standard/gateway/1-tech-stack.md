# 1. Tech Stack & Environment

## ⚡ ข้อกำหนดพิเศษของ Gateway
Gateway Service เป็นด่านหน้าที่ต้องรับ Traffic จำนวนมากและทำตัวเป็น Proxy จึงมี Tech Stack ที่ปรับจูนมาโดยเฉพาะดังนี้:

| หัวข้อ | กฎข้อบังคับ (Rule) |
| :--- | :--- |
| **Module System** | **[Required] ต้องใช้ ESM** (`"type": "module"`) และโครงสร้าง `import`/`export` (สอดคล้องกับ Auth) |
| **Framework & Proxy** | **[Required]** ใช้ `fastify` ร่วมกับปลั๊กอิน `@fastify/http-proxy` เป็นแกนหลักสำหรับการส่งต่อ (Route/Proxy) |
| **Security & Caching** | **[Required]** ใช้ `jose` สำหรับยืนยันความถูกต้องของ JWT และใช้ `redis` เพื่อตรวจสอบการถูกระงับสิทธิ์ (Revocation) |
| **Testing** | **[Required]** เพื่อความสอดคล้องกับมาตรฐานของ Auth บังคับให้ใช้ **Node Native Test Runner (`node --test`)** แทน Jest |

## 📦 การจัดการ Package และ Environment
| หัวข้อ | กฎข้อบังคับ (Rule) |
| :--- | :--- |
| **Node Version** | **`>=24 <25`** (บังคับระบุใน `engines.node` ของ `package.json`) |
| **Package Manager** | ใช้ **`npm`** เท่านั้น |
| **Timezone (`TZ`)** | **`UTC`** ในทุก Environment แบบไม่มีข้อยกเว้น |
