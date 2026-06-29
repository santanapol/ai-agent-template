# UI/UX Design - Staff Management Dashboard

เอกสารนี้รวบรวมรายละเอียดการออกแบบ User Experience (UX) และ User Interface (UI) สำหรับฟีเจอร์ **Staff Management** ในระบบ Zero Platform

## 1. Overview & Layout

**Target Audience:**
- **Staff Management:** `platform_admin`, `branch_admin`
- **My Profile:** ผู้ใช้ที่ login แล้วทุก role (รวม `staff`) — ต้องมี staff profile ผูกกับ `user_id` แล้ว

**Goal:** จัดการโปรไฟล์พนักงาน (admin: CRUD + lifecycle; ผู้ใช้ทั่วไป: แก้ข้อมูลติดต่อตัวเอง)

### 1.1 Global Layout
- **Authentication:** หน้า Login (Username + Password) เพื่อยืนยันตัวตนผ่านบริการ `auth` ก่อนเข้าสู่ Dashboard
- **Sidebar Navigation:** ซ้ายมือ (กว้าง 250px) — เมนูงานหลักเท่านั้น
  - **Dashboard** — ทุก role
  - **Billing / Staff / Reports / Settings** — ตาม role และ permission mapping
  - *(ไม่แสดง My Profile ใน sidebar — ดู §7.5)*
- **Top App Bar:** ด้านบนสุด แสดง Context ของผู้ใช้งานปัจจุบัน ได้แก่
  - ชื่อผู้ใช้งาน (จาก staff profile หรือ username)
  - บทบาท (`role`)
  - สาขาปัจจุบัน (ชื่อสาขา หรือ branch switcher สำหรับ OU-wide roles)
  - **Avatar** — initials จากชื่อ (§7.4) + dropdown (§7.5)
- **Main Content Area:** พื้นที่ตรงกลางและขวาสำหรับแสดงผลหน้าจอการทำงาน

---

## 2. Authentication: Login Page

เนื่องจาก Zero Platform ใช้งานเป็น Back-office จึงต้องมีการ Login ก่อนเข้าถึงระบบ (ยึดตามข้อมูล `domain.md` ว่า Login ใช้ `username` + `password` ผ่าน `auth`)

### 2.1 Layout & UI
- **Layout:** วางกล่อง Login ไว้กึ่งกลางหน้าจอ (Center Card) พื้นหลังสะอาดตา (สี Gray-50 หรือภาพกราฟิกเรียบๆ)
- **Header:** โลโก้ Zero Platform และข้อความ "Sign in to your account"
- **Form Fields:**
  - `Username`: Text Input (Required)
  - `Password`: Password Input พร้อมปุ่ม 👁️ (Show/Hide Password)
- **Actions:**
  - `[ Sign In ]`: ปุ่ม Primary ขนาดใหญ่เต็มกล่อง
- **Feedback:**
  - แสดง Error message สีแดงด้านบน Form หรือใต้ Input กรณี Username/Password ไม่ถูกต้อง (เช่น "Invalid username or password")
  - ไม่มีปุ่ม "Register" หรือ "Forgot Password" สำหรับ MVP เนื่องจากเป็น Internal System (ให้ติดต่อ Platform Admin)

---

## 3. Main Page: Staff List (Table View)

พื้นที่แสดงรายชื่อพนักงาน เน้นแสดงผลข้อมูลจำนวนมากในรูปแบบ Data Grid

### 2.1 Header & Toolbar
- **Page Title:** "Staff Management"
- **Primary Action:** ปุ่ม Primary สีฟ้า `[+ Add New Staff]` อยู่ขวาบน
- **Search Box:** ช่องกรอกข้อความ `[ 🔍 Search code, name, username... ]` (เชื่อมกับพารามิเตอร์ `q` ใน API)
- **Filters:**
  - `Status Dropdown`: [ Active / Archived / All ] (ค่าเริ่มต้นคือ Active)
  - `Branch Dropdown`: แสดงเฉพาะเมื่อผู้ใช้เป็น `platform_admin` (ค่าเริ่มต้นคือ All Branches)

### 2.2 Data Table Columns
| Column Name | Data Source / Mapping | UI Format |
| :--- | :--- | :--- |
| **Code** | `code` | Text ปกติ |
| **Name** | `firstname` + `lastname` | Text ตัวหนาเล็กน้อย |
| **Username** | `username` (จาก `auth_users`) | Text สีเทาอ่อน (Secondary) |
| **Email** | `email` | Text ปกติ |
| **Tel** | `tel` | Text (E.164 format) |
| **Status** | `status` | UI Badge (🟢 Active / 🔴 Archived) |
| **Actions** | N/A | Icon buttons: ✏️ (Edit), 📦 (Archive/Restore) |

### 2.3 Pagination
- แถบควบคุมด้านล่างตาราง: `[ < Prev ] [ 1 ] [ 2 ] [ 3 ] [ Next > ]`
- ตัวเลือก Items per page: `10, 20, 50`

---

## 3. Create Staff Profile (Slide-over Panel)

เมื่อคลิก `[+ Add New Staff]` หน้าต่างจะเลื่อนออกมาจากขอบขวาจอ (Slide-over / Drawer) เพื่อไม่ให้ผู้ใช้เสีย Context ของข้อมูลตารางที่ดูอยู่

### 3.1 Form Fields
- **Staff Details:**
  - `Code`: Text Input (Max 32 chars, Required)
  - `Firstname`, `Lastname`: Text Input (Max 128 chars)
- **Contact Info:**
  - `Email`: Text Input (Type: Email)
  - `Tel`: Text Input — รูปแบบ E.164 (เช่น `+66812345678`)
- **Login credentials** *(planned)*:
  - `Username`: Text Input (Required) — Global unique login ID
  - `Password` / `Confirm password`: `Input.Password` — required, min 16
- **Auth user:** ไม่มีฟิลด์เลือก User — provision อัตโนมัติ (ดู `api-mapping.md`)

### 3.2 Footer Actions
- `[ Cancel ]` (ปุ่ม Secondary) ปิด Slide-over
- `[ Create Profile ]` (ปุ่ม Primary) บันทึกข้อมูล

---

## 4. Edit Staff Profile (Slide-over Panel)

หน้าตา UI เหมือนหน้า Create แต่มีการล็อกฟิลด์ที่ไม่สามารถแก้ไขได้ตาม Business Rules

### 4.1 Form Fields (Edit State)
- **Read-only (Disabled):** 
  - `User Account Selection` (ห้ามเปลี่ยน User ผูก)
  - `Code` (รหัสพนักงานผูกกับสาขา แก้ไขไม่ได้ทาง UI)
- **Editable:**
  - `Firstname`, `Lastname`, `Email`, `Tel`
- **Reset password** *(planned)* — section แยกจาก Save:
  - `New password` / `Confirm password` (optional — ว่าง = ไม่เปลี่ยน)
  - ปุ่ม `[ Update password ]` + confirm modal (user signed out everywhere)
  - ซ่อนเมื่อแก้ profile ของตัวเอง (`user_id === session.sub`)

*หมายเหตุ:* ระบบต้องแนบค่า `upd_date` ล่าสุดไปกับ Header `If-Match` เสมอ เพื่อทำ Optimistic Concurrency

---

## 5. Archive & Restore Actions (Modal Dialog)

ป้องกันความผิดพลาดจากการกดเปลี่ยนสถานะโดยไม่ได้ตั้งใจ

### 5.1 Archive Dialog
เมื่อคลิกไอคอน 📦 (Archive) บนพนักงานที่มีสถานะ Active
- **Title:** Archive Staff Profile?
- **Description:** "Are you sure you want to archive this staff member? Their active session will be revoked immediately and they will need to log in again if restored."
- **Actions:** 
  - `[ Cancel ]`
  - `[ 🔴 Archive ]` (Destructive Button สีแดง)

### 5.2 Restore Dialog
เมื่อคลิกไอคอน 📦 (Restore) บนพนักงานที่มีสถานะ Archived
- **Title:** Restore Staff Profile?
- **Description:** "This profile will become active again. The user must log in to create a new session."
- **Actions:** 
  - `[ Cancel ]`
  - `[ 🟢 Restore ]` (Success Button สีเขียว)

---

## 6. Feedback & Notification System (Toast)

- **Success:** แจ้งเตือนเมื่อ Create, Update, Archive หรือ Restore สำเร็จ (เช่น "Profile successfully created.")
- **Error (General):** แสดง Error message ใต้ Input field ทันที (Real-time Validation) หรือแสดง Toast สีแดงถ้าบันทึกไม่สำเร็จ
- **Error (Conflict / 412 Precondition Failed):** เนื่องจากระบบใช้ Optimistic Concurrency (`upd_date` / `If-Match`) หากแอดมินพยายามบันทึกข้อมูลทับกับคนอื่นที่เพิ่งแก้ไป ระบบต้องแสดง Modal หรือ Toast เตือนชัดเจนว่า *"This profile has been updated by another user. Please refresh and try again."*
- **Error (Archive Edge Case):** กรณี API แจ้งรหัส 503 (Mongo เก็บค่าสำเร็จแต่ Auth Revoke ล้มเหลว) ให้แสดง Toast แจ้งเตือน: *"Profile archived, but session revoke is pending. Please try revoking the session again later."*

---

## 7. Additional Pages & Components

### 7.1 View Staff Profile (Read-Only Mode)
ก่อนที่จะกดเข้าสู่หน้า Edit แอดมินควรสามารถกดดูรายละเอียด (View Details) ได้
- **Trigger:** คลิกที่แถว (Row) ของตาราง หรือไอคอน 👁️ (View)
- **UI:** แสดง Slide-over Panel คล้ายหน้า Edit แต่ฟิลด์ทั้งหมดเป็น Read-only ไม่มีปุ่ม Save
- **Action:** มีปุ่ม `[ Edit Profile ]` เพื่อสลับเป็นโหมดแก้ไขได้ทันที

### 7.2 Empty States & Loading States (Data Table)
- **Loading State:** แสดง Skeleton Loader (โครงสร้างแถวสีเทา) ระหว่างที่รอโหลดข้อมูลจาก API หรือตอนเปลี่ยนหน้า Pagination
- **Empty State (No Data):** กรณีไม่เคยมีพนักงานเลย แสดงภาพประกอบโล่งๆ พร้อมข้อความ "No staff profiles found. Get started by adding a new staff member."
- **Empty State (Search/Filter Not Found):** กรณีค้นหา `q` หรือ Filter แล้วไม่เจอข้อมูล แสดงข้อความ "We couldn't find any staff matching your criteria." พร้อมปุ่ม `[ Clear Filters ]`

### 7.3 Dashboard Home (Placeholder)
- หน้าแรก (Home) ทันทีที่ล็อกอินเข้ามา
- **MVP UI:** แสดงข้อความ "Welcome to Zero Platform Admin" แบบคลีนๆ เนื่องจากใน MVP นี้เราเน้นที่ Staff Management เป็นหลัก ยังไม่มี Chart หรือ Dashboard สรุปข้อมูลซับซ้อน

### 7.4 My Profile (`/profile`)

หน้าเต็ม (Full page Card) ไม่ใช่ Drawer — สำหรับผู้ใช้ดูและแก้ข้อมูลตัวเอง

**Implementation:** `src/pages/MyProfile.tsx`

#### Layout
- **Page title:** "My Profile"
- **Subtitle:** อธิบายว่าแก้ contact details ได้ แต่ Staff Code เปลี่ยนไม่ได้
- **Avatar:** แสดง initials จากชื่อ (อัปเดต header ทันทีหลัง Save)
- **Secondary action:** `[ Refresh ]` โหลดข้อมูลใหม่จาก API

#### Read-only context (`Descriptions`)
- Login username (`profile.user.username`)
- System role (`profile.user.role`)
- Profile status (`profile.status`)

#### Form fields
| Field | Editable | Notes |
| :--- | :--- | :--- |
| Staff Code | ไม่ (disabled) | แสดงค่าปัจจุบันเท่านั้น |
| First Name, Last Name | ใช่ | Required |
| Email | ใช่ | Email validation |
| Telephone | ใช่ | E.164 ฝั่ง API |

#### Actions
- `[ Save Changes ]` — Primary, ส่ง PATCH พร้อม `If-Match`

#### Change password card *(planned)*
- Section **Change password** — `Current password`, `New password`, `Confirm password`
- `[ Change password ]` → `POST /auth/me/password` — success → logout

#### States
- **Loading:** `Spin` ครอบ Card
- **No profile (404):** แสดงข้อความ error สีแดง — ไม่มีฟอร์ม (ต้องมี admin สร้าง profile ให้ user ก่อน)
- **Conflict (412):** Toast แนะนำ Refresh

### 7.5 User Dropdown & Logout (Top App Bar)
- **User Dropdown:** คลิก Avatar มุมขวาบน
- **Actions:**
  - `[ My Profile ]` → `/profile`
  - `[ Logout ]` → ออกจากระบบ กลับ `/login`

### 7.6 Error Pages (Fallback UI)
- **403 Forbidden (Access Denied):**
  - แสดงเมื่อผู้ใช้งานพยายามเข้าถึงหน้าที่สิทธิ์ (Role) ไม่ถึง หรือพยายามเข้าจัดการข้อมูลของสาขาอื่น
  - **UI:** ไอคอนกุญแจล็อค, ข้อความ "You don't have permission to access this page." พร้อมปุ่ม `[ Go Back ]`
- **404 Not Found:**
  - แสดงเมื่อผู้ใช้เข้า URL ที่ไม่มีอยู่จริงในระบบ
  - **UI:** ภาพประกอบ 404, ข้อความ "Page not found." พร้อมปุ่ม `[ Go to Dashboard ]`
- **500 Internal Server Error:**
  - แสดงเมื่อระบบพบปัญหาที่ฝั่ง Backend หรือ Gateway ร่ม
  - **UI:** ภาพแจ้งเตือน, ข้อความ "Something went wrong on our end." พร้อมปุ่ม `[ Try Again ]` หรือแนะนำให้ติดต่อ Support

## 8. Definition of Done (DoD) & Success Metrics (การวัดผล UX)

เพื่อให้มั่นใจว่างานออกแบบ UX/UI บรรลุเป้าหมายทางธุรกิจ นี่คือเกณฑ์ความสำเร็จที่ต้องวัดผลร่วมกับทีมพัฒนา:
- **Task Success Rate:** แอดมินสามารถสร้างโปรไฟล์พนักงาน และระบุข้อมูลถูกต้อง (Validation ผ่าน) ได้สำเร็จมากกว่า 95% ของความพยายามทั้งหมด
- **Time on Task:** เวลาเฉลี่ยที่ใช้ในการค้นหาพนักงานและกดแก้ไขข้อมูลต้องน้อยกว่า 30 วินาทีต่อครั้ง
- **Error Recovery:** หากแอดมินเจอข้อผิดพลาด (เช่น กรอกอีเมลผิดรูปแบบ หรือเจอ 412 Conflict) ต้องสามารถแก้ไขและบันทึกข้อมูลใหม่สำเร็จ 100% โดยไม่ต้องขอความช่วยเหลือจาก Support

## 9. Supplementary Documents

สำหรับรายละเอียดเชิงลึกเพิ่มเติมเกี่ยวกับการออกแบบและ UX กรุณาดูเอกสารต่อไปนี้:
- [Sitemap & User Flows](./sitemap-and-flows.md) - โครงสร้าง URL และเส้นทางการใช้งาน
- [UX Writing Guidelines](./ux-writing.md) - โทนภาษาและคำศัพท์มาตรฐาน
- [Frontend API Mapping](./api-mapping.md) - การเชื่อมโยง UI Action กับ Backend API Endpoints
- [Password UI spec](./design-password-management.md) - Create / reset / self-service *(planned)*
