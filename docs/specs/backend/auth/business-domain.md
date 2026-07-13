# Auth Service — Business domain

## Metadata

| Field                | Value                                              |
| :------------------- | :------------------------------------------------- |
| **Filename**         | `business-domain.md` (this folder)                 |
| **Entry point**      | [auth-spec.md](./auth-spec.md)                     |
| **Status**           | Active — Business domain SoT (central spec folder) |
| **Parent doc**       | [technical-architecture.md](./technical-architecture.md) |
| **Document version** | `1.1.0`                                            |

| Layer                    | Document                                                       |
| :----------------------- | :------------------------------------------------------------- |
| **Business (this file)** | scope, fields, lifecycle, RBAC, HTTP intent, sequences         |
| **Technical**            | [technical-architecture.md](./technical-architecture.md)       |
| **Persistence**          | [database-erd.md](./database-erd.md)                           |
| **HTTP contract**        | [openapi.yaml](../../../../backend/auth/openapi.yaml)             |

---

## 1. Role and scope (MVP)

| In scope                                                                         | Out of scope                                        |
| :------------------------------------------------------------------------------- | :-------------------------------------------------- |
| ยืนยันตัวตนผู้ใช้ (Username + Password)                                          | จัดการสิทธิ์ระดับทรัพยากร (Resource-level AuthZ)    |
| ออก Access JWT และ Refresh Token                                                 | ทำหน้าที่ Proxy ไปยัง Business Upstream             |
| ทำ Token Rotation และ Reuse Detection                                            | จัดการข้อมูลโปรไฟล์ผู้ใช้แบบละเอียด (Staff/Profile) |
| ระบบตัดสิทธิ์การใช้งาน (Session Revocation)                                      | ระบบลงทะเบียนผู้ใช้เอง (Self-signup)                |
| **เปลี่ยนรหัสผ่านตัวเอง** (`POST /auth/me/password`)                             | Forgot-password / email reset link                  |
| **สลับ active branch** (`POST /auth/me/active-branch`) + metadata (`GET /auth/me/branch`) | Password history / complexity เกิน min length       |
| **เมนูที่ user ได้รับ** (`GET /auth/me/menus`)                                   |                                                     |
| **Dynamic permissions admin** (`/auth/admin/menus`, `/auth/admin/role-permissions`) | Resource-level AuthZ นอกเมนู registry              |
| **Internal:** provision user, ตั้งรหัส, revoke, กำหนด role                       |                                                     |

---

## 2. Data ownership

| Data               | Owner service   | This API                  |
| :----------------- | :-------------- | :------------------------ |
| **User Identity**  | `auth`          | Read / Write (Admin only) |
| **Refresh Tokens** | `auth`          | Read / Write              |
| **Audit Events**   | `auth`          | Write                     |
| **Tenant Info**    | `staff` / `org` | Read only (via DB lookup) |

---

## 3. Business model

### 3.1 User

- **Username:** Globally unique, normalized (trim + lowercase).
- **Password:** Hashed with Argon2id.
- **Role:** Assigned at creation, mapped to JWT claim.
- **Tenant Scope:** Bound to exactly one `ou_id` and `branch_id`.

---

## 4. Lifecycle

### 4.1 Login Session

1. **Issued:** เมื่อ Login สำเร็จ (Access + Refresh).
2. **Active:** จนกว่า Access จะหมดอายุ (15 นาที) หรือ Refresh จะหมดอายุ (30 วัน).
3. **Rotated:** เมื่อเรียก `/auth/refresh` (Refresh เดิมถูก Revoke, ออกคู่ใหม่).
4. **Revoked:** เมื่อ Logout หรือถูกสั่งตัดสิทธิ์จาก Internal API.

---

## 5. HTTP operations (intent — verified from `src/`)

Prefix: **`/auth/...`**, **`/internal/...`**, health/JWKS ที่ root

| Method | Path | Notes (`OBSERVED`) |
| :----- | :--- | :----------------- |
| `GET` | `/healthz` | Liveness |
| `GET` | `/readyz` | Readiness — Mongo; Redis/branch-read ถ้าตั้งค่า |
| `GET` | `/.well-known/jwks.json` | JWKS สำหรับ gateway |
| `POST` | `/auth/login` | ยืนยันตัวตนและรับ Token ชุดแรก |
| `POST` | `/auth/refresh` | แลก Access Token ใหม่; rotation + reuse detection |
| `POST` | `/auth/logout` | ยกเลิก Refresh Token ทั้ง family |
| `GET` | `/auth/me/menus` | เมนู/action keys ที่ user ได้รับ (Bearer) |
| `GET` | `/auth/me/branch` | metadata ของ active branch |
| `POST` | `/auth/me/active-branch` | สลับ active branch (role-gated) |
| `POST` | `/auth/me/password` | Self-service password change |
| `GET` | `/auth/admin/menus` | รายการเมนูทั้งหมด — ต้อง `permissions:manage` |
| `POST` | `/auth/admin/menus` | สร้างเมนู |
| `PATCH` | `/auth/admin/menus/{key}` | แก้เมนู (If-Match) |
| `DELETE` | `/auth/admin/menus/{key}` | ลบเมนู |
| `GET` | `/auth/admin/role-permissions` | ดู role → menu_keys mapping |
| `PUT` | `/auth/admin/role-permissions/{ou_id}/{role}` | upsert mapping |
| `DELETE` | `/auth/admin/role-permissions/{ou_id}/{role}` | ลบ mapping (`confirm` query) |
| `POST` | `/internal/users` | Provision user (staff caller) |
| `POST` | `/internal/users/{user_id}/password` | ตั้งรหัส (service secret) |
| `POST` | `/internal/users/{user_id}/sessions/revoke` | Revoke sessions + bump `token_gen` |
| `PATCH` | `/internal/users/{user_id}/role` | กำหนด system role |

Normative detail: [openapi.yaml](../../../../backend/auth/openapi.yaml)

---

## 6. Main flows (sequence)

### 6.1 Login & Access Flow

1. Client ส่ง Username/Password.
2. `auth` ตรวจสอบความถูกต้องและสถานะการ Lock.
3. `auth` ออก Access JWT (สั้น) และ Refresh Token (ยาว).
4. Client ใช้ Access JWT เรียก Gateway.

### 6.2 Self-service password change

1. Client (My Profile) ส่ง `POST /auth/me/password` + Bearer JWT.
2. `auth` ตรวจ `current_password` → อัปเดต hash → bump `token_gen` → revoke refresh.
3. Client **sign in again** (access/refresh เก่าใช้ไม่ได้).

รายละเอียด: [`design-password-management.md`](./design-password-management.md)

### 6.3 Internal password reset (staff caller)

1. **staff** ตรวจ RBAC แล้วเรียก `POST /internal/users/{user_id}/password`.
2. `auth` อัปเดต hash + revoke sessions (default).
3. Target user ต้อง login ใหม่.

### 6.4 Active branch switch (`POST /auth/me/active-branch`)

1. Client ส่ง `branch_id` + Bearer (+ optional refresh body/cookie).
2. `auth` ตรวจ role ใน `branch-switch-roles` และ branch access (`platform_branches` แล้ว `su_branch` ถ้ามี `MONGODB_URI_READ`).
3. **Inactive ใน OU เดียวกันอนุญาต** สำหรับ `BRANCH_SWITCH_ROLES` — ปฏิเสธเฉพาะสาขาคนละ OU / ไม่พบ / role นอกชุดสลับ.
4. **Same branch:** ออก access JWT ใหม่โดย **ไม่** bump `token_gen`.
5. **Different branch:** **`$inc access_token_gen`**, อัปเดต `active_branch_id` บน refresh row, **`SET`** Redis `user:{sub}:token_gen` — access/refresh เก่าใช้ไม่ได้ทันที (OBSERVED — `auth.service.js:1081-1265`).
6. Audit: `auth.active_branch_changed` (success) หรือ `auth.active_branch_denied` (fail).

---

## 7. RBAC (product)

### 7.1 System roles (JWT `role` claim)

`OBSERVED` — canonical list มาจาก `@zero-platform/roles` (`backend/shared/platform-roles/index.js`); enum เดียวกันถูกใช้ใน `setRoleBodySchema` + OpenAPI role enum + CI `spec:roles`

| Role               | Scope         | Admin lifecycle¹ | Branch switch² | Notes                          |
| :----------------- | :------------ | :--------------- | :------------- | :----------------------------- |
| **`platform_admin`** | OU-wide       | ✓                | ✓              | สิทธิ์สูงสุดทั้งแพลตฟอร์ม      |
| **`support_admin`**  | OU-wide       | ✓                | ✓              | support ระดับ admin ข้ามสาขา  |
| **`support`**        | OU-wide       | ✓                | ✓              | support ทั่ว OU (ไม่ pin สาขา) |
| **`branch_admin`**   | Branch-pinned | ✓                | ✗              | admin จัดการภายในสาขาที่สังกัด |
| **`staff`**          | Branch-pinned | ✗                | ✗              | พนักงานทั่วไปประจำสาขา         |

¹ `ADMIN_ROLES` (`isAdminRole`) = `platform_admin`, `branch_admin`, `support_admin`, `support`
² `BRANCH_SWITCH_ROLES` = `OU_WIDE_STAFF_ROLES` = `platform_admin`, `support_admin`, `support` (`canSwitchActiveBranchRole`)

### 7.2 Dynamic permissions (`OBSERVED` — `src/modules/admin/`, `permission-match.js`)

- **Read path:** effective permissions resolve `(ou_id, role)` → fallback `(null, role)` → `[]` deny default (`auth.service.js` — `resolveEffectivePermissions`)
- **Admin write path:** role-permission **upsert/delete รองรับเฉพาะ global mapping (`ou_id = null`)** — `ou_id !== null` ถูก reject **400** (`admin.service.js`) — **not yet supported** (OBSERVED)
- Admin APIs ต้องมี `permissions:manage` (หรือ wildcard ที่ match)
- `GET /auth/me/menus` — resolve menu tree จาก effective permissions
- Branch switch: เฉพาะ roles ใน `branch-switch-roles.js` (`support`, `support_admin`, …)

---

## 8. Audit (business events)

| `event_type`                       | When                                               |
| :--------------------------------- | :------------------------------------------------- |
| `auth.login`                       | เมื่อมีความพยายาม Login (ทั้งสำเร็จและล้มเหลว)     |
| `auth.refresh`                     | เมื่อมีการขอ Access Token ใหม่                     |
| `auth.logout`                      | เมื่อผู้ใช้สั่งออกจากระบบ                          |
| `auth.sessions_revoked_by_service` | เมื่อ Session ถูกสั่งตัดจากบริการภายนอก (Internal) |
| `auth.password_changed`            | Self-service เปลี่ยนรหัสสำเร็จ — **implemented** |
| `auth.password_reset_by_service`   | Internal/admin reset สำเร็จ — **implemented** |
| `auth.user_created_by_service`     | Internal provision user (`POST /internal/users`) |
| `auth.role_changed_by_service`     | Internal set role (`PATCH /internal/users/{id}/role`) |
| `auth.permissions_changed`         | Admin menus / role-permissions mutate |
| `auth.active_branch_changed`       | Active branch switch สำเร็จ |
| `auth.active_branch_denied`        | Branch switch ถูกปฏิเสธ (role/access) |

---

## Related documents

- [technical-architecture.md](./technical-architecture.md)
- [design-password-management.md](./design-password-management.md)
- [database-erd.md](./database-erd.md)
- [staff business-domain §3.5 Password rules](../staff/business-domain.md#35-password-rules-business--normative)
- [staff technical-architecture §5.1 Password endpoints](../staff/technical-architecture.md#51-password-endpoints)

---

## Last updated

2026-07-03 — Re-audit round 4 (/spec-bootstrap-backend re-harden): §7.1 roles → VALID_ROLES (platform_admin/branch_admin/staff/support/support_admin), design-password §3 policy aligned to validator, ERD §2.6/§2.7 admin collections, technical §5.1 full JWT claims, spec:consistency gate wired into npm run ci (green: 183 tests + 0 broken links)
2026-07-03 — Re-audit round 2: §6.4 branch switch + token_gen; §8 audit events; password min 8 aligned with validators
2026-07-03 — G1 drift patch: openapi links; §7.2 OU-specific admin write documented as not yet supported (OBSERVED)
2026-07-02 — Re-audit: full `src/` scan; §5 HTTP table synced to routes in code (admin, menus, branch)
2026-07-02 — Centralized under `docs/specs/backend/auth/`; password endpoints marked implemented per code/tests
2026-05-26 — Password management (self-service + internal reset)
