# 7. Authentication Flow

ระบบล็อกอิน (Auth Flow) ถือเป็นหัวใจของความปลอดภัยของหน้าบ้าน มีกฎที่ต้องปฏิบัติดังนี้:

## 🔐 กระบวนการเก็บรักษา Token
- ตัว Access Token จะถูกดึงมาจาก API (เช่น `/auth/login` หรือ `/auth/refresh`) และนำมา **เก็บไว้ใน Memory (ตัวแปร State) เท่านั้น**
- **[Forbidden]** ห้ามนำ Access Token ไปเก็บไว้ใน `localStorage` หรือ `sessionStorage` โดยเด็ดขาด เพื่อป้องกันปัญหา XSS (Cross-Site Scripting)

## 🔄 Silent Refresh
- Refresh Token จะถูกส่งมาเป็น **HttpOnly Cookie** เท่านั้น
- ตอนเปิดแอปพลิเคชันขึ้นมาใหม่ (`useEffect` ใน `AuthContext`) ระบบจะต้องพยายามสั่งยิง API `refresh()` แบบเงียบๆ (Silent Refresh) เพื่อแลก Access Token ออกมา ถ้าสำเร็จถึงจะปล่อยให้เข้าหน้าแอปได้ ถ้าไม่สำเร็จให้ดีดกลับไปหน้า Login

## 👤 การถอดรหัส (Decode JWT)
- ฝั่ง Frontend จะทำการเขียนฟังก์ชันสกัดเนื้อหา Payload ออกมาจากตัว Access Token ด้วยตนเอง (ใช้ฟังก์ชัน `atob` และ `JSON.parse`) เพื่อนำข้อมูลโปรไฟล์พื้นฐาน (เช่น `username`, `roles`) มาแสดงผล โดยไม่ต้องยิง API ไปขอโปรไฟล์ใหม่ทุกครั้ง
