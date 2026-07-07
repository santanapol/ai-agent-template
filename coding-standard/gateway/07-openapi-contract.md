# 7. OpenAPI Contract

## การเขียน OpenAPI Specification

ไฟล์ `openapi.yaml` ของ Gateway ทำหน้าที่ประกาศ Contract ด่านหน้าที่ Client จะมองเห็น 

| รายการ | ข้อกำหนด (Rule) |
| :--- | :--- |
| **Operation Summary** | **[Required]** `[Automated by Spectral]` Endpoint ของระบบต้องมี Summary ที่กำหนดเป๊ะ ๆ ได้แก่: `GET /healthz` ➔ `Liveness` และ `GET /readyz` ➔ `Readiness` |
| **Error Documentation** | **[Required]** รหัสข้อผิดพลาดทั้งหมดที่ Gateway พ่นออกไป (เช่น ปัญหาจาก JWT หรือ Routing) ต้องถูกรวบรวมและบรรยายไว้ใน OpenAPI Contract อย่างครบถ้วน |
