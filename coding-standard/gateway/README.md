# Gateway Standards

มาตรฐานสำหรับ **API Gateway Service** ทำหน้าที่เป็นด่านหน้าสุดในการรับ Request, ตรวจสอบ JWT (Auth Gate) และทำ Proxy ส่งต่อไปยัง Internal Services

---

## 📂 โครงสร้างไฟล์ 10 หมายเลขสากล (Universal Numbering)

ไฟล์มาตรฐาน Gateway ถูกแบ่งหมวดหมู่โดยล้อตามหมายเลข 1-10 ของระบบ Auth เพื่อความเป็นระเบียบ ดังนี้:

| ไฟล์ | หมวดหมู่ / เนื้อหาหลัก |
| :--- | :--- |
| **`1-tech-stack.md`** | ข้อกำหนดการใช้ ESM, `fastify-http-proxy`, `jose`, `redis` และ `node --test` |
| **`2-folder-structure.md`** | โครงสร้างโฟลเดอร์สำหรับ Proxy Service แบบบางเบา |
| **`3-api-routing.md`** | กฎการทำ Routing ไปยัง Upstream และการจับ Error |
| **`4-request-headers.md`** | ลำดับ Headers ที่ Gateway ต้อง Inject และส่งต่อให้ Upstream |
| **`5-security-and-validation.md`** | นโยบาย JWT Verification และ `token_gen` Revocation Gate |
| **`6-api-response-codes.md`** | กฎการพ่น Error กลับหา Client ด้วย RFC 7807 |
| **`7-openapi-contract.md`** | การประกาศ Contract ของ Gateway |
| **`8-openapi-validation.md`** | การใช้ Spectral Linter สำหรับตรวจสอบ Contract |
| **`9-operations-and-deployment.md`** | การทำ Health/Ready Check และกฎการรันสคริปต์ |
| **`10-observability-and-logging.md`** | นโยบายการซ่อน Upstream Error และการ Forward `x-request-id` |

### 🛠️ Gateway Extensions (ส่วนขยายเฉพาะ)
| ไฟล์ | หมวดหมู่ / เนื้อหาหลัก |
| :--- | :--- |
| **`11-code-quality.md`** | กฎ Linter, Prettier และ Git Hooks |
