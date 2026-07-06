# 6. API Response Codes (RFC 7807)

## มาตรฐานการส่ง Error กลับหา Client
เพื่อความสอดคล้องกับมาตรฐานของระบบ Backend และ Auth **[Required]** `[Automated by Spectral]` เมื่อ Gateway จำเป็นต้องปฏิเสธ Request ด้วยตัวเอง (ไม่ได้ Proxy มาจาก Upstream) จะต้องส่ง Response กลับไปในรูปแบบ **RFC 7807 (`application/problem+json`)** เสมอ

### สถานการณ์ที่ Gateway ต้องสร้าง RFC 7807 ด้วยตัวเอง
| กรณี | HTTP Status | Problem `code` | คำอธิบาย |
| :--- | :--- | :--- | :--- |
| **JWT ถูกปฏิเสธ (Revoked / Invalid)** | `401 Unauthorized` | `GATEWAY_JWT_REJECTED` | ตรวจสอบ JWT ล้มเหลว หรือ Generation ถูกระงับใน Redis |
| **เชื่อมต่อ Upstream ไม่สำเร็จ** | `504 Gateway Timeout` | `GATEWAY_UPSTREAM_TIMEOUT` | Upstream ไม่ตอบสนองภายในเวลาที่กำหนด |
| **ตั้งค่า Route ผิดพลาด** | `502 Bad Gateway` | `GATEWAY_ROUTE_NOT_CONFIGURED` | เส้นทางถูกกำหนดในระบบแต่ Upstream Config หายไป |

> **[Forbidden]** ห้ามส่ง Error กลับไปเป็น Plain Text หรือ HTML เด็ดขาด เพื่อให้ฝั่ง Client สามารถนำ Response ไป Decode ด้วยโมเดล RFC 7807 ได้อย่างปลอดภัย
