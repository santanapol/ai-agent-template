# UX Writing & Copywriting Guidelines

คู่มือการใช้ภาษาและคำศัพท์ในระบบ Zero Platform Frontend เพื่อให้การสื่อสารกับผู้ใช้งานมีความเป็นมืออาชีพ ชัดเจน และสม่ำเสมอ

## 1. Tone of Voice
- **Professional & Clear:** ใช้ภาษาอังกฤษที่เป็นทางการ ชัดเจน เข้าใจง่าย
- **Direct & Action-Oriented:** ปุ่มและคำสั่งต่างๆ ควรเริ่มต้นด้วยคำกริยา (Verb) ที่บ่งบอกถึงการกระทำอย่างชัดเจน
- **Helpful & Empathetic:** ข้อความแจ้งเตือน (Error Messages) ต้องไม่โทษผู้ใช้ แต่ต้องบอกว่าเกิดอะไรขึ้น และต้องทำอย่างไรต่อไป

## 2. Standard Vocabulary (คำศัพท์มาตรฐาน)

อิงตาม Business Domain เพื่อให้ตรงกับ Backend API และแนวคิดทางธุรกิจ
- **Sign In** (ไม่ใช่ Log In)
- **Sign Out / Logout** (ใช้ Logout ในเมนู)
- **Staff Profile** (ไม่ใช่ Employee)
- **My Profile** (หน้าโปรไฟล์ตัวเอง — ไม่ใช่ "Account Settings" หรือ "User Profile" ทั่วไป)
- **Staff Code** (รหัสพนักงานในสาขา — ห้ามแก้ในหน้า My Profile)
- **Create** (ไม่ใช่ Add - ใช้เมื่อสร้างข้อมูลใหม่ลงระบบ)
- **Update / Save Changes** (ไม่ใช่ Edit สำหรับปุ่ม Submit)
- **Archive** (ไม่ใช่ Delete หรือ Deactivate - เป็นการ Soft Delete และตัด Session)
- **Restore** (ไม่ใช่ Unarchive หรือ Reactivate)

## 3. Error Messages & Empty States

### 3.1 Error Messages (Toast / Form Validation)
- ❌ **Bad:** System Error 500
- ✅ **Good:** "Something went wrong on our end. Please try again later."
- ❌ **Bad:** Conflict! Update failed.
- ✅ **Good:** "This profile has been updated by another user. Please refresh and try again."

### 3.2 Empty States
- ❌ **Bad:** No Data.
- ✅ **Good:** "We couldn't find any staff matching your criteria." (สำหรับการค้นหา)
- ✅ **Good:** "No staff profiles found. Get started by adding a new staff member." (สำหรับตารางว่างเปล่า)

### 3.3 Password

| Context | Copy |
| :--- | :--- |
| Create helper | Minimum 16 characters. |
| Reset confirm | This will sign the user out of all devices. |
| Self success | Password updated. Please sign in again. |
| Wrong current | Current password is incorrect. |
| Mismatch | Passwords do not match. |

### 3.4 My Profile
- **Page title:** "My Profile"
- **Helper text:** "View and update your staff contact details. Staff code cannot be changed."
- **Success (save):** "Profile updated"
- **Load failure (404 / ไม่มี profile):** ใช้ข้อความจาก API ถ้ามี มิฉะนั้น "Failed to load your profile"
- **Version conflict:** "Profile was modified by another session. Please refresh and try again."