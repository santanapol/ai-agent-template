# 3. JWT & Security Gate (ADR-001)

Gateway ทำหน้าที่เป็น Choke Point ด่านหน้าสุดสำหรับการตรวจตั๋ว JWT ก่อนส่งต่อ

## JWT Verification & `token_gen` Revocation Gate
| Item | Rule |
| :--- | :--- |
| **JWKS / Issuer** | **[Required]** ตรวจสอบ JWT ด้วย JWKS (ผ่าน `jose`) ตรวจ Issuer และ Audience ตาม Policy |
| **`token_gen` Gate** | **[Required]** หลังจาก Verify JWT สำเร็จ Gateway **ต้อง** ตรวจสอบ Claim `token_gen` (เลขจำนวนเต็ม >= 0) เทียบกับค่าปัจจุบันใน Redis (`user:{sub}:token_gen`) |
| **การระงับสิทธิ์ (Reject)** | **[Required]** หากค่าใน JWT **น้อยกว่า** ใน Redis หรือตรวจสอบ Claim ไม่ผ่าน ให้ Reject เป็น `401 Unauthorized` ทันที ด้วยรหัส `GATEWAY_JWT_REJECTED` |
| **Redis Fail-closed** | **[Required]** หาก Redis ล่ม (Read error / Timeout) **ห้ามปล่อยผ่านเด็ดขาด (Fail-closed)** ต้องบังคับ Reject เป็น `401 GATEWAY_JWT_REJECTED` ทันที เพื่อรักษา Security Posture |
| **ค่าเริ่มต้น Redis** | หากไม่พบ Key ผู้ใช้นี้ใน Redis ให้ตีความว่า `generation` ปัจจุบัน = `0` |
