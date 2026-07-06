# 7. Observability & Logging

## การจัดการ Tracing
| รายการ | ข้อกำหนด (Rule) |
| :--- | :--- |
| **`x-request-id` (Tracing)** | **[Recommended]** รับค่าจาก Client หรือสร้าง UUID v4 ใหม่, ส่ง `x-request-id` (ต้องเป็นตัวเล็กทั้งหมด) ไปยัง Gateway/Downstream, ผูก Context กับ Log, และต้องมีส่งกลับใน Response Header หา Caller ด้วย |
