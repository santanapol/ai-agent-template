# Auth Standards

มาตรฐานสำหรับ **Auth Service** (ระบบจัดการการยืนยันตัวตน) ซึ่งทำหน้าที่ดูแลความปลอดภัยของการออก Token ต่างๆ

---

## 📂 โครงสร้างไฟล์ 10 หมายเลขสากล (Universal Numbering)

ไฟล์มาตรฐาน Auth ถูกแบ่งย่อยตามหมวดหมู่ 1-10 ดังนี้:

| ไฟล์ | หมวดหมู่ / เนื้อหาหลัก |
| :--- | :--- |
| **`1-tech-stack.md`** | ข้อกำหนดการใช้ `fastify`, `jose`, `argon2`, `node --test` และ `c8` |
| **`2-folder-structure.md`** | โครงสร้างโฟลเดอร์แบบ Modular / Feature-based |
| **`3-api-routing.md`** | รูปแบบ Naming Convention ของ Endpoint และการบังคับใช้ POST/DELETE |
| **`4-request-headers.md`** | กฎการห้ามรับ Header ภายในจาก Client |
| **`5-security-and-validation.md`** | การใช้ Fastify JSON Schema สำหรับตรวจสอบ Request |
| **`6-api-response-codes.md`** | กฎการตอบกลับด้วย RFC 7807 (`application/problem+json`) |
| **`7-openapi-contract.md`** | กฎการตั้งชื่อ Summary และการอ้างอิง Error ใน OpenAPI |
| **`8-openapi-validation.md`** | การใช้ Spectral Linter สำหรับตรวจสอบ Contract |
| **`9-operations-and-deployment.md`** | การทำ Health/Ready Check, Process Lifecycle และข้อห้าม Runtime |
| **`10-observability-and-logging.md`** | การส่งต่อ `x-request-id` เพื่อใช้ทำ Tracing |

### 🛠️ Auth Extensions (ส่วนขยายเฉพาะ)
| ไฟล์ | หมวดหมู่ / เนื้อหาหลัก |
| :--- | :--- |
| **`11-database-connection.md`** | กฎการเชื่อมต่อและการทำ Graceful Shutdown กับ Database |
| **`12-data-management.md`** | กฎการใช้ Soft Delete, Pagination และ Data Types |
| **`13-code-quality.md`** | กฎ Linter, Prettier และ Git Hooks |
