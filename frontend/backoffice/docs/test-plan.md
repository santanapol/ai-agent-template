# Frontend Test Plan — Zero Platform Backoffice

อ้างอิงจาก `docs/sitemap.md`, `docs/sitemap-and-flows.md`, `docs/api-mapping.md` และโค้ดจริงใน `src/` (routing ใน `App.tsx`, role guard, และ flow ของแต่ละหน้า)

---

## 1. ขอบเขตและบัญชีทดสอบ

**Account ที่ใช้ทดสอบ:** `branch_admin` / `1234`
ตาม `App.tsx:70` role นี้ผ่าน `RoleGuard(['platform_admin', 'branch_admin'])` จึงเข้าถึง **ทุกหน้าใน sitemap ได้** (ระบบนี้ไม่มี role ที่สูงกว่า branch_admin ในส่วน UI ที่ระบุ — มีแค่ `platform_admin`/`branch_admin` ที่เห็นเมนู Staff Management)

> ⚠️ ควรเตรียม account role อื่น (เช่น `staff`) ไว้คู่กันเพื่อทดสอบ negative case ของ RBAC (ดู 4.2/R7) — ถ้าไม่มี ให้ระบุเป็น "blocked, ต้องขอ test data เพิ่ม"

## 2. สภาพแวดล้อมการทดสอบ

| รายการ | รายละเอียด |
|---|---|
| Frontend dev server | `npm run dev` → http://localhost:5174 |
| Proxy | `/auth` → `127.0.0.1:3001`, `/api` → `127.0.0.1:3002` (ต้องมี auth + gateway/staff service รันอยู่) |
| Browser | Chrome (สำหรับใช้ `browser-testing-with-devtools` ตรวจ Console/Network) |
| Unit tests ที่มีอยู่แล้ว | `npm test` (vitest) — ครอบ `useInvoices`, `useAgentFees` — รันให้ผ่านก่อนเริ่ม manual test เพื่อ baseline |

**Pre-check ก่อนเริ่ม:** เปิด Network tab ไว้ตลอดเพื่อจับ response code/`ETag`/`If-Match` header เพราะหลายหน้าใช้ optimistic concurrency

---

## 3. ลำดับการทดสอบที่แนะนำ

1. Authentication & Session
2. Routing / RBAC (เมนู, guard, error pages)
3. Dashboard
4. My Profile (รวม change password — ทำท้ายสุดของหมวดนี้เพราะจะ logout)
5. Staff Management (CRUD + lifecycle — ของหนักสุด)
6. Invoices
7. Agents & Agent Fees
8. Cross-cutting (responsive, error handling, toasts)

---

## 4. Test Cases โดยละเอียด

### 4.1 Authentication (`/login`)

| # | Steps | Expected |
|---|---|---|
| A1 | เปิด `/login` ตอนยังไม่ login | แสดงฟอร์ม Username/Password, title "Zero Platform" |
| A2 | กด Sign In โดยไม่กรอกอะไร | Validation: "Please input your username!" / password เช่นกัน |
| A3 | กรอก `branch_admin` / ผิดรหัสผ่าน | Toast error "Invalid username or password" (ตรวจ code `LOGIN_INVALID_CREDENTIALS` จาก `Login.tsx:14`) |
| A4 | กรอก `branch_admin` / `1234` แล้ว Sign In | Redirect ไป `/` (Dashboard), เห็น sidebar + role/branch ใน header |
| A5 | ลอง login ผิดซ้ำหลายครั้งติด (ถ้า backend รองรับ) | เช็ค message "Account is locked..." / "Too many attempts..." (`LOGIN_ACCOUNT_LOCKED`, `AUTH_TOO_MANY_ATTEMPTS`) — อาจ skip ถ้าจะ lock account ทดสอบจริง |
| A6 | ขณะ login ค้าง (loading) | ปุ่ม Sign In แสดง spinner, กดซ้ำไม่ได้ |
| A7 | login สำเร็จแล้วพิมพ์ `/login` ตรงๆ | ถูก redirect กลับ `/` (เพราะ `Login.tsx:31` เช็ค `user` แล้ว Navigate) |
| A8 | Refresh หน้าใดๆ ขณะ login ค้าง | Session ฟื้นจาก HttpOnly refresh cookie (ดู `AuthContext` mount effect) ไม่ถูกเด้งกลับ login |
| A9 | Logout ผ่าน user dropdown (มุมขวาบน) | Toast/redirect ไป `/login`, session cookie/token ถูกเคลียร์, กด back ไม่กลับเข้าหน้า protected |

### 4.2 Routing & RBAC

| # | Steps | Expected |
|---|---|---|
| R1 | ตรวจเมนู sidebar ด้วย `branch_admin` | เห็นครบ: Dashboard, Agent Fees, Invoices, My Profile, **Staff Management** (เพราะ `isStaffAdmin` true — `AdminLayout.tsx:17`) |
| R2 | พิมพ์ URL ตรงไปยังทุก path ใน sitemap (`/`, `/profile`, `/invoices`, `/invoices/:id`, `/agents`, `/agents/:id/fees`, `/staff`) ตอน login แล้ว | ทุกหน้าเปิดได้ ไม่เด้ง 403 |
| R3 | ลบ session แล้วพิมพ์ path ป้องกันตรงๆ เช่น `/staff` | redirect ไป `/login` (ProtectedRoute) |
| R4 | พิมพ์ path ที่ไม่มีอยู่ เช่น `/abc123` | redirect ไป `/404` |
| R5 | พิมพ์ `/403`, `/404`, `/500` ตรงๆ | แสดงหน้า error ตามชื่อ ปุ่ม/ลิงก์กลับหน้าแรกทำงาน |
| R6 | บังคับให้เกิด runtime error ใน route (ถ้าทำได้) | ตกไปที่ `RouteErrorPage` ของ `errorElement` |
| R7 | (ถ้ามี account role `staff`) login แล้วพิมพ์ `/staff` ตรงๆ | redirect ไป `/403` และเมนู Staff Management หายจาก sidebar — **สำคัญ: ต้องมี account นี้ถึงจะยืนยัน RBAC ฝั่ง negative ได้ครบ** |

### 4.3 Dashboard (`/`)

| # | Steps | Expected |
|---|---|---|
| D1 | เข้าหน้า Dashboard หลัง login | โหลด stats สำเร็จ ไม่มี error toast |
| D2 | จำลอง API stats ล่ม (ปิด backend ชั่วคราว/throttle network) | Toast "Failed to load dashboard stats" ไม่ค้างที่ spinner ตลอดไป |
| D3 | Sidebar collapse/expand | Layout responsive ไม่พัง |

### 4.4 My Profile (`/profile`)

อ้างอิง flow 2.5 และ 2.7 ใน `sitemap-and-flows.md`

| # | Steps | Expected |
|---|---|---|
| P1 | เข้า `/profile` | เรียก `GET /profiles/by-user/{sub}`, ฟอร์มแสดงข้อมูล, **Staff Code เป็น read-only** |
| P2 | กรณี account `branch_admin` ไม่มี staff profile ผูกอยู่ | แสดง error message ตาม `RESOURCE_NOT_FOUND` (`api-mapping.md §3.2`) — ถ้าเจอ ให้บันทึกว่าเป็น blocker สำหรับเทสต่อ ๆ ไปของหน้านี้ |
| P3 | กดปุ่ม reload (ปุ่มข้าง title) | โหลดข้อมูลใหม่, ปุ่ม disabled ระหว่างโหลด |
| P4 | แก้ `firstname`/`lastname`/`email`/`tel` แล้ว Save | `PATCH /profiles/{id}` พร้อม `If-Match`, Toast "Profile updated", ฟิลด์ `code` ไม่ถูกส่งไปด้วย (ตรวจใน Network tab) |
| P5 | กรอก `tel` ผิด format | Validation error ตาม placeholder `+66812345678`, maxLength 16 |
| P6 | จำลอง version conflict (แก้จากอีก session แล้วเซฟที่นี่) | แสดงข้อความแจ้ง refresh แล้วลองใหม่ (`VERSION_CONFLICT`) |
| P7 | Change password: กรอก current password ผิด | Toast "Current password is incorrect." |
| P8 | Change password: new password ตรงกับของเดิม | Toast "New password must differ from the current password." |
| P9 | Change password: new password สั้นกว่า min length | Toast "Password must be at least {N} characters." |
| P10 | Change password: กรอกถูกต้องครบ + confirm ตรงกัน | Toast "Password updated. Please sign in again." → auto logout → กลับไป `/login`, **ทดสอบ login ด้วยรหัสใหม่ทันที** |

> ⚠️ P10 จะเปลี่ยนรหัสผ่านจริงของบัญชีทดสอบ — รันเป็นลำดับสุดท้ายของ session และเตรียม rollback/แจ้งทีมที่ดูแล credential

### 4.5 Staff Management (`/staff`) — Admin only

อ้างอิง flow 2.2–2.4, 2.6–2.7

**4.5.1 List & Filter**

| # | Steps | Expected |
|---|---|---|
| S1 | เปิดหน้า | โหลดตาราง (`GET /profiles?status=active&...`), default filter = Active |
| S2 | พิมพ์ค้นหาใน Search box | Debounce 300ms ก่อนยิง API (`StaffManagement.tsx:57-63`), pagination reset เป็นหน้า 1 |
| S3 | เปลี่ยน Status filter (All/Active/Archived) | ตารางรีเฟรชตามฟิลเตอร์, pagination reset |
| S4 | เปลี่ยนหน้า/page size ของตาราง | เรียก API พร้อม `page`/`limit` ใหม่, ข้อมูลตรงกับหน้า |
| S5 | ค้นหาคำที่ไม่มีผลลัพธ์ | ตารางว่าง พร้อม empty state ปกติของ Ant Table |

**4.5.2 Create**

| # | Steps | Expected |
|---|---|---|
| S6 | กด "Add New Staff" | เปิด Drawer mode create, ฟอร์มว่าง |
| S7 | กด Create โดยไม่กรอกฟิลด์ required | Validation error ครบทุกฟิลด์ (`code, firstname, lastname, email, tel, username, password, confirmPassword`) |
| S8 | กรอก password สั้นกว่า 16 ตัวอักษร | Validation/ API error ตาม spec (`api-mapping.md`: password min 16) |
| S9 | password กับ confirmPassword ไม่ตรงกัน | Validation error |
| S10 | กรอกครบถูกต้อง + กด Create Profile | `POST /profiles` (ไม่มี `user_id`), Toast "Profile created", Drawer ปิด, ตารางรีเฟรช + pagination กลับหน้า 1 |
| S11 | สร้างด้วย `code` ที่ซ้ำในสาขา | แสดง error ตาม `DUPLICATE` |
| S12 | สร้างเสร็จแล้ว ลอง login ด้วย username/password ที่เพิ่งสร้าง (flow 2.6) | Login สำเร็จ ยืนยันว่า provisioning ผ่าน auth จริง |

**4.5.3 View / Edit**

| # | Steps | Expected |
|---|---|---|
| S13 | คลิกแถวในตาราง | Drawer เปิดเป็น View-only (ข้อมูลตรงกับตาราง) |
| S14 | กด "Edit Profile" | สลับเป็น Edit mode, **ฟิลด์ `code` และ user ถูกล็อก**, มีการดึง fresh data + ETag (`getProfileById`) |
| S15 | แก้ contact fields แล้ว Save Changes | `PATCH /profiles/{id}` พร้อม `If-Match`, Toast "Profile updated", Drawer ปิด, ตารางรีเฟรช |
| S16 | แก้แล้วปิด Drawer โดยไม่ Save | ค่าฟอร์ม reset, `currentEtag` ถูกล้าง (`handleCloseDrawer`) |
| S17 | จำลอง version conflict ระหว่างแก้ไข (แก้จากอีกที่ก่อน save) | แสดง error/toast ตาม `VERSION_CONFLICT` |
| S18 | เปิด Edit ของ profile ของผู้ใช้ปัจจุบันเอง (`editingUserId === user.sub`) | **ไม่แสดง** ส่วน "Reset password" (`showAdminResetPassword` = false ตาม `StaffManagement.tsx:164-165`) |
| S19 | เปิด Edit ของ profile คนอื่น | แสดงส่วน Reset password |

**4.5.4 Reset Password (Admin)**

| # | Steps | Expected |
|---|---|---|
| S20 | กด Update password โดยไม่กรอก newPassword | Warning "Enter a new password to update, or leave the fields empty." |
| S21 | กรอก newPassword/confirm ไม่ตรงกันหรือสั้นกว่าเกณฑ์ | Validation error, ไม่เปิด confirm modal |
| S22 | กรอกถูกต้อง → Confirm modal "Reset password?" → กด Update password | `POST /profiles/{id}/password` (`revoke_sessions: true`), Toast "Password updated", ฟิลด์รหัสผ่านถูก clear |
| S23 | กด Cancel ใน confirm modal | ไม่มีการเรียก API, ฟอร์มยังคงค่าที่กรอก |

**4.5.5 Archive / Restore (flow 2.4)**

| # | Steps | Expected |
|---|---|---|
| S24 | กดไอคอน Archive | Modal confirm "Archive Staff Profile?" พร้อมคำเตือนเรื่อง session revoke |
| S25 | กด Cancel | ไม่มีการเรียก API |
| S26 | กด Archive (ปุ่ม danger) | `getProfileById` → `POST /{id}/archive` พร้อม `If-Match`, Toast "Profile archived", สถานะในตารางเปลี่ยนเป็น Archived |
| S27 | จำลอง backend คืน 503 ตอน archive | แสดง toast แจ้งเตือนเฉพาะกรณี session revoke ไม่สำเร็จ (ตาม flow 2.4 หมายเหตุ) — อาจต้อง mock |
| S28 | เปลี่ยน filter เป็น Archived แล้วกด Restore | Modal confirm "Restore Staff Profile?" → ยืนยัน → `POST /{id}/restore`, Toast "Profile restored", สถานะเปลี่ยนกลับ Active |
| S29 | หลัง archive แล้ว ลอง login ด้วย account ที่ถูก archive | ควร login ไม่ได้ (ยืนยันว่า session revoke มีผลจริง) — ระวัง: ใช้ account ทดสอบที่สร้างขึ้นเอง อย่าใช้ของจริง |

### 4.6 Invoices (`/invoices`, `/invoices/:id`)

| # | Steps | Expected |
|---|---|---|
| I1 | เปิดหน้า Invoice List | ตารางโหลด, คอลัมน์ status แสดง Tag สี ตาม `statusTagColor` |
| I2 | ค้นหาด้วย Invoice No | ผลลัพธ์ตรงกับคำค้น |
| I3 | Filter by Branch / Status / Billing Month | ตารางอัปเดตตามฟิลเตอร์ที่เลือก, ใช้ค่าร่วมกันได้ (combination) |
| I4 | กด Generate/Create invoice (modal กรอก month + branch) แบบไม่กรอกครบ | "Please fill in required fields" |
| I5 | เปลี่ยนหน้า/page size ในตาราง | `handleTableChange` เรียก API หน้าใหม่ถูกต้อง |
| I6 | คลิกแถว → ไปหน้า `/invoices/:id` | แสดงรายละเอียด invoice: เลข `iv_no`, status tag, ตาราง transaction, ยอดรวม (สีเขียว/แดงตาม +/-) |
| I7 | เปิด invoice ID ที่ไม่มีอยู่ตรงๆ | แสดง "Invoice Not Found" + ปุ่มกลับไป `/invoices` |
| I8 | กด Export PDF | ดาวน์โหลดไฟล์ PDF, ตรวจหัวตาราง/ข้อมูล (`autoTable`) ตรงกับหน้าจอ |
| I9 | กด Export Excel | ดาวน์โหลดไฟล์ .xlsx เปิดแล้วข้อมูลตรงกัน |
| I10 | กดปุ่ม Print/อื่น ๆ ที่มี class `no-print` | UI สำหรับพิมพ์ซ่อนปุ่มที่ไม่จำเป็นถูกต้อง (ตรวจผ่าน print preview) |
| I11 | ปุ่มกลับ (ArrowLeft) จากหน้ารายละเอียด | กลับไป `/invoices` พร้อม filter/pagination เดิม (ถ้ามีการจำสถานะ) |

### 4.7 Agents & Agent Fees (`/agents`, `/agents/:id/fees`)

| # | Steps | Expected |
|---|---|---|
| G1 | เปิด Agents List | ตารางแสดง agent code (Tag น้ำเงิน), type (purple=MAIN), reference branch, สถานะ Active/Inactive |
| G2 | ค้นหาด้วย branch code/name | ผลลัพธ์กรองถูกต้อง |
| G3 | กด Sync (เลือก branch ที่ unsynced แล้วยืนยัน) | เรียก `POST /agents/sync` ด้วย `branch_id`, success/feedback ปรากฏ, ตารางรีเฟรช |
| G4 | กดปุ่ม action ที่มี `okButtonProps: { danger: true }` (เช่น ปิดใช้งาน agent) | Modal confirm แสดงปุ่ม danger, ยืนยันแล้วสถานะเปลี่ยน |
| G5 | คลิกแถว → ไปหน้า Agent Fees | โหลดรายละเอียด agent + fee matrix |
| G6 | ในหน้า Agent Fees: แก้ default fee rate (กดไอคอนแก้ไข) | เข้าโหมดแก้ไข inline, กด check บันทึกสำเร็จ ("Agent updated successfully"), กด close ยกเลิกค่าที่แก้ |
| G7 | ตั้งค่า reference agent (เลือก branch อ้างอิง) | โหลด fee ของ reference agent มาแสดง, error handling ถ้าไม่พบ ("Reference agent not found") |
| G8 | ลบ/ยกเลิกการอ้างอิง (normalize) ที่มี fees อยู่แล้ว | Modal confirm พร้อมปุ่ม danger, สำเร็จแสดง toast ตามเงื่อนไข `normalized` |
| G9 | แก้ fee matrix แล้วกด Save โดยมีค่าไม่ valid | "Invalid values:\n..." แสดงรายการ error |
| G10 | แก้ fee matrix แล้วกด Save โดยไม่มีอะไรเปลี่ยน | "No changes to save" |
| G11 | แก้ fee matrix ถูกต้อง แล้ว Save | บันทึกสำเร็จ, ตารางอัปเดต, modal confirm ก่อนยืนยัน (ถ้ามี) ทำงานถูกต้อง |
| G12 | ปุ่มกลับ (ArrowLeft) | กลับไป `/agents` |

### 4.8 Cross-cutting

| # | Steps | Expected |
|---|---|---|
| X1 | เปิด DevTools → Console ขณะไล่ทุกหน้า | ไม่มี error/warning ที่ผิดปกติ (React key warnings, unhandled rejection ฯลฯ) |
| X2 | Network tab: เช็ค auth header | ทุก request ไป `/api/...` มี `Authorization: Bearer <token>` |
| X3 | PATCH/Archive/Restore requests | มี header `If-Match` ตามที่ระบุใน `api-mapping.md` |
| X4 | ทดสอบที่ขนาดจอ ≤ breakpoint `lg` | Sider พับอัตโนมัติ, layout ไม่ overflow |
| X5 | Toast/Modal patterns | สอดคล้องกับ `docs/ux-writing.md` (ข้อความ, โทนภาษา) |
| X6 | Throttle network เป็น "Slow 3G" แล้วลองทุก action ที่มี loading state | ปุ่ม disabled ระหว่างโหลด, ไม่เกิด double submit |
| X7 | Refresh หน้ากลางคันขณะมี unsaved form (Drawer/Modal เปิดอยู่) | ตรวจว่าระบบจัดการ state ตามที่คาดไว้ (ไม่ crash, ฟอร์ม reset ตามดีไซน์) |

---

## 5. หมายเหตุ/ความเสี่ยงที่ควรแจ้งทีมก่อนเริ่ม

1. **P10 (เปลี่ยนรหัสผ่านตัวเอง)** และ **S29 (archive แล้ว login)** เป็น destructive ต่อ test account — ควรมี backup credential หรือสิทธิ์ reset
2. **R7** ต้องมี account role `staff` (หรือ role ที่ไม่ใช่ admin) เพื่อยืนยัน RBAC negative path — ถ้าไม่มี ให้ flag เป็น "ทดสอบไม่ครบ, ต้องการ test data เพิ่ม"
3. **S27** (503 session revoke) ต้องอาศัย backend จำลอง error — อาจต้องประสาน backend team หรือ mock response
4. หน้า My Profile (P2) อาจเจอ `RESOURCE_NOT_FOUND` ถ้า `branch_admin` ทดสอบไม่มี staff profile ผูกไว้ — ต้องสร้าง profile ก่อนถึงจะเทส flow แก้ไขได้ครบ

---

## 6. ผลการทดสอบ (Test Execution Results)

> ทดสอบด้วย Chrome DevTools MCP บัญชี `branch_admin` / `1234` วันที่ 2026-06-08

### สรุปภาพรวม

| Section | สถานะ | หมายเหตุ |
|---|---|---|
| 4.1 Authentication | ✅ ผ่านส่วนใหญ่ | A5/A8 บางส่วน skip ตามความเสี่ยง destructive |
| 4.2 Routing & RBAC | ✅ ผ่าน | |
| 4.3 Dashboard | ✅ ผ่าน | |
| 4.4 My Profile | ✅ ผ่าน (skip P10) | |
| 4.5 Staff Management | ✅ ผ่านส่วนใหญ่ | พบ bug เล็กน้อย |
| 4.6 Invoices | ⚠️ พบบั๊ก | duplicate toast, filter ไม่ persist |
| 4.7 Agents & Agent Fees | ⚠️ พบบั๊ก | tag color, G9 ไม่สามารถ repro ได้ตาม spec |
| 4.8 Cross-cutting | 🔴 พบบั๊กร้ายแรง | duplicate `/auth/refresh` race condition |

### 4.7 Agents & Agent Fees — ผลละเอียด (G1–G12)

| # | ผลลัพธ์ | บันทึก |
|---|---|---|
| G1 | ⚠️ พบบั๊ก | Type tag แสดงสีถูกแค่บางส่วน — ดู Bug #7 |
| G2 | ✅ PASS | |
| G3 | ✅ PASS | |
| G4 | ✅ PASS | |
| G5 | ✅ PASS | |
| G6 | ✅ PASS | inline-edit save (check icon) และ cancel (close icon) ทำงานถูกต้องทั้งคู่ |
| G7 | ✅ PASS | Modal "Set Reference Agent" มีปุ่ม Confirm สีแดง (danger) ตรงตาม spec, toast "Now referencing Vegas", banner และ Companies count อัปเดตถูกต้อง — แต่ดู Bug #8 (ตารางว่างหลัง reference) |
| G8 | ⚠️ พบบั๊ก | Modal "Remove Reference" มีปุ่ม Confirm สีน้ำเงิน (primary) ไม่ใช่สีแดง (danger) ตามที่ spec คาดหวัง — ดู Bug #9. การลบ reference ไม่แสดง toast ทันที แต่เปลี่ยนเป็น mode "Save Fees" รอ persist |
| G9 | ❌ ไม่สามารถ repro ตาม spec | กรอกค่า 150 (เกิน max=100) ถูก clamp เป็น 100 อัตโนมัติโดย spinbutton แล้วบันทึกสำเร็จ — ไม่มีทางกรอกค่า invalid ผ่าน UI ปกติได้ จึงไม่เห็นข้อความ "Invalid values:..." ดู Bug #10 |
| G10 | ✅ PASS | toast "No changes to save" ตรงตาม spec |
| G11 | ✅ PASS | แก้ค่าเป็น 15 แล้ว Save สำเร็จ, toast "All fee updates saved successfully", ตารางอัปเดตค่าใหม่ถูกต้อง |
| G12 | ✅ PASS | ปุ่ม ArrowLeft กลับไป `/agents` ถูกต้อง |

### 4.8 Cross-cutting — ผลละเอียด (X1–X7)

| # | ผลลัพธ์ | บันทึก |
|---|---|---|
| X1 | ⚠️ พบ warning | พบ Ant Design deprecation warnings บนหน้า `/agents`: `Space` `direction` deprecated (ใช้ `orientation`), `Card` `bordered` deprecated (ใช้ `variant`) — ดู Bug #11 |
| X2 | ✅ PASS | ทุก request ไป `/api/...` มี header `Authorization: Bearer <token>` ครบถ้วน |
| X3 | ✅ PASS | PUT/PATCH requests มี header `If-Match` ตามที่ระบุใน api-mapping.md |
| X4 | ✅ PASS | Sider พับเป็น icon-only ที่ขนาด ≤ ~992px (lg breakpoint) และขยายเต็มที่ > breakpoint, ไม่พบ horizontal overflow ที่ขนาดใดๆ (375px–1400px) |
| X5 | ⚠️ พบความไม่สอดคล้อง | Empty state ในตาราง Agent Fees แสดง "ไม่มีข้อมูล" (No Data) ซึ่งตรงกับตัวอย่าง ❌ Bad ใน `ux-writing.md` §3.2 (ควรใช้ข้อความที่ให้บริบท เช่น "We couldn't find any... matching your criteria") — ดู Bug #8/#12 |
| X6 | ✅ PASS | ทดสอบ throttle "Slow 3G" แล้วดับเบิลคลิกปุ่ม Sync — มีเพียง 1 request `POST .../agents/sync` ถูกส่ง, ไม่เกิด double submit |
| X7 | ✅ PASS | เปิด Staff Drawer, แก้ไข First Name เป็น "UnsavedChangeTest" (ไม่ save) แล้ว refresh หน้า — Drawer ปิด, ฟอร์ม reset, ข้อมูลเดิมไม่ถูกแก้ไข, ไม่ crash |

### 🔴 Critical finding ที่พบระหว่างทดสอบ X6/X7

ระหว่างทดสอบภายใต้ throttled network พบว่า **ทุกครั้งที่โหลดหน้าใหม่ (full navigation) ระบบยิง `POST /auth/refresh` พร้อมกัน 2 requests** — request แรกสำเร็จ (200, หมุน refresh token cookie ใหม่) ส่วน request ที่สองถูกปฏิเสธด้วย `401 TOKEN_REFRESH_REJECTED` เสมอ (เพราะ refresh token แบบ single-use ถูกใช้ไปแล้วจาก request แรก) ปรากฏการณ์นี้เกิดซ้ำในทุกหน้าที่ทดสอบ (`/agents`, `/staff`) ไม่ใช่ครั้งเดียว

ผลกระทบที่สังเกตได้จริง: ระหว่าง flow ทดสอบ ผู้ใช้ถูก **บังคับ logout กลับไปหน้า `/login` โดยไม่คาดคิด** หลังจากเกิด race condition นี้ — ต้อง sign in ใหม่เพื่อทดสอบต่อ นี่คือบั๊กที่กระทบ user experience จริงและควรแก้ไขเร่งด่วน (ดู Bug #13)

---

## 7. รายการบั๊ก/ข้อค้นพบทั้งหมด (Findings Summary)

1. **Sidebar title wrap bug** (`AdminLayout.tsx:68-70`) — ข้อความ "Zero Platform" ใน sidebar ตัดคำเป็นพยางค์แนวตั้งเมื่อ sider แคบ ดูไม่เป็นมืออาชีพ
2. **Invoice "not found" duplicate-toast bug** — เปิด invoice ที่ไม่มีอยู่จริง (ทั้ง ID รูปแบบถูกและผิด) แสดง alert/toast ข้อความเดียวกันซ้ำ 4 ครั้ง
3. **P8 untestable** — spec ระบุ password ขั้นต่ำ 16 ตัวอักษร แต่บัญชีทดสอบจริงใช้รหัสผ่าน "1234" (4 ตัวอักษร) ขัดแย้งกับ policy ที่ระบุ
4. **S27 untestable** — ทดสอบ 503 session revoke ไม่ได้เพราะไม่มีช่องทาง mock response จาก backend
5. **fill_form tool quirk** — เครื่องมือ fill_form ต่อข้อความเข้ากับของเดิมแทนที่จะแทนที่ทั้งหมด (ข้อจำกัดเครื่องมือทดสอบ ไม่ใช่บั๊กแอป)
6. **I11: Invoice search filter ไม่ถูก preserve** — เมื่อกด ArrowLeft กลับจากหน้า invoice detail ตัวกรองค้นหาที่ตั้งไว้ก่อนหน้าหายไป
7. **G1: Agent Type tag สีผิด** (`Agents/index.tsx:80`) — โค้ดเทียบ `branch_type === 'MAIN'` แต่ API ส่งค่าแบบย่อ ("MA"/"AG") ทำให้สีม่วงสำหรับ MAIN ไม่เคยแสดง (เป็นสีเทา/default เสมอ)
8. **Referenced agent's fee matrix แสดงว่างเปล่า** — เมื่อ agent อ้างอิง fee จาก agent อื่น (เช่น Vegas) ตาราง fee matrix ของตัวเองแสดง "ไม่มีข้อมูล" แทนที่จะแสดงค่า fee ของ agent ที่อ้างอิงไว้เพื่อให้ผู้ใช้เห็นค่าที่กำลังสืบทอดมา (อาจสร้างความสับสน) — ปุ่ม "Hide providers without fees" ไม่ได้ช่วยให้เห็นข้อมูลที่อ้างอิง
9. **G8: ปุ่ม Confirm ของ "Remove Reference" modal ไม่ใช่สี danger** — ขัดกับ spec ที่คาดหวังปุ่ม danger (สีแดง) สำหรับ destructive action เช่น G7's "Set Reference Agent" modal ที่ใช้ปุ่มแดงถูกต้อง แต่ "Remove Reference" กลับใช้ปุ่มสีน้ำเงิน (primary) — ไม่สอดคล้องกัน ทั้งที่เป็น action ที่มีผลกระทบสูง (ลบ fee override ทั้งหมด)
10. **G9: ไม่สามารถ trigger ข้อความ "Invalid values:..." ผ่าน UI ปกติได้** — Ant Design `InputNumber` (spinbutton) clamp ค่าที่เกิน min/max (เช่น กรอก 150 จะถูกปรับเป็น 100 ทันที) ก่อนส่งค่าไป backend ทำให้ flow validation error ตาม spec ไม่สามารถเกิดขึ้นได้จากการใช้งานปกติ — control นี้ "ป้องกัน" ผู้ใช้เกินไปจนไม่สามารถทดสอบ/พบ error message ที่ออกแบบไว้
11. **Ant Design deprecation warnings บนหน้า `/agents`** — `Space` ใช้ prop `direction` (ควรเปลี่ยนเป็น `orientation`), `Card` ใช้ prop `bordered` (ควรเปลี่ยนเป็น `variant`) ปรากฏใน console เป็น React warning (error level)
12. **Empty state copy ไม่ตรงตาม UX guideline** — ข้อความ "ไม่มีข้อมูล" (No Data) ในตาราง Agent Fees ตรงกับตัวอย่างที่ `ux-writing.md` §3.2 ระบุว่าเป็น ❌ Bad pattern (ควรใช้ข้อความที่ให้บริบทและคำแนะนำถัดไป)
13. **🔴 [Critical] Race condition: duplicate `/auth/refresh` calls ทำให้ session หลุดโดยไม่คาดคิด** — ทุกครั้งที่โหลดหน้าใหม่ ระบบยิง `POST /auth/refresh` 2 ครั้งพร้อมกัน เนื่องจาก refresh token เป็นแบบ single-use การยิงซ้ำทำให้ request ที่สองถูกปฏิเสธด้วย `401 TOKEN_REFRESH_REJECTED` เสมอ และพบว่าหลังเกิด race นี้ขึ้นซ้ำหลายครั้ง ผู้ใช้ถูกบังคับ logout โดยไม่คาดคิด (ต้อง sign in ใหม่) ควรตรวจสอบ `AuthContext` ว่ามีการเรียก refresh ซ้ำซ้อนจาก effect/mount หรือไม่ (อาจเกี่ยวกับ React 19 StrictMode double-invoke) และควรมี mutex/in-flight request deduplication

---

## 8. ข้อเสนอแนะ (Recommendations)

1. **เร่งด่วน**: แก้ race condition ของ `/auth/refresh` (Bug #13) — เพิ่ม in-flight request deduplication ใน `AuthContext`/`authApiClient` เพื่อป้องกัน duplicate refresh calls และการ logout โดยไม่คาดคิด
2. แก้ tag color logic ใน `Agents/index.tsx:80` ให้เทียบกับค่าที่ API ส่งจริง ("MA"/"AG") แทน "MAIN"
3. เปลี่ยนปุ่ม Confirm ของ "Remove Reference" modal เป็น danger style ให้สอดคล้องกับ destructive action pattern อื่นๆ ในระบบ
4. ทบทวนว่าตาราง fee matrix ควรแสดงค่าของ agent ที่ถูกอ้างอิง (read-only) แทนที่จะว่างเปล่า เพื่อ UX ที่ดีขึ้น
5. อัปเดต Ant Design props ที่ deprecated (`Space.direction` → `orientation`, `Card.bordered` → `variant`) ก่อน major version upgrade
6. ทบทวนข้อความ empty state ในตาราง Agent Fees ให้สอดคล้องกับ `ux-writing.md`
7. แก้ duplicate-toast bug บนหน้า Invoice "not found" (ปัญหาเดิมที่พบใน section 4.6)
