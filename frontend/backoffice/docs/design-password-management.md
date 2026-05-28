# Design — Password UI (Staff Management + My Profile)

**Status:** **Implemented** (Phase 2 — 2026-05-26)  
**Canonical API design:** [`../../services/staff/docs/design-password-management.md`](../../services/staff/docs/design-password-management.md) · [`../../auth/docs/design-password-management.md`](../../auth/docs/design-password-management.md)

---

## 1. Screens overview

| Screen | Password capability |
| :--- | :--- |
| **Staff Management → Create** | กำหนดรหัสผ่านเริ่มต้น (required) |
| **Staff Management → Edit** | Reset password (optional section, แยก action) |
| **My Profile** | Change password (ต้องใส่รหัสปัจจุบัน) |

---

## 2. Staff Management — Create drawer

```
┌─ Create Staff Profile ─────────────────────┐
│ Staff Code *     [ EMP-001            ]  │
│ First / Last name  [ ... ] [ ... ]       │
│ Email *            [ ... ]               │
│ Telephone *        [ +66... ]            │
│ ─── Login credentials ───                │
│ Password *         [ •••••••• ] 👁        │
│ Confirm password * [ •••••••• ] 👁        │
│ ℹ Min 16 characters. │
│              [ Cancel ] [ Create Profile ]│
└──────────────────────────────────────────┘
```

**API:** `POST /api/v1/staff/profiles` + field `password`

---

## 3. Staff Management — Edit drawer

Profile fields ยังใช้ `PATCH` + `If-Match` เหมือนเดิม

```
┌─ Edit Staff Profile ───────────────────────┐
│ Staff Code (disabled)  EMP-001             │
│ ... contact fields ...                     │
│ [ Save Changes ]                           │
│ ─── Reset password (admin) ───             │
│ New password      [ •••••••• ] 👁  (opt.)  │
│ Confirm password  [ •••••••• ] 👁           │
│ [ Update password ]  ← แยกปุ่ม              │
└────────────────────────────────────────────┘
```

**ก่อน Update password:** Modal — "User will be signed out everywhere. Continue?"

**API:** `POST /api/v1/staff/profiles/{id}/password` — ไม่ส่งถ้าฟิลด์ว่าง

**ซ่อน** section Reset password เมื่อ `profile.user_id === currentUser.sub`

---

## 4. My Profile — Change password card

```
┌─ Change password ──────────────────────────┐
│ Current password *  [ •••••••• ] 👁         │
│ New password *      [ •••••••• ] 👁         │
│ Confirm password *  [ •••••••• ] 👁         │
│ [ Change password ]                        │
└──────────────────────────────────────────┘
```

**API:** `POST /auth/me/password` (ผ่าน gateway `/auth/...`)

**หลังสำเร็จ:** Toast "Password updated. Please sign in again." → `logout()` → `/login`

---

## 5. UX copy (draft)

| Context | Message |
| :--- | :--- |
| Create helper | Minimum 16 characters. |
| Reset confirm | This will sign the user out of all devices. |
| Self success | Password updated. Please sign in again. |
| Wrong current | Current password is incorrect. |
| Policy error | Password must be at least 16 characters. |
| Mismatch confirm | Passwords do not match. |

---

## 6. When to update package docs

หลัง implement — sync [`api-mapping.md`](./api-mapping.md), [`ui-ux-design.md`](./ui-ux-design.md), [`ux-writing.md`](./ux-writing.md)
