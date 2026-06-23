# Todo: Permission Admin UI (Phase F2)

> Plan: [plan.md](./plan.md) · Spec: [SPEC-permission-admin-ui.md](../SPEC-permission-admin-ui.md)
>
> **สถานะรวม:** 🟢 Task 6 เสร็จ · Task 7 ถัดไป

---

## Phase 0: Data + Navigation

- [x] **Task 1** — Seed `settings` group + wire route & sidebar
  - [ ] แก้ `backend/auth/scripts/seed-data/permissions.js` (settings + reparent `permissions:manage`)
  - [ ] เพิ่ม `MENU_UI` entries ใน `AdminLayout.tsx`
  - [ ] เพิ่ม route `/permissions` + `PermissionGuard` ใน `App.tsx`
  - [ ] Placeholder `PermissionAdmin/index.tsx`
  - [ ] Verify: seed script + manual sidebar

---

## Phase 1: API Client Foundation

- [x] **Task 2** — Types + `permissionAdminUtils` + unit tests
  - [ ] `types/permissionAdmin.ts`
  - [ ] `permissionAdminUtils.ts` + `.test.ts`
  - [ ] Verify: `npm run test -- permissionAdminUtils`

- [x] **Task 3** — `authApiClient` admin methods + `apiError` + tests
  - [ ] 7 admin API methods — If-Match (ISO ดิบ) เฉพาะ menus PATCH/DELETE; role PUT ไม่มี; DELETE role `?confirm=true`
  - [ ] unwrap `{ menus }` / `{ role_permissions }`; ห้ามใช้ `extractETag`
  - [ ] `apiError` map `AUTH_PRECONDITION_FAILED`/`AUTH_MENU_IN_USE`/`AUTH_ROLE_PERMISSION_IN_USE`/`AUTH_INVALID_REQUEST` (detail string)
  - [ ] `authApiClient.test.ts` (+ `apiError.test.ts` ถ้าจำเป็น)
  - [ ] Verify: `npm run test -- authApiClient`

### Checkpoint: Foundation

- [x] `npm run test && npm run lint && npm run build` ผ่าน
- [ ] Human review ก่อน UI tabs

---

## Phase 2: Bruno Collection

- [x] **Task 4** — Bruno `backend/_bruno/auth/admin/` (7 requests)
  - [ ] `folder.yml` + List / Create / Update / Delete menus
  - [ ] List / Upsert / Delete role-permissions
  - [ ] Verify: Bruno GUI smoke (Login → admin/*) — SC-8

---

## Phase 3: UI Vertical Slices

- [x] **Task 5** — Page shell + Tabs scaffold
  - [ ] `PermissionAdmin/index.tsx` + tab stubs
  - [ ] `PermissionAdmin.test.tsx` smoke
  - [ ] Verify: `npm run test -- PermissionAdmin`

- [x] **Task 6** — Menu catalog tab (tree + CRUD + guards)
  - [ ] `MenuCatalogTab.tsx` + `MenuNodeFormModal.tsx`
  - [ ] Self-lockout: `permissions:manage` disable **ทั้ง Edit และ Delete** + 400/409/412 UX
  - [ ] Verify: component tests + manual SC-2, SC-4

- [ ] **Task 7** — Role permissions tab (checkbox tree + save)
  - [ ] `RolePermissionsTab.tsx` — Save PUT ไม่มี If-Match; DELETE ใช้ `?confirm=true`
  - [ ] `revoke_sessions` checkbox + platform_admin lockout (นับ `permissions:*`) + ใช้ `revoked_users_count`
  - [ ] Verify: component tests + manual SC-3 (staging)

### Checkpoint: Core Features

- [ ] User stories US-1–US-7 ครบ
- [ ] Bruno SC-8 ผ่าน
- [ ] Human review ก่อน polish

---

## Phase 4: Polish & Gate

- [ ] **Task 8** — Guard tests + build gate + ROADMAP
  - [ ] `PermissionGuard.test.tsx` — `/permissions` → `/403`
  - [ ] `npm run test && npm run lint && npm run build` (SC-6)
  - [ ] อัปเดต ROADMAP Phase 6 status
  - [ ] Rollout smoke ตาม Spec

### Checkpoint: Complete

- [ ] SC-1 ถึง SC-8 ครบ
- [ ] พร้อม `/review` + `/ship`

---

## Quick reference — Success Criteria

| SC | Task หลัก |
| :--- | :--- |
| SC-1 | Task 1, 5 |
| SC-2 | Task 6 |
| SC-3 | Task 7 (manual staging) |
| SC-4 | Task 6 |
| SC-5 | Task 6, 7 (manual concurrent) |
| SC-6 | Task 8 |
| SC-7 | Task 8 |
| SC-8 | Task 4 |
