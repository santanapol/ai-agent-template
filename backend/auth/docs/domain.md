# auth — Business domain (SoT)

## Metadata

| Field                | Value                                  |
| :------------------- | :------------------------------------- |
| **Filename**         | `docs/domain.md`                       |
| **Document index**   | [README.md](../README.md)              |
| **Status**           | Active — Business domain SoT           |
| **Parent doc**       | [`architecture.md`](./architecture.md) |
| **Document version** | `1.0.0`                                |

**Optional team convention** — not in [`service-tree.md`](../../../../../_coding-standards/backend/service-tree.md). Product scope, RBAC, HTTP intent, sequences. Technical mesh/env: [`architecture.md`](./architecture.md).

| Layer                    | Document                                               |
| :----------------------- | :----------------------------------------------------- |
| **Business (this file)** | scope, fields, lifecycle, RBAC, HTTP intent, sequences |
| **Technical**            | [`architecture.md`](./architecture.md)                 |
| **Persistence**          | [`db/erd.md`](./db/erd.md)                             |
| **HTTP contract**        | **`openapi.yaml`** at package root                     |

---

## 1. Role and scope (MVP)

| In scope                                                                         | Out of scope                                        |
| :------------------------------------------------------------------------------- | :-------------------------------------------------- |
| ยืนยันตัวตนผู้ใช้ (Username + Password)                                          | จัดการสิทธิ์ระดับทรัพยากร (Resource-level AuthZ)    |
| ออก Access JWT และ Refresh Token                                                 | ทำหน้าที่ Proxy ไปยัง Business Upstream             |
| ทำ Token Rotation และ Reuse Detection                                            | จัดการข้อมูลโปรไฟล์ผู้ใช้แบบละเอียด (Staff/Profile) |
| ระบบตัดสิทธิ์การใช้งาน (Session Revocation)                                      | ระบบลงทะเบียนผู้ใช้เอง (Self-signup)                |
| **เปลี่ยนรหัสผ่านตัวเอง** (`POST /auth/me/password`)                             | Forgot-password / email reset link                  |
| **Internal:** provision user + ตั้งรหัส (`POST /internal/users`, `.../password`) | Password history / complexity เกิน min length       |

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

## 5. HTTP operations (intent — before OpenAPI)

Prefix: **`/auth/...`** และ **`/internal/...`**

| Method | Path (intent)                               | Notes                                                                                    |
| :----- | :------------------------------------------ | :--------------------------------------------------------------------------------------- |
| `POST` | `/auth/login`                               | ยืนยันตัวตนและรับ Token ชุดแรก                                                           |
| `POST` | `/auth/refresh`                             | แลก Access Token ใหม่ด้วย Refresh Token                                                  |
| `POST` | `/auth/logout`                              | ยกเลิกการใช้งาน Refresh Token ทั้ง Family                                                |
| `POST` | `/auth/me/password`                         | เปลี่ยนรหัสตัวเอง — `current_password` + `new_password` — **planned**                    |
| `POST` | `/internal/users`                           | Provision user (staff create) — `username`, `password`, `role`, tenant — **implemented** |
| `POST` | `/internal/users/{user_id}/password`        | Admin/service ตั้งรหัสใหม่ — **planned**                                                 |
| `POST` | `/internal/users/{user_id}/sessions/revoke` | ตัดสิทธิ์ทุก Session ของผู้ใช้ทันที                                                      |

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

---

## 7. RBAC (product)

| Role        | Scope        | Notes                               |
| :---------- | :----------- | :---------------------------------- |
| **Owner**   | OU-level     | สิทธิ์สูงสุดในองค์กร, ลบ Branch ได้ |
| **Admin**   | OU-level     | จัดการผู้ใช้และสาขาในองค์กร         |
| **Manager** | Branch-level | จัดการงานภายในสาขาที่สังกัด         |
| **Member**  | Branch-level | พนักงานทั่วไปประจำสาขา              |
| **Billing** | Branch-level | จัดการเรื่องการเงินของสาขา          |

---

## 8. Audit (business events)

| `event_type`                       | When                                               |
| :--------------------------------- | :------------------------------------------------- |
| `auth.login`                       | เมื่อมีความพยายาม Login (ทั้งสำเร็จและล้มเหลว)     |
| `auth.refresh`                     | เมื่อมีการขอ Access Token ใหม่                     |
| `auth.logout`                      | เมื่อผู้ใช้สั่งออกจากระบบ                          |
| `auth.sessions_revoked_by_service` | เมื่อ Session ถูกสั่งตัดจากบริการภายนอก (Internal) |
| `auth.password_changed`            | Self-service เปลี่ยนรหัสสำเร็จ — **planned**       |
| `auth.password_reset_by_service`   | Internal/admin reset สำเร็จ — **planned**          |

---

## Related documents

- [`architecture.md`](./architecture.md)
- [`design-password-management.md`](./design-password-management.md)
- [`db/erd.md`](./db/erd.md)
- [`../../services/staff/docs/design-password-management.md`](../../services/staff/docs/design-password-management.md)

---

## Last updated

2026-05-26 — Password management (self-service + internal reset); link staff cross-package design
2026-05-21 — `/service-docs` (`assets/domain.md.tpl`).
