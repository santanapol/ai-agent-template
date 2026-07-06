# 4. Request Headers & Cookies

## ลำดับ Headers ที่เชื่อถือได้ (Canonical Trusted Header Order)
สำหรับการเชื่อมต่อภายใน (Internal/Mesh) **ที่ Auth Service ต้องส่งต่อบริบทผู้ใช้ไปยัง Downstream หรือ Gateway** หากมีการอ้างอิง Headers ชุดนี้ใน OpenAPI หรือตัวอย่าง HTTP **ต้องเรียงลำดับจากบนลงล่างดังนี้เสมอ** (สามารถข้ามตัวที่ไม่ได้ใช้งานได้ แต่ห้ามสลับลำดับตัวที่เหลือ):

1. **`x-gateway-secret`** (สำหรับ Caller ยืนยันตัวตน)
2. **`x-user-ou`** (Organization Unit ID)
3. **`x-user-branch`** (Active / working Branch ID จาก JWT `branch_id`)
4. **`x-user-home-branch`** (Home Branch ID จาก JWT `home_branch_id` — **optional** เมื่อ claim ไม่มีใน token รุ่นเก่า)
5. **`x-user-id`** (User ID)
6. **`x-user-role`** (Role แบบ Opaque String)
7. **`If-Match`** (สำหรับ ETag / Conditional updates)
8. **`x-request-id`** (และต่อด้วย Header ทั่วไปอื่นๆ เช่น `Content-Type`, `Accept`)

> **[Forbidden]** ไม่อนุญาตให้มีการส่งค่า Headers สำคัญเหล่านี้แบบซ้ำซ้อนหลายค่า (Duplicate Headers) หากพบให้ Reject เป็น 400 หรือ 401 ทันที

## การจัดการ Cookies
| รายการ | ข้อกำหนด (Rule) |
| :--- | :--- |
| **Refresh Token (Cookies)** | **[Recommended]** ควรตั้งค่า `HttpOnly`, `Secure` และ `SameSite` ตามความเสี่ยงของแอป<br>**[Required]** หาก Dev ต้องใช้ `Secure: false` ให้ระบุไว้ใน OpenAPI และ ADR ให้ชัดเจน |
