# Todo: Permission Admin UI (Phase F2)

> Plan: [plan.md](./plan.md) · Spec: [SPEC-permission-admin-ui.md](../SPEC-permission-admin-ui.md)
>
> **สถานะรวม:** ✅ Code complete — รอ manual smoke + `/review` + `/ship`

---

## Phase 0: Data + Navigation

- [x] **Task 1** — Seed `settings` group + wire route & sidebar
  - [x] แก้ `backend/auth/scripts/seed-data/permissions.js` (settings + reparent `permissions:manage`)
  - [x] เพิ่ม `MENU_UI` entries ใน `AdminLayout.tsx`
  - [x] เพิ่ม route `/permissions` + `PermissionGuard` ใน `App.tsx`
  - [x] Placeholder `PermissionAdmin/index.tsx`
  - [x] Verify: seed script + manual sidebar

---

## Phase 1: API Client Foundation

- [x] **Task 2** — Types + `permissionAdminUtils` + unit tests
  - [x] `types/permissionAdmin.ts`
  - [x] `permissionAdminUtils.ts` + `.test.ts`
  - [x] Verify: `npm run test -- permissionAdminUtils`

- [x] **Task 3** — `authApiClient` admin methods + `apiError` + tests
  - [x] 7 admin API methods — If-Match (ISO ดิบ) เฉพาะ menus PATCH/DELETE; role PUT ไม่มี; DELETE role `?confirm=true`
  - [x] unwrap `{ menus }` / `{ role_permissions }`; ห้ามใช้ `extractETag`
  - [x] `apiError` map `AUTH_PRECONDITION_FAILED`/`AUTH_MENU_IN_USE`/`AUTH_ROLE_PERMISSION_IN_USE`/`AUTH_INVALID_REQUEST` (detail string)
  - [x] `authApiClient.test.ts` (+ `apiError.test.ts` ถ้าจำเป็น)
  - [x] Verify: `npm run test -- authApiClient`

### Checkpoint: Foundation

- [x] `npm run test && npm run lint && npm run build` ผ่าน
- [x] Human review ก่อน UI tabs

---

## Phase 2: Bruno Collection

- [x] **Task 4** — Bruno `backend/_bruno/auth/admin/` (7 requests)
  - [x] `folder.yml` + List / Create / Update / Delete menus
  - [x] List / Upsert / Delete role-permissions
  - [ ] Verify: Bruno GUI smoke (Login → admin/*) — SC-8

---

## Phase 3: UI Vertical Slices

- [x] **Task 5** — Page shell + Tabs scaffold
  - [x] `PermissionAdmin/index.tsx` + tab stubs
  - [x] `PermissionAdmin.test.tsx` smoke
  - [x] Verify: `npm run test -- PermissionAdmin`

- [x] **Task 6** — Menu catalog tab (tree + CRUD + guards)
  - [x] `MenuCatalogTab.tsx` + `MenuNodeFormModal.tsx`
  - [x] Self-lockout: `permissions:manage` disable **ทั้ง Edit และ Delete** + 400/409/412 UX
  - [x] Verify: component tests + manual SC-2, SC-4

- [x] **Task 7** — Role permissions tab (checkbox tree + save)
  - [x] `RolePermissionsTab.tsx` — Save PUT ไม่มี If-Match; DELETE ใช้ `?confirm=true`
  - [x] `revoke_sessions` checkbox + platform_admin lockout (นับ `permissions:*`) + ใช้ `revoked_users_count`
  - [x] Verify: component tests + manual SC-3 (staging)

### Checkpoint: Core Features

- [x] User stories US-1–US-7 ครบ (code)
- [ ] Bruno SC-8 ผ่าน (manual)
- [x] Human review ก่อน polish

---

## Phase 4: Polish & Gate

- [x] **Task 8** — Guard tests + build gate + ROADMAP
  - [x] `PermissionGuard.test.tsx` — `/permissions` → `/403`
  - [x] `npm run test && npm run lint && npm run build` (SC-6)
  - [x] อัปเดต ROADMAP Phase 6 status
  - [ ] Rollout smoke ตาม Spec

### Checkpoint: Complete

- [ ] SC-1 ถึง SC-8 ครบ (SC-3, SC-5, SC-8 = manual)
- [ ] พร้อม `/review` + `/ship`

---

## Quick reference — Success Criteria

| SC | Task หลัก | สถานะ |
| :--- | :--- | :--- |
| SC-1 | Task 1, 5 | ✅ auto |
| SC-2 | Task 6 | ✅ auto + manual |
| SC-3 | Task 7 (manual staging) | ⏳ manual |
| SC-4 | Task 6 | ✅ auto |
| SC-5 | Task 6, 7 (manual concurrent) | ⏳ manual |
| SC-6 | Task 8 | ✅ |
| SC-7 | Task 8 | ✅ |
| SC-8 | Task 4 | ⏳ manual Bruno |
