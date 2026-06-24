# Review #2 — Action Items (Round 3 fixes)

ที่มา: [`review-2-dynamic-permission.md`](./review-2-dynamic-permission.md) (รีวิว 2026-06-15, verification ของ review-1-todo.md)
ลำดับการแก้: Critical (ของเดิมยังไม่ถูกแก้จริง) → Important (regression ใหม่) → Suggestion

## 🔴 Critical — ของเดิมยังไม่ถูกแก้จริง (ต้องแก้ก่อน merge)

- [x] **Task R3-1: [Phase 3] แก้ actionKey ของ archive/restore ให้เป็น `profiles:edit` จริง (CRITICAL-1)**
  - [x] `backend/service/staff/src/modules/profiles/profiles.service.js:859` (`archiveProfile`) — เปลี่ยน `actionKey: "profiles:archive"` → `"profiles:edit"`
  - [x] `backend/service/staff/src/modules/profiles/profiles.service.js:910` (`restoreProfile`) — เปลี่ยน `actionKey: "profiles:restore"` → `"profiles:edit"`
  - [x] ตรวจสอบ test "succeeds with profiles:edit permission" สำหรับ archive/restore ใน `profiles.permissions.test.js` (~line 310-333, 360-385) ว่ายัง assert 200 ถูกต้องหลังแก้ actionKey (ควรผ่านได้ด้วยเหตุผลที่ถูกต้องแล้ว)
  - [x] รัน `profiles.permissions.test.js` กับ MongoDB จริงเพื่อยืนยัน enforce-mode ทำงานถูกต้องทั้ง archive/restore/reset-password/role

- [x] **Task R3-2: [Phase 5] แก้ `revoke_sessions` self-stale ให้เป็น no-op จริงๆ (CRITICAL-2)**
  - [x] `backend/auth/src/modules/admin/admin.route.js:45-48` — เก็บผลลัพธ์ของ `assertAccessTokenGenMatches({...})` ไว้ในตัวแปร (เช่น `genCheck`) แล้วเช็ค `if (!genCheck.ok)` → คืน 401 (`problem` หรือ `TOKEN_REFRESH_REJECTED`) ทันที ตาม pattern เดียวกับ `getMyMenus`
  - [x] ใช้ `genCheck.user` แทนการเรียก `authService.repo.findUserById(...)` ซ้ำที่ line 50 (ลด DB round-trip)
  - [x] เพิ่ม integration test: platform_admin เรียก `PUT role-permissions` ด้วย `revoke_sessions: true` ที่กระทบ role ของตัวเอง → request ถัดไปด้วย token เดิมต้องได้ 401

## 🟠 Important — regression ใหม่จาก Round 2 + ของเดิมที่ยังไม่ครบ

- [x] **Task R3-3: [Phase 4] แก้ 2 eslint errors ใหม่ (0 → 2)**
  - [x] `frontend/backoffice/src/layouts/AdminLayout.tsx:215` — เอา `items={menuItems as any}` ออก แก้ type ของ `menuItems`/`MenuItemType` ให้ตรงกับ antd `MenuProps['items']` จริงๆ (ไม่ใช่ cast เป็น `any`)
  - [x] `frontend/backoffice/src/contexts/AuthContext.tsx:107` — แก้ `react-hooks/set-state-in-effect` (เช่น restructure state init หรือ eslint-disable พร้อมเหตุผลที่ชัดเจน)
  - [x] ยืนยัน `npx eslint .` กลับมา 0 errors

- [x] **Task R3-4: [Phase 5] เติม error codes ที่ขาดใน `coding-standard/auth/codes.yaml`**
  - [x] เพิ่ม `AUTH_FORBIDDEN` (403), `AUTH_MENU_NOT_FOUND` (404), `AUTH_PRECONDITION_FAILED` (412), `AUTH_ROLE_PERMISSION_NOT_FOUND` (404) เข้า `/home/santanapol/Documents/Workspace/Sandbox/agent-skill/coding-standard/auth/codes.yaml`
  - [x] รัน `npm run spec:codes` ใน `backend/auth` ให้ผ่าน

- [x] **Task R3-5: [Phase 5] แก้ลำดับและ code/status ของ `deleteRolePermission` (Task 6 follow-up)**
  - [x] `backend/auth/src/modules/admin/admin.service.js` (`deleteRolePermission`) — ย้าย `countUsersInScope` check ไปเป็นตัวสุดท้ายก่อน `repo.deleteRolePermission` (ให้ check `ouId≠null` 400 และ `platform_admin` self-lockout 400 รันก่อน)
  - [x] แก้ response 409 ของ active-users check ไม่ให้ใช้ `code: 'AUTH_INVALID_REQUEST'` (registered @ 400) — ลงทะเบียน code 409 ใหม่ (เช่น `AUTH_ROLE_PERMISSION_IN_USE`) หรือใช้ code 409 ที่มีอยู่แล้วให้ตรง
  - [x] เพิ่ม integration test สำหรับเคส block (409 ไม่มี confirm) และ confirm-then-delete (204)

- [x] **Task R3-6: [Phase 5] แก้ staff openapi `PATCH /profiles/{profileId}/role` ให้ตรง handler จริง**
  - [x] `backend/service/staff/openapi.yaml` — เปลี่ยน response `200` + `ProfileEnvelope` + `ETag` เป็น `204` ไม่มี body (ตรงกับ `profiles.controller.js` `changeProfileRole`)
  - [x] เปลี่ยน request body schema `role` จาก `{ type: string, maxLength: 64 }` เป็น `enum: VALID_ROLES` (`platform_admin/branch_admin/staff/support`) ให้ตรงกับ `changeRoleSchema` จริง

- [x] **Task R3-7: แก้ `npm run format:check` ให้ผ่านทั้ง 2 service**
  - [x] `backend/auth`: `npx prettier --write` ให้ `scripts/seed-data/permissions.js`, `src/lib/permission-validation.js`, `src/modules/admin/admin.repository.js`, `src/modules/admin/admin.route.js`, `src/modules/admin/admin.service.js`, `src/modules/admin/admin.controller.js`, `test/admin.integration.test.js` + ไฟล์ markdown ที่เหลือ
  - [x] `backend/service/staff`: `npx prettier --write` ให้ `src/modules/profiles/tests/integration-test/profiles.permissions.test.js`, `src/modules/profiles/tests/unit-test/profiles.service.unit.test.js`

## 🟡 Suggestion — ของเดิมที่ยังไม่ทำ + เก็บกวาดเพิ่มเติม

- [ ] **Task R3-8: [Phase 5] เปลี่ยน escalating-action check จาก keyword heuristic เป็น allow-list/registry**
  - [x] `backend/auth/src/lib/permission-validation.js:75-83` — แทน `ESCALATING_KEYWORDS = ['assign','manage']` (substring match) ด้วย explicit `escalating: true` flag ต่อ action ใน `seedMenus` หรือ allow-list ที่ชัดเจน
  - [x] เพิ่ม unit test (เช่น พยายามสร้าง `profiles:roles_assign` ขณะ `branch_admin` มี `profiles:*`)

- [ ] **Task R3-9: [Phase 4] ของเดิมที่ยัง “ไม่ทำ” แม้ checkbox ติ๊กแล้ว**
  - [x] `AdminLayout.tsx:210` — เปลี่ยน `key={defaultOpenKeys.join(',')}` เป็น controlled `openKeys`/`onOpenChange`
  - [x] เพิ่ม explicit test สำหรับ cycle/depth guard ของ menu tree builder (T6.11.1/T6.11.2)
  - [x] แก้ `act()` warnings ใน `AdminLayout.test.tsx` (และ `AuthContext.test.tsx` ที่เพิ่งเพิ่มใหม่) ด้วย `await screen.findBy...` หรือตั้ง `IS_REACT_ACT_ENVIRONMENT` ใน `setupTests.ts`

- [ ] **Task R3-10: [Phase 3] ของเดิมที่ยัง "ไม่ทำ" แม้ checkbox ติ๊กแล้ว**
  - [x] `profiles.service.js:58` — เปลี่ยนจาก module-level `logger` เป็น `request.log` สำหรับ fallback-hit log (ต้องส่ง `request`/`reqId` เข้า `assertPermission`)
  - [x] เพิ่ม unit test สำหรับ `PERMISSION_MODE` validation ใหม่ใน `env.test.js`
  - [x] `profiles.service.unit.test.js` — เพิ่ม `resetRuntimeEnvForTests()` หลัง `setRuntimeEnv(...)` ใน describe block ใหม่ของ `assertPermission`

- [ ] **Task R3-11: [Phase 1] เก็บกวาดที่ยังไม่ทำ**
  - [x] พิจารณา compound index `{type:1, ou_id:1}` บน `auth_menus`
  - [x] ทบทวน `_mission-control/tasks/plan.md`/`tasks/todo.md` (Phase A) ให้ตรงสถานะจริง

- [ ] **Task R3-12: [Phase 4] เพิ่ม test coverage สำหรับ permission-gating ที่เป็น security-relevant**
  - [x] เพิ่ม `StaffTable.test.tsx`: ไม่มี `onEdit` → ไม่ render ปุ่ม Edit
  - [x] เพิ่ม/ขยาย test สำหรับ `StaffManagement.tsx`: mock `usePermission` ทั้งกรณีมี/ไม่มี `profiles:create`/`profiles:edit` แล้วตรวจ visibility ของปุ่ม Create/Edit
