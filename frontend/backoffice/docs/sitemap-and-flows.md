# Sitemap & User Flows

เอกสารนี้แสดง Information Architecture (IA) และเส้นทางการใช้งาน (User Flow) หลักของระบบ Zero Platform ฝั่ง Frontend

## 1. Information Architecture (Sitemap)

โครงสร้าง URL Routing ของแอปพลิเคชัน:

- `/login` : หน้า Login สำหรับยืนยันตัวตน
- `/` : หน้า Dashboard หลัก (Home / Welcome)
- `/profile` : หน้า **My Profile** (ดู/แก้โปรไฟล์ของตัวเอง — ทุก role ที่ login)
- `/staff` : หน้า Staff Management (Table List) — เฉพาะ `platform_admin` / `branch_admin`
  - *(หน้า Create, Edit, View แสดงเป็น Drawer ทับบนหน้า `/staff` โดยไม่เปลี่ยน URL)*
- `/403` : หน้า Error - Forbidden (ไม่มีสิทธิ์เข้าถึง)
- `/404` : หน้า Error - Not Found (ไม่พบหน้า)
- `/500` : หน้า Error - Internal Server Error (ระบบขัดข้อง)

## 2. User Journey Flows

### 2.1 Flow การเข้าสู่ระบบ (Authentication)
`ผู้ใช้เข้าเว็บ` ➔ `แสดงหน้า /login` ➔ `กรอก Username + Password` ➔ `กด Sign In` ➔ `ระบบตรวจสอบกับ API` ➔ `สำเร็จ` ➔ `พากลับไปหน้า / (Dashboard)`

### 2.2 Flow การสร้างโปรไฟล์พนักงาน (Create Staff Profile)
`เมนู Staff Management (/staff)` ➔ `กดปุ่ม [+ Add New Staff]` ➔ `ระบบแสดง Slide-over Panel (Create)` ➔ `ค้นหาและเลือก User Account จากระบบ Auth` ➔ `กรอกข้อมูลส่วนตัวและการติดต่อ` ➔ `กดปุ่ม [ Create Profile ]` ➔ `ระบบแสดง Toast "Profile successfully created."` ➔ `ตารางรีเฟรชข้อมูลใหม่`

### 2.3 Flow การดูและแก้ไขข้อมูลพนักงาน (View & Edit Profile)
`เมนู Staff Management (/staff)` ➔ `คลิกที่รายชื่อในตาราง` ➔ `ระบบแสดง Slide-over Panel (View-Only)` ➔ `กดปุ่ม [ Edit Profile ]` ➔ `ระบบสลับเป็นโหมด Edit (ฟิลด์ Code และ User จะถูกล็อก)` ➔ `แก้ไขข้อมูล` ➔ `กดปุ่ม [ Save Changes ]` ➔ `ระบบตรวจสอบ If-Match (Optimistic Concurrency)` ➔ `สำเร็จ` ➔ `แสดง Toast Success และตารางอัปเดต`

### 2.4 Flow การระงับสิทธิ์ (Archive Profile)
`เมนู Staff Management (/staff)` ➔ `กดไอคอน 📦 (Archive) ท้ายรายชื่อ` ➔ `ระบบแสดง Modal Confirmation` ➔ `กดปุ่ม [ 🔴 Archive ]` ➔ `สำเร็จ` ➔ `แสดง Toast "Profile archived" และป้ายสถานะเปลี่ยนเป็น Archived`
*(หมายเหตุ: หาก API คืนค่า 503 แปลว่า Session revoke ไม่สำเร็จ ให้แสดง Toast แจ้งเตือนเฉพาะ)*

### 2.5 Flow ดูและแก้โปรไฟล์ตัวเอง (My Profile)
`Login สำเร็จ` ➔ `เมนู My Profile (/profile)` หรือ User dropdown ➔ `My Profile` ➔ `GET /profiles/by-user/{sub}` ➔ `แสดงฟอร์ม (Staff Code ล็อก)` ➔ `แก้ firstname / lastname / email / tel` ➔ `กด [ Save Changes ]` ➔ `PATCH /profiles/{id}` + `If-Match` ➔ `Toast "Profile updated"`

**กรณีไม่มี staff profile:** API คืน `404 RESOURCE_NOT_FOUND` — แสดงข้อความ error บนหน้า; ต้องให้ admin สร้าง profile ผูกกับ user นั้นใน Staff Management ก่อน (หรือสร้าง profile ให้ตัวเองถ้าเป็น admin)

**ข้อจำกัด:** ผู้ใช้แก้ **Staff Code ไม่ได้** แม้ส่ง `code` ใน PATCH backend จะละเว้นสำหรับโปรไฟล์ตัวเอง

### 2.6 Flow สร้าง staff พร้อมรหัสผ่าน (planned)
`Staff Management` → `Create` → กรอก Staff Code + contact + **Password / Confirm** → `POST /profiles` (รวม `password`) → Toast success → ทดสอบ login ด้วย Staff Code

### 2.7 Flow เปลี่ยนรหัสผ่าน
| Actor | Flow |
| :--- | :--- |
| **Admin** | Edit drawer → Reset password section → Confirm modal → `POST .../profiles/{id}/password` |
| **User** | My Profile → Change password card → `POST /auth/me/password` → logout → login ใหม่ |