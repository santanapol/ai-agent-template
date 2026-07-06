# 2. API Routing & Methods

## Access token generation contract (auth ↔ gateway)
| หัวข้อ | ข้อกำหนด (Rule) |
| :--- | :--- |
| **`token_gen` claim** | **[Required]** access JWT ที่ auth ออกผ่าน `POST /auth/login` และ `POST /auth/refresh` ต้องมี claim **`token_gen`** เป็นจำนวนเต็ม >= 0 เพื่อรองรับ immediate revoke ที่ gateway |
| **Auth Claims (Header Injection)** | **[Required]** Auth Service จะต้องฝัง Claims สำคัญตอนทำ `signAccessJwt` (ได้แก่ `ou_id`, `branch_id`, `home_branch_id`, `role`, `token_gen`) เพื่อให้ API Gateway เป็นคนแกะ (Verify) และ **Inject Request Headers** (`x-user-ou`, `x-user-branch`, `x-user-home-branch` เมื่อมี claim, `x-user-role`, `x-user-id`) ให้กับ Downstream Service ต่อไป |
| **Internal revoke side-effect** | **[Required]** เมื่อ endpoint ภายใน (เช่น `POST /internal/users/{user_id}/sessions/revoke`) bump generation สำเร็จ ต้อง sync ค่า generation ปัจจุบันไป Redis key รูปแบบ **`user:{sub}:token_gen`** เพื่อให้ gateway ใช้เป็น source of truth |
| **Consistency (Redis configured)** | **[Required]** เมื่อตั้ง `REDIS_URL` แล้ว auth และ gateway ต้อง **fail-closed**: ถ้าไม่พบ key `user:{sub}:token_gen` ให้ปฏิเสธ access token (auth → `401` / gateway → `GATEWAY_JWT_REJECTED`) ไม่ถือว่า generation เป็น `0` — ป้องกัน stale token หลัง revoke หรือ branch switch ที่ bump DB แต่ publish Redis ล้มเหลว |
| **Consistency (Redis ไม่ได้ตั้ง)** | **[Required]** เมื่อไม่มี `REDIS_URL` auth ข้ามการอ่าน Redis; gateway ไม่ตรวจ `token_gen` จาก Redis |

## Security & Rate Limiting (ความปลอดภัยและการจำกัดปริมาณ)
| หัวข้อ | ข้อกำหนด (Rule) |
| :--- | :--- |
| **Transport** | **[Required]** ใช้ TLS บน Production เสมอ<br>**[Forbidden]** ห้ามส่ง Refresh Token หรือ Password ผ่าน Query String |
| **Rate Limit (HTTP)** | **[Required]** ต้องจำกัดความถี่ต่อ Client Identity (มักเป็น IP หรือ Key จาก Reverse Proxy) สำหรับ `POST /auth/login`, `POST /auth/refresh` และ `POST /auth/logout`<br>**[Required]** ต้องแยก Policy ตาม Route (ไม่ใช้ Bucket รวมกัน เพื่อป้องกันการ Refresh กินโควตาของ Login)<br>**[Required]** ระบุตัวเลข Limit ที่ชัดเจนใน OpenAPI / ADR และต้องเข้มงวดไม่น้อยกว่าค่า Default ด้านล่าง |
| **Rate Limit (Default)** | **[Recommended]** ค่าเริ่มต้นแนะนำ (ปรับเปลี่ยนได้ตาม SLO):<br>• `POST /auth/login`: **≤ 30** req/min<br>• `POST /auth/refresh`: **≤ 120** req/min<br>• `POST /auth/logout`: **≤ 60** req/min<br>*(ควรใช้ Window 1 นาที และหากเกินให้ตอบ 429 พร้อม Response Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`)* |
| **Rate Limit vs Throttle** | **[Required]** ต้องแยกชั้น **HTTP Rate Limit** (Middleware) ออกจาก **Credential Throttle** (เช่น การล็อกบัญชีเมื่อใส่รหัสผิด)<br>แม้จะตอบ `429` ได้ทั้งคู่ แต่**ต้องระบุฟิลด์แยกประเภทข้อผิดพลาดใน Response ให้ชัดเจน** (เช่น ระบุ `type` หากใช้ `problem+json` หรือระบุ `error` หากใช้ OAuth 2.0) ตามที่ได้ประกาศไว้ใน OpenAPI |
| **Enumeration** | **[Recommended]** ใช้ `enumerationGuard` หรือ `enumerationGroup` ใน `codes.yaml` เพื่อป้องกันผู้โจมตีแยกแยะได้ว่า Username นั้นมีหรือไม่มีในระบบ |
