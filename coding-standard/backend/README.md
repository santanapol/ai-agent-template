# Backend Service Standards

มาตรฐานสำหรับพัฒนา **Backend Service** ทั่วไปภายในองค์กร 

---

## 📂 โครงสร้างไฟล์ 13 หมายเลขสากล (Universal Numbering + Extensions)

ไฟล์มาตรฐาน Backend ถูกแบ่งย่อยโดยยึดโครงสร้าง **Core 10** ตามแบบสากลของ Auth/Gateway และมีไฟล์ส่วนขยาย (11-13) เฉพาะทางของ Database:

### 🌟 Core 10 (แกนหลัก)
| ไฟล์ | หมวดหมู่ / เนื้อหาหลัก |
| :--- | :--- |
| **`1-tech-stack.md`** | ข้อกำหนดการใช้ `fastify`, ESM, `node --test` และ Native Environment |
| **`2-folder-structure.md`** | โครงสร้างโฟลเดอร์แบบ Modular / Feature-based |
| **`3-api-routing.md`** | รูปแบบ Naming Convention ของ Endpoint |
| **`4-request-headers.md`** | กฎการห้ามรับ Header ภายในจาก Client |
| **`5-security-and-validation.md`** | การใช้ Fastify JSON Schema สำหรับตรวจสอบ Request |
| **`6-api-response-codes.md`** | กฎการตอบกลับด้วย RFC 7807 (`application/problem+json`) |
| **`7-openapi-contract.md`** | กฎการตั้งชื่อ Summary และการอ้างอิง Error ใน OpenAPI |
| **`8-openapi-validation.md`** | การใช้ Spectral Linter สำหรับตรวจสอบ Contract |
| **`9-operations-and-deployment.md`** | การทำ Health/Ready Check และ Service Level Objectives |
| **`10-observability-and-logging.md`** | การจัดการ Tracing ด้วย `x-request-id` |

### 🛠️ Backend Extensions (ส่วนขยายเฉพาะ Database)
| ไฟล์ | หมวดหมู่ / เนื้อหาหลัก |
| :--- | :--- |
| **`11-database-connection.md`** | กฎการเชื่อมต่อและการทำ Graceful Shutdown กับ Database |
| **`12-data-management.md`** | กฎการใช้ Soft Delete, Pagination และ Data Types |
| **`13-code-quality.md`** | กฎ Linter, Prettier และ Git Hooks |
