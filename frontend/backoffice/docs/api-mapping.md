# Frontend API Mapping

ตารางสรุปการเชื่อมต่อระหว่าง Frontend Actions กับ Backend API Endpoints (อิงจากเอกสาร `domain.md` และ `architecture.md` ของ Staff Service)

## 1. Base Configuration
- **Base Path:** `/api/v1/staff/profiles`
- **Client:** `src/lib/staffApiClient.ts` (Axios + Bearer token จาก `AuthContext`)
- **Request Headers:**
  - `Authorization: Bearer <Token>` (Gateway แปลงเป็น `x-user-id`, `x-user-ou`, `x-user-branch`, `x-user-role`)
  - `Content-Type: application/merge-patch+json` (จำเป็นสำหรับ `PATCH`)
  - `If-Match: W/"<base64url(upd_date ISO)>"` (จำเป็นสำหรับ PATCH, Archive, Restore — อ่านจาก response header `ETag` ของ GET ล่าสุด)

## 2. Staff Management (`/staff`) — Admin only

**สิทธิ์ UI:** `platform_admin`, `branch_admin` เท่านั้น (เมนูซ่อนสำหรับ role อื่น)

| Frontend UI / Action | HTTP Method | API Endpoint | Description / Notes |
| :--- | :--- | :--- | :--- |
| **โหลดข้อมูลลงตาราง** (Table List) | `GET` | `/api/v1/staff/profiles` | Query: `q`, `status`, `branchId`, `page`, `limit`, `sort` |
| **กดดูรายละเอียด** (View Details) | `GET` | `/api/v1/staff/profiles/{id}` | คืน `ETag` ใน response header |
| **กดสร้างพนักงาน** (Create) | `POST` | `/api/v1/staff/profiles` | Body: `code`, `firstname`, `lastname`, `email`, `tel`, **`password`** (required, min 16) — **ไม่ส่ง `user_id`** |
| **กดบันทึกการแก้ไข** (Save Changes) | `PATCH` | `/api/v1/staff/profiles/{id}` | Contact fields + `If-Match` — **ไม่** รวม password |
| **อัปเดตรหัสผ่าน** (Reset password) | `POST` | `/api/v1/staff/profiles/{id}/password` | Body: `password`, `revoke_sessions?` — ปุ่มแยกจาก Save Changes |
| **กดยืนยัน Archive** (Archive Modal) | `POST` | `/api/v1/staff/profiles/{id}/archive` | ไม่มี Body; ต้องมี `If-Match` |
| **กดยืนยัน Restore** (Restore Modal) | `POST` | `/api/v1/staff/profiles/{id}/restore` | ไม่มี Body; ต้องมี `If-Match` |

## 3. My Profile (`/profile`) — ทุก role ที่ login

**หน้า:** `src/pages/MyProfile.tsx`  
**สิทธิ์:** ผู้ใช้ที่ login แล้วทุก role (`platform_admin`, `branch_admin`, `staff`, …)  
**ข้อกำหนด:** ต้องมี document ใน `auth_staff_profiles` ที่ `user_id` ตรงกับ JWT claim `sub` — มิฉะนั้น API คืน `404 RESOURCE_NOT_FOUND`

| Frontend UI / Action | HTTP Method | API Endpoint | Description / Notes |
| :--- | :--- | :--- | :--- |
| **โหลดโปรไฟล์ตัวเอง** (เปิดหน้า / Refresh) | `GET` | `/api/v1/staff/profiles/by-user/{userId}` | `{userId}` = `user.sub` จาก session; เก็บ `ETag` สำหรับ PATCH |
| **บันทึกการแก้ไข** (Save Changes) | `PATCH` | `/api/v1/staff/profiles/{id}` | Body: `firstname`, `lastname`, `email`, `tel` เท่านั้น — **ไม่ส่ง `code`**; backend ละเว้น `code` เมื่อเป็น self-service |
| *(ไม่ใช้)* | — | Archive / Restore / List | My Profile ไม่เรียก lifecycle หรือ list |

### 3.1 Self-service vs admin PATCH

| ฟิลด์ | My Profile (own) | Staff Management (admin) |
| :--- | :--- | :--- |
| `code` | Read-only (ไม่ส่งใน PATCH) | Create: required; Edit: read-only ใน UI |
| `firstname`, `lastname`, `email`, `tel` | Editable | Editable |
| `user_id` / auth user | Read-only (Descriptions) | ไม่แสดงในฟอร์ม create (provision อัตโนมัติ) |

### 3.2 Error codes ที่ UI จัดการ

| `code` | หน้า | การแสดงผล |
| :--- | :--- | :--- |
| `RESOURCE_NOT_FOUND` | My Profile | ข้อความโหลดไม่สำเร็จ — มักแปลว่ายังไม่มี staff profile ผูกกับ account |
| `VERSION_CONFLICT` | ทั้งสอง | แจ้งให้ Refresh แล้วลองบันทึกใหม่ |
| `DUPLICATE` | Staff Management | Staff code ซ้ำในสาขา |
| `STAFF_AUTH_REVOKE_PENDING` | Staff Management | Archive สำเร็จแต่ revoke session ค้าง |

## 4. Password — Auth client (`authApiClient`)

**Client:** `src/lib/authApiClient.ts` · Proxy `/auth` → auth service (ไม่ผ่าน staff)

| Frontend UI / Action | HTTP Method | API Endpoint | Description / Notes |
| :--- | :--- | :--- | :--- |
| **เปลี่ยนรหัสตัวเอง** (My Profile) | `POST` | `/auth/me/password` | Body: `current_password`, `new_password` — success → logout → `/login` |

รายละเอียด: [`design-password-management.md`](./design-password-management.md) · [`../../auth/docs/design-password-management.md`](../../auth/docs/design-password-management.md)