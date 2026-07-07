# 5. API Integration

การเชื่อมต่อกับ Backend หรือ Gateway จะใช้ `axios` เป็นตัวหลัก และต้องมีการแยกฝั่งของ Client ให้ชัดเจน

## 🔌 API Clients (`lib/`)
- ให้สร้างไฟล์แยกตามโดเมนของการเรียกข้อมูล เช่น `authApiClient.ts` (เรียกไปหา Auth Service) และ `staffApiClient.ts` (เรียกไปหา Service อื่นๆ)
- **การแนบ Token (Header Injection):** ต้องสร้างฟังก์ชัน `setAccessToken` รับค่า Token เอาไว้ไปใส่ใน `axios.defaults.headers.common['Authorization']` 

## 🛡️ Interceptors & Auto Refresh Token
- ทุก Client (ยกเว้นเรื่อง Login) จะต้องมีการดักจับ Error ระดับ Global ผ่าน Axios Interceptor (`axios.interceptors.response.use`)
- เมื่อ API ตอบกลับมาว่า `401 Unauthorized` ให้ใช้ Interceptor ทำการเรียกใช้ฟังก์ชัน **Refresh Token** อัตโนมัติ (ผ่าน callback ที่ผูกไว้) หากสำเร็จให้แนบ Token ใหม่แล้วยิง Request ซ้ำแบบไร้รอยต่อ
