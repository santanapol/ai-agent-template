# 2. API Routing & Proxy

กฎการทำ Routing ของ Gateway ไปยัง Upstream (Internal Services)

## นโยบายการตรวจสอบ Routing
| สถานการณ์ | HTTP | `code` (ถ้ามี problem body) | ข้อกำหนด (Rule) |
| :--- | :--- | :--- | :--- |
| **Route Not Found** (Client ยิง Path ที่ไม่ตรงกับ Route Table ที่ Gateway ตั้งไว้) | **`404`** | ไม่บังคับ | **[Forbidden]** ห้ามส่ง `GATEWAY_ROUTE_NOT_CONFIGURED` เพื่อป้องกันการเปิดเผย Topology ภายใน |
| **Route Misconfigured** (Operator ตั้งค่า Path หรือ Upstream ผิดพลาด เช่น ว่างเปล่าหรือไม่สมบูรณ์ตาม ADR) | **`502`** | `GATEWAY_ROUTE_NOT_CONFIGURED` | **[Required]** ใช้จับข้อผิดพลาดระดับ Configuration ภายใน Gateway เองเท่านั้น |

## Access token `token_gen` (เมื่อ `REDIS_URL` ตั้งค่า)

| หัวข้อ | ข้อกำหนด (Rule) |
| :--- | :--- |
| **Redis key** | อ่าน `user:{sub}:token_gen` หลัง verify JWT |
| **Missing key** | **[Required]** fail-closed — ปฏิเสธด้วย `GATEWAY_JWT_REJECTED` (ไม่ถือว่า generation = `0`) |
| **Stale claim** | JWT `token_gen` < Redis value → `GATEWAY_JWT_REJECTED` |
