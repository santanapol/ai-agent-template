# Implementation Plan: Permission Admin UI (Phase F2)

> Spec: [SPEC-permission-admin-ui.md](../SPEC-permission-admin-ui.md) · ROADMAP Phase 6 · อนุมัติ 2026-06-10

## Overview

ส่งมอบหน้า Backoffice `/permissions` สำหรับแอดมินที่มี `permissions:manage` — จัดการ menu/action registry และ role → `menu_keys` mappings ผ่าน Phase A API (`/auth/admin/*`) พร้อม Bruno collection สำหรับ SIT

**ขอบเขต:** consumer เท่านั้น — ไม่แก้ backend auth logic (Phase A เสร็จแล้ว) ยกเว้น **seed data PR** เพื่อย้ายเมนูนำทางให้ตรง Spec (`settings` group)

**Commands หลัก:**

```bash
cd frontend/backoffice && npm run test && npm run lint && npm run build
```

## Architecture Decisions

| การตัดสินใจ | เหตุผล |
| :--- | :--- |
| `If-Match` = `upd_date` **ISO ดิบ** (ไม่ห่อ `W/"..."`) จาก response **body** เฉพาะ `menus` PATCH/DELETE | ตรงกับ `admin.service.js` (`existing.upd_date.toISOString() === ifMatch`); ห้ามใช้ `extractETag` (admin ไม่ set ETag header) |
| `role-permissions` PUT ไม่มี If-Match (upsert); DELETE ใช้ `?confirm=true` | ตรงกับ `admin.controller.js`/`admin.service.js` — PUT last-write-wins; DELETE มี active users → ต้อง confirm |
| `apiError` map code auth: `AUTH_PRECONDITION_FAILED`/`AUTH_MENU_IN_USE`/`AUTH_ROLE_PERMISSION_IN_USE`/`AUTH_INVALID_REQUEST` | ต่างจาก staff (`VERSION_CONFLICT`) — code มาจาก Phase A จริง |
| `400` `detail` เป็น **string เดียว** (join `, `) | service join errors เป็นข้อความเดียว — ไม่มี `detail[]` array |
| ไม่ invalidate `getMyMenus()` หลัง admin save | OQ-4 — admin tooling; ผู้ใช้ refresh session เอง |
| Role Select hardcode 3 ค่า | OQ-3 — `platform_admin`, `branch_admin`, `staff` |
| แยก `permissionAdminUtils.ts` สำหรับ flat→tree | ทดสอบ unit ได้โดยไม่ mount React; reuse ทั้ง 2 แท็บ |
| Bruno ใช้ `.yml` ใน `backend/_bruno/auth/admin/` | สอดคล้อง collection `auth` ที่มีอยู่ + OQ-5 |
| Seed: เพิ่ม `settings` group + reparent `permissions:manage` (ผ่าน seed เท่านั้น) | ปัจจุบัน key อยู่ใต้ `staff:profiles`; API `updateMenu` block การแก้ `permissions:manage` → ย้ายได้เฉพาะทาง seed data |

## Dependency Graph

```
[Task 1] Seed + route + MENU_UI
    │
    ├──→ [Task 2] Types + utils + unit tests
    │         │
    │         └──→ [Task 3] authApiClient + apiError + tests
    │                   │
    │                   ├──→ [Task 4] Bruno admin/*  (ขนานได้หลัง Task 3)
    │                   │
    │                   ├──→ [Task 5] Page shell + tabs
    │                   │         │
    │                   │         ├──→ [Task 6] Menu catalog tab (CRUD)
    │                   │         │
    │                   │         └──→ [Task 7] Role permissions tab
    │                   │
    │                   └──→ [Task 8] Component tests + guard
    │
    └──→ (manual smoke ต้องรอ Task 1 + 6 + 7)
```

**External dependency:** Phase A API deploy บน environment ที่ backoffice proxy ชี้ไป — local dev ใช้ auth service + gateway ตาม `RUNBOOK.md`

## Task List

### Phase 0: Data + Navigation (Prerequisite)

#### Task 1: Seed `settings` group + wire route & sidebar

**Description:** เพิ่มเมนูนำทาง Settings → Permissions และ route `/permissions` ให้ `platform_admin` เข้าถึงได้ก่อน build UI เต็มรูปแบบ

**Acceptance criteria:**
- [ ] `permissions.js` มีโหนด `settings` (menu group) และ reparent `permissions:manage` → `parent_key: 'settings'` (ลำดับ: `settings` ต้องถูก declare ก่อน เพื่อให้ validation parent-exists ผ่าน)
- [ ] `platform_admin` mapping ยังมี `permissions:manage` (หรือ `permissions:*`)
- [ ] `MENU_UI` มี `'settings'` (group ไม่มี route) และ `'permissions:manage'` (icon + route `/permissions`)
- [ ] `App.tsx` มี route `permissions` + `PermissionGuard required="permissions:manage"`
- [ ] Placeholder page `PermissionAdmin` render ได้ (แม้ยังไม่มี CRUD)

> **หมายเหตุ:** ห้าม reparent ผ่าน Admin API — `updateMenu` คืน `400` สำหรับ key `permissions:manage`; ต้องแก้ใน seed data แล้วรัน seed ก่อน deploy

**Verification:**
- [ ] `node --env-file=.env scripts/seed-permissions.js` ผ่าน (auth)
- [ ] `npm run test -- AdminLayout` ผ่าน (ถ้าเพิ่มเคสเมนู settings)
- [ ] Manual: login `platform_admin` → เห็น Settings → Permissions → เปิด `/permissions`

**Dependencies:** None

**Files likely touched:**
- `backend/auth/scripts/seed-data/permissions.js`
- `frontend/backoffice/src/layouts/AdminLayout.tsx`
- `frontend/backoffice/src/App.tsx`
- `frontend/backoffice/src/pages/PermissionAdmin/index.tsx` (placeholder)

**Estimated scope:** S (4–5 files)

---

### Phase 1: API Client Foundation

#### Task 2: Types + `permissionAdminUtils` + unit tests

**Description:** สร้าง type contracts และ utility สำหรับแปลง flat menu list เป็น tree, เรียง `sort_order`, และ helper สำหรับ self-lockout guards

**Acceptance criteria:**
- [ ] `types/permissionAdmin.ts` ครบ `AdminMenuNode`, DTOs สำหรับ create/update/upsert
- [ ] `buildMenuTree(flat)` คืน hierarchy ถูกต้อง + เรียง `sort_order`
- [ ] `collectMenuKeys(tree)` / `isProtectedMenuKey(key)` สำหรับ guards
- [ ] `permissionAdminUtils.test.ts` ครอบคลุม edge cases (orphan parent, empty list, nested sort)

**Verification:**
- [ ] `npm run test -- permissionAdminUtils`

**Dependencies:** Task 1 (optional — utils ไม่พึ่ง seed แต่ทำหลัง Task 1 เพื่อให้ checkpoint ชัด)

**Files likely touched:**
- `frontend/backoffice/src/types/permissionAdmin.ts`
- `frontend/backoffice/src/pages/PermissionAdmin/permissionAdminUtils.ts`
- `frontend/backoffice/src/pages/PermissionAdmin/permissionAdminUtils.test.ts`

**Estimated scope:** S

---

#### Task 3: `authApiClient` admin methods + `apiError` extensions + tests

**Description:** เพิ่ม client methods ครบ 7 endpoints พร้อมส่ง `If-Match` และ map error codes ที่ Phase A คืน

**Acceptance criteria:**
- [ ] `listAdminMenus()` unwrap `{ menus }`; `createAdminMenu()`; `updateAdminMenu(key, body, updDate)` แนบ `If-Match: <updDate ISO ดิบ>`; `deleteAdminMenu(key, updDate)` แนบ `If-Match` (required)
- [ ] `listRolePermissions({ role })` unwrap `{ role_permissions }`; `upsertRolePermission(role, body)` **ไม่มี** If-Match; `deleteRolePermission(role, { confirm })` ใส่ query `?confirm=true`
- [ ] PUT/DELETE path ใช้ literal segment `null` สำหรับ Global: `/auth/admin/role-permissions/null/{role}`
- [ ] `ifMatchFromUpdDate(updDate)` ส่งค่า ISO **ดิบ** (ไม่ห่อ `W/"..."`); **ห้าม** ใช้ `extractETag` (admin ไม่มี ETag header)
- [ ] `apiErrorMessage` รองรับ codes: `AUTH_PRECONDITION_FAILED` (412), `AUTH_MENU_IN_USE`/`AUTH_ROLE_PERMISSION_IN_USE` (409), `AUTH_INVALID_REQUEST` (400 — `detail` เป็น string เดียว)
- [ ] `authApiClient.test.ts` mock axios ยืนยัน path, body, headers (มี/ไม่มี If-Match ตาม endpoint, `?confirm=true`)

**Verification:**
- [ ] `npm run test -- authApiClient`
- [ ] `npm run test -- apiError` (ถ้าแยกไฟล์ test)

**Dependencies:** Task 2

**Files likely touched:**
- `frontend/backoffice/src/lib/authApiClient.ts`
- `frontend/backoffice/src/lib/authApiClient.test.ts`
- `frontend/backoffice/src/lib/apiError.ts`
- `frontend/backoffice/src/lib/apiError.test.ts` (ถ้ายังไม่มี — สร้าง)

**Estimated scope:** M

---

### Checkpoint: Foundation

- [ ] `npm run test && npm run lint && npm run build` ผ่าน
- [ ] ไม่มี regression ใน auth client เดิม (login/refresh/getMyMenus)
- [ ] **Human review** ก่อนเริ่ม UI tabs

---

### Phase 2: Bruno Collection (OQ-5)

#### Task 4: Bruno `backend/_bruno/auth/admin/` — 7 requests

**Description:** ขยาย auth Bruno collection ครอบคลุม Permission Admin API สำหรับ SIT/manual smoke

**Acceptance criteria:**
- [ ] `admin/folder.yml` + 7 request files ตาม Spec
- [ ] ทุก request ใช้ `Authorization: Bearer {{access_token}}` (inherit หรือ explicit)
- [ ] **เฉพาะ** `menus` PATCH/DELETE มี `If-Match` (ISO ดิบ); `role-permissions` PUT ไม่มี If-Match; DELETE role ใช้ `?confirm=true`
- [ ] capture `upd_date` จาก Create/List menu ลง env var (post-response script) เพื่อใช้ใน PATCH/DELETE
- [ ] ใช้ `{{baseUrl}}` / `{{username}}` / `{{password}}` — ไม่ hardcode credentials
- [ ] ลำดับรัน: Login → List menus → Create → Update → Delete → List role-permissions → Upsert (ตามความเหมาะสม)

**Verification:**
- [ ] Manual: เปิด Bruno → chọn environment Local → Login → รัน admin requests ครบ 7 (SC-8)
- [ ] ตรวจ syntax `.yml` เปิดใน Bruno ได้ไม่ error

**Dependencies:** Task 3 (รู้ path/body ชัดจาก client + Phase A spec)

**Files likely touched:**
- `backend/_bruno/auth/admin/folder.yml`
- `backend/_bruno/auth/admin/*.yml` (7 requests)

**Estimated scope:** M

> **Parallelization:** Task 4 ทำขนานกับ Task 5–6 ได้หลัง Task 3 เสร็จ

---

### Phase 3: UI Vertical Slices

#### Task 5: Page shell — `PermissionAdmin` + Tabs scaffold

**Description:** แทนที่ placeholder ด้วย page shell 2 แท็บ (Menu catalog | Role permissions) พร้อม loading/error boundary พื้นฐาน

**Acceptance criteria:**
- [ ] `index.tsx` ใช้ antd `Tabs` — labels ตาม Spec (English)
- [ ] แต่ละแท็บเป็น lazy child component (หรือ import แยกไฟล์)
- [ ] 403 จาก API แสดง `Result` ไม่ crash
- [ ] `PermissionAdmin.test.tsx` smoke: render tabs เมื่อ mock permission ผ่าน

**Verification:**
- [ ] `npm run test -- PermissionAdmin`

**Dependencies:** Task 1, Task 3

**Files likely touched:**
- `frontend/backoffice/src/pages/PermissionAdmin/index.tsx`
- `frontend/backoffice/src/pages/PermissionAdmin/MenuCatalogTab.tsx` (stub → เต็มใน Task 6)
- `frontend/backoffice/src/pages/PermissionAdmin/RolePermissionsTab.tsx` (stub → เต็มใน Task 7)
- `frontend/backoffice/src/pages/PermissionAdmin/PermissionAdmin.test.tsx`

**Estimated scope:** S

---

#### Task 6: Menu catalog tab — tree + CRUD + self-lockout guards

**Description:** แท็บจัดการ registry — ดู tree, เพิ่ม/แก้/ลบโหนด ผ่าน API พร้อม validation/error UX

**Acceptance criteria:**
- [ ] โหลด `GET /auth/admin/menus` → แสดง Tree เรียง `sort_order`
- [ ] **Add node** Modal: `key`, `label`, `type`, `parent_key`, `sort_order` → POST
- [ ] **Edit** Modal: แก้ได้เฉพาะ `label`, `parent_key`, `sort_order`; `key`/`type` read-only; PATCH + `If-Match` (ISO ดิบ)
- [ ] **Delete** + Popconfirm → DELETE + `If-Match`; 409 (`AUTH_MENU_IN_USE`) แสดงข้อความชัดเจน
- [ ] Self-lockout: **ทั้ง Edit และ Delete disabled** + tooltip สำหรับ `permissions:manage` (backend block ทั้ง PATCH/DELETE)
- [ ] `400` validation แสดง `detail` (string เดียว — split `, ` เป็น list ได้)
- [ ] `412` (`AUTH_PRECONDITION_FAILED`) แสดงข้อความ refresh + reload tree
- [ ] ใช้ `useAppFeedback` ตาม pattern `StaffManagement.tsx`

**Verification:**
- [ ] `npm run test -- PermissionAdmin` (mock CRUD flows)
- [ ] Manual: สร้าง action key → เห็นใน tree (SC-2); ลบโหนดมีลูก → 409 (SC-4)

**Dependencies:** Task 5

**Files likely touched:**
- `frontend/backoffice/src/pages/PermissionAdmin/MenuCatalogTab.tsx`
- `frontend/backoffice/src/pages/PermissionAdmin/MenuNodeFormModal.tsx`
- `frontend/backoffice/src/pages/PermissionAdmin/PermissionAdmin.test.tsx`

**Estimated scope:** M–L (3–4 files)

---

#### Task 7: Role permissions tab — checkbox tree + save + revoke_sessions

**Description:** แท็บ map สิทธิ์ต่อ role (Global only) — เลือก role, ติ๊ก keys จาก registry, บันทึก PUT

**Acceptance criteria:**
- [ ] Role `Select`: `platform_admin`, `branch_admin`, `staff`
- [ ] โหลด menus + `GET role-permissions?role=` (unwrap `{ role_permissions }`) → Checkbox tree
- [ ] **Save** → `PUT .../null/{role}` + `menu_keys` (**ไม่มี If-Match**)
- [ ] Checkbox **Revoke active sessions** → `revoke_sessions: true` (default off) + คำเตือน
- [ ] Self-lockout: `permissions:manage` ของ `platform_admin` ติ๊กไม่ได้ถอด — **นับ `permissions:*` เป็นมีสิทธิ์** (disabled + tooltip)
- [ ] Success message ใช้ `revoked_users_count` จาก response (โชว์จำนวน session ที่ revoke หรือข้อความ staleness)
- [ ] ไม่เรียก `getMyMenus()` invalidate หลัง save (OQ-4)

**Verification:**
- [ ] `npm run test -- PermissionAdmin` (mock PUT + checkbox state)
- [ ] Manual staging: แก้ `branch_admin` → refresh test user → sidebar เปลี่ยน (SC-3)

**Dependencies:** Task 5, Task 6 (reuse tree builder; อาจทำขนานถ้า utils พร้อม)

**Files likely touched:**
- `frontend/backoffice/src/pages/PermissionAdmin/RolePermissionsTab.tsx`
- `frontend/backoffice/src/pages/PermissionAdmin/PermissionAdmin.test.tsx`

**Estimated scope:** M

---

### Checkpoint: Core Features

- [ ] US-1 ถึง US-7 ครบตาม Spec user stories (ยกเว้น SC-3 ถ้าไม่มี staging)
- [ ] `npm run test && npm run build` ผ่าน
- [ ] Bruno admin smoke ผ่าน (SC-8)
- [ ] **Human review** ก่อน polish

---

### Phase 4: Polish & Gate

#### Task 8: Guard tests + lint/build gate + rollout notes

**Description:** ปิดงานด้วย test coverage ที่เหลือ, อัปเดต ROADMAP status, ยืนยัน quality gate

**Acceptance criteria:**
- [ ] `PermissionGuard.test.tsx` มีเคส `/permissions` ไม่มีสิทธิ์ → redirect `/403` (SC-7)
- [ ] `npm run test && npm run lint && npm run build` ผ่านทั้งหมด (SC-6)
- [ ] ROADMAP Phase 6 อัปเดตเป็น "กำลังทำ" / "เสร็จ" ตามสถานะจริง
- [ ] Rollout checklist ใน Spec ยังใช้ได้ (seed → deploy frontend → smoke)

**Verification:**
- [ ] CI-equivalent local: `npm run ci` ถ้ามีใน backoffice
- [ ] Manual smoke ตาม Rollout section ใน Spec

**Dependencies:** Task 6, Task 7, Task 4

**Files likely touched:**
- `frontend/backoffice/src/components/PermissionGuard.test.tsx`
- `backend/auth/_mission-control/ROADMAP.md` (status only)

**Estimated scope:** S

---

### Checkpoint: Complete

- [ ] SC-1 ถึง SC-8 ครบ (หรือบันทึก manual-only items ที่ยังไม่รัน)
- [ ] พร้อม `/code-build` review หรือ `/review` + `/ship`

---

## Risks and Mitigations

| ความเสี่ยง | ผลกระทบ | วิธีรับมือ |
| :--- | :--- | :--- |
| Seed ปัจจุบันมี `permissions:manage` ใต้ `staff:profiles` | Med | Task 1 reparent ไป `settings` **ผ่าน seed เท่านั้น** (API block) — รัน seed ก่อน deploy F2 |
| `If-Match` format ผิด (`W/"..."` vs ISO ดิบ) → 412 ทุกครั้ง | High | Task 3 ส่ง ISO ดิบจาก body; ยืนยันด้วย Bruno PATCH ก่อนทำ UI |
| ใช้ `extractETag` ผิด (admin ไม่มี ETag header) | High | Task 3 อ่าน `upd_date` จาก body เท่านั้น |
| Wildcard `permissions:*` ในกฎ self-lockout | Med | Task 7 นับทั้ง `permissions:manage` และ `permissions:*` (สะท้อน backend) |
| Checkbox tree + wildcard keys (`profiles:*`) | Med | แสดงเฉพาะ keys ใน registry; ไม่ expand wildcard ฝั่ง UI — ส่ง `menu_keys` ตามที่ติ๊ก |
| Role `support` มีใน seed แต่ไม่อยู่ใน Select | Low | OQ-3 — ไม่แสดงใน UI; mapping ยังอยู่ใน DB |
| Concurrent edit menu → 412 | Low | map `AUTH_PRECONDITION_FAILED` ใน `apiError` (Task 3 เพิ่มใหม่) |
| DELETE role ที่มี active users → 409 | Low | UI ถาม confirm แล้วส่ง `?confirm=true` (สะท้อน `AUTH_ROLE_PERMISSION_IN_USE`) |

## Open Questions

ไม่มี — Resolved ทั้งหมดใน Spec (OQ-1–5)

## Parallelization Summary

| ขนานได้ | ต้องเรียง |
| :--- | :--- |
| Task 4 (Bruno) หลัง Task 3 | Task 1 → 2 → 3 |
| Task 7 เริ่มได้เมื่อ Task 5 + utils พร้อม (ไม่ต้องรอ Task 6 เสร็จ 100%) | Task 6 ก่อน checkpoint core ถ้าต้องการ US-2 ก่อน US-5 |

## Approval

- [ ] เบียร์อนุมัติ Plan นี้
- [ ] หลังอนุมัติ → เริ่ม `/code-build` ที่ Task 1
