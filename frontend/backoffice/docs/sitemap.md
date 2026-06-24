# Frontend (Backoffice) Sitemap

### 🔓 Public Pages (ไม่ต้อง Login)
- **Path:** `/login`
  - **Page:** Login (เข้าสู่ระบบ)

### 🔒 Protected Pages (ต้อง Login + Permission Guard)
- **Path:** `/`
  - **Page:** Dashboard (หน้าแรก)
  - **Permission:** `dashboard:view`
- **Path:** `/profile`
  - **Page:** My Profile (ข้อมูลส่วนตัว)
  - **Permission:** `my_profile`
- **Path:** `/invoices`
  - **Page:** Invoice List (หน้ารายการใบแจ้งหนี้)
  - **Permission:** `invoices:list`
- **Path:** `/invoices/:id`
  - **Page:** Invoice Detail (หน้ารายละเอียดใบแจ้งหนี้แต่ละใบ)
  - **Permission:** `invoices:read`
- **Path:** `/agents`
  - **Page:** Agents List (หน้ารายการตัวแทน)
  - **Permission:** `agents:list`
- **Path:** `/agents/:id/fees`
  - **Page:** Agent Fees (หน้าจัดการค่าธรรมเนียมของแต่ละตัวแทน)
  - **Permission:** `agents:fees`
- **Path:** `/smart-reports`
  - **Page:** Smart Reports (รายงานอัจฉริยะ)
  - **Permission:** `reports:smart`
- **Path:** `/staff`
  - **Page:** Staff Management (หน้าจัดการพนักงาน รวมการดูข้อมูล เพิ่ม แก้ไข และระงับไว้ในหน้าเดียว)
  - **Permission:** `profiles:list`
- **Path:** `/permissions`
  - **Page:** Permission Admin (จัดการเมนูและ role mappings)
  - **Permission:** `permissions:manage`

### ⚠️ Error Pages (หน้าแสดงข้อผิดพลาด)
- **Path:** `/403`
  - **Page:** Error 403 (ไม่มีสิทธิ์เข้าถึง)
- **Path:** `/404`
  - **Page:** Error 404 (ไม่พบหน้าที่ต้องการ)
- **Path:** `/500`
  - **Page:** Error 500 (ระบบขัดข้อง)
- **Path:** `/*`
  - **Page:** (Path อื่นๆ ที่ไม่ถูกต้อง จะถูกส่งไปหน้า `/404` อัตโนมัติ)
