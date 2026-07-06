# 6. Observability & Errors

## การจัดการ Upstream Errors
เพื่อรักษาความปลอดภัยและไม่เปิดเผยโครงสร้างพื้นฐานภายใน (Internal Topology) Gateway ต้องมีนโยบายจัดการ Error ดังนี้:

| สถานการณ์ | ข้อกำหนด (Rule) |
| :--- | :--- |
| **Timeout / Connection Refused** | **[Required]** ให้ตอบกลับด้วยรหัส Error มาตรฐานของ Gateway (เช่น `GATEWAY_UPSTREAM_TIMEOUT`) **ห้าม** คืนข้อความ Error ดิบจาก Upstream เด็ดขาด |
| **502 Bad Gateway / 504 Gateway Timeout** | **[Required]** สอดคล้องตาม HTTP Semantics ทั่วไป แต่ **ห้าม** ส่ง Stack trace, ชื่อ Host หรือ IP ภายในหลุดออกไปหา Client เด็ดขาด |

## การจัดการ Tracing
| รายการ | ข้อกำหนด (Rule) |
| :--- | :--- |
| **`x-request-id`** | **[Required]** Gateway มีหน้าที่ Forward ค่าเดิมไปให้ Upstream (หาก Client ส่งมา) หรือสร้าง UUID ใหม่ (หากไม่มี) เพื่อใช้ผูก Context ข้าม Service |
