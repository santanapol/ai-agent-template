# Review #3 — Action Items (Round 4 fixes)

ที่มา: [`review-3-dynamic-permission.md`](./review-3-dynamic-permission.md) (รีวิว 2026-06-15, verification ของ review-2-todo.md)
ลำดับการแก้: Important (test แดงทันทีที่มี MongoDB / coverage หาย) → Suggestion (ของเดิมที่ยังไม่ทำ + เก็บกวาดเพิ่มเติม)

## 🟠 Important — ต้องแก้ก่อน merge (test จะแดงเมื่อมี MongoDB / coverage ที่ขอไว้ยังหาย)

- [ ] **Task R4-1: [Phase 3] แก้ 3 bug ใน `profiles.permissions.test.js` ที่จะ fail ทันทีเมื่อมี MongoDB จริง (IMPORTANT-1)**
  - [ ] Archive "fails with 403 PERMISSION_DENIED without profiles:edit" (~line 335-352) — ปัจจุบันจะได้ `412` ไม่ใช่ `403` เพราะ `parseIfMatchHeader` รันก่อน permission check (ผลข้างเคียงจากการลบ `assertAdminRole` ใน R3-1) แก้โดย: ดึง `If-Match` etag จริงก่อนยิง request (เหมือน test อื่นๆ) เพื่อให้ 412 ไม่เกิด แล้วเจอ 403 จาก permission check ตามที่ตั้งใจ — หรือสลับลำดับใน `transitionProfileStatus` ให้ permission check รันก่อน `parseIfMatchHeader`
  - [ ] Reset Password "succeeds with profiles:edit permission" (~line 403-433) — เปลี่ยน payload key `new_password` → `password` (ตรงกับ `adminPasswordSchema`, `additionalProperties:false`) และเปลี่ยน assertion `200` → `204` (ตรงกับ `resetProfilePassword` controller)
  - [ ] Update Role "succeeds with roles:assign permission" (~line 445-475) — เปลี่ยน assertion `200` → `204` (ตรงกับ `changeProfileRole` controller)
  - [ ] รัน `profiles.permissions.test.js` กับ MongoDB จริงเพื่อยืนยันทั้ง 3 เคสผ่าน (รวมกับเคสเดิมที่ผ่านอยู่แล้ว)

- [ ] **Task R4-2: [Phase 5] เพิ่ม regression test ที่ขอไว้ตั้งแต่ R3-2/R3-5 ซึ่งยังไม่มี (IMPORTANT-3)**
  - [ ] `backend/auth/test/admin.integration.test.js` — เพิ่ม integration test: platform_admin เรียก `PUT role-permissions/{ou_id}/{role}` ด้วย `revoke_sessions: true` ที่กระทบ role ของตัวเอง → request ถัดไปด้วย access token เดิมต้องได้ `401` (ครอบคลุม CRITICAL-2 / R3-2)
  - [ ] `backend/auth/test/admin.integration.test.js` — เพิ่ม integration test: `DELETE role-permissions/{ou_id}/{role}` ที่มี active users และไม่ส่ง `confirm=true` → `409 AUTH_ROLE_PERMISSION_IN_USE`; ส่ง `confirm=true` → `204` (ครอบคลุม R3-5)

- [ ] **Task R4-3: [Phase 4] แก้ type erasure ที่ `AdminLayout.tsx:149` (IMPORTANT-2)**
  - [ ] เขียน recursive helper `toAntdMenuItems(items: MenuItemType[]): MenuProps['items']` ที่ map แต่ละ node เป็น antd `ItemType` จริง (รวม `children` แบบ recursive) แทน `rootItems as unknown as AntdMenuItem[]`
  - [ ] ลบ field `disabled?: boolean` ที่เพิ่งเพิ่มเข้า `MenuItemType` (`AdminLayout.tsx:97`) ที่ไม่ได้ใช้งานจริง (dead code)
  - [ ] ยืนยัน `npx tsc -b` และ `npx eslint .` ยังผ่าน 0 errors หลังแก้

- [ ] **Task R4-4: [Phase 5] document `confirm` param + response codes ของ `DELETE .../role-permissions/{ou_id}/{role}` ใน openapi (IMPORTANT-4)**
  - [ ] `backend/auth/openapi.yaml` — เพิ่ม query param `confirm` (boolean, optional) และ response `400`/`404`/`409` (พร้อม `$ref: Problem`) ให้ตรงกับ `admin.service.js`/`admin.route.js` ปัจจุบัน
  - [ ] รัน `npm run spec:lint` ให้ผ่าน

## 🟡 Suggestion — ของเดิมที่ยังไม่ทำ (carry มาแล้ว 2-3 รอบ) + เก็บกวาดเพิ่มเติม

- [ ] **Task R4-5: [Phase 5] escalating-action allow-list (R3-8, ยังไม่ทำ)**
  - [ ] `backend/auth/src/lib/permission-validation.js:75-88` — แทน `ESCALATING_KEYWORDS=['assign','manage']` (substring match) ด้วย explicit `escalating: true` flag ต่อ action หรือ allow-list ที่ชัดเจน
  - [ ] เพิ่ม unit test (เช่น พยายามสร้าง `profiles:roles_assign` ขณะ `branch_admin` มี `profiles:*`)

- [ ] **Task R4-6: [Phase 4] AdminLayout menu UX/tests (R3-9, ยังไม่ทำ)**
  - [ ] `AdminLayout.tsx:213` — เปลี่ยน `key={defaultOpenKeys.join(',')}` (force remount ทั้ง Menu) เป็น controlled `openKeys`/`onOpenChange`
  - [ ] เพิ่ม explicit test สำหรับ cycle/depth guard ของ menu tree builder (T6.11.1/T6.11.2)
  - [ ] แก้ `act()` warnings ใน `AdminLayout.test.tsx` (2 จุด) และ `AuthContext.test.tsx` (5 จุด) ด้วย `await screen.findBy...` หรือตั้ง `IS_REACT_ACT_ENVIRONMENT` ใน `setupTests.ts`

- [ ] **Task R4-7: [Phase 3] staff logging/test cleanup (R3-10, ยังไม่ทำ)**
  - [ ] `profiles.service.js:46-70` (`assertPermission`) — เปลี่ยนจาก module-level `logger` เป็น `request.log` สำหรับ fallback-hit log (ต้องส่ง `request`/`reqId` เข้า `assertPermission`)
  - [ ] เพิ่ม unit test สำหรับ `PERMISSION_MODE` validation ใหม่ใน `env.test.js` (ปัจจุบัน logic ถูกแล้วแต่ไม่มี test คุม)
  - [ ] `profiles.service.unit.test.js:359-394` — เพิ่ม `resetRuntimeEnvForTests()` หลัง `setRuntimeEnv(...)` ทั้ง 2 ที่ใน describe block ใหม่ของ `assertPermission` (ตาม pattern `rbac.test.js:89-93`)

- [ ] **Task R4-8: [Phase 1] index/docs cleanup (R3-11, ทำผิดเป้า/ยังไม่ตรง)**
  - [ ] ตัดสินใจ: ต้องการ compound index `{type:1, ou_id:1}` บน `auth_menus` ตามที่ขอไว้เดิมหรือไม่ (ปัจจุบันมีแต่ `{ou_id:1, role:1}` ชื่อ `by_ou_role` บน `auth_users` ซึ่งเป็นคนละ index/คนละ collection) — ถ้าไม่ต้องการแล้วให้ปิด item นี้อย่างชัดเจนใน `tasks/plan.md`
  - [ ] `_mission-control/tasks/todo.md` — Phase A checkbox ยังไม่ติ๊กทั้งที่งานเสร็จและมี test ผ่านแล้ว อัปเดตให้ตรงสถานะจริง

- [ ] **Task R4-9: [Phase 4] permission-gating test files ที่ขอไว้ยังไม่มี (R3-12, ยังไม่ทำ)**
  - [ ] เพิ่ม `StaffTable.test.tsx`: ไม่มี `onEdit` → ไม่ render ปุ่ม Edit
  - [ ] เพิ่ม/ขยาย `StaffManagement.test.tsx`: mock `usePermission` ทั้งกรณีมี/ไม่มี `profiles:create`/`profiles:edit` แล้วตรวจ visibility ของปุ่ม Create/Edit

- [ ] **Task R4-10: housekeeping เล็กๆ จาก Round 3**
  - [ ] `backend/service/staff/openapi-via-gateway.yaml` — เพิ่ม path `PATCH /profiles/{profileId}/role` ให้ตรงกับ `openapi.yaml` ที่แก้ใน R3-6 (archive/restore/password sub-resource มี mirror แล้ว แต่ `/role` ยังไม่มี)
  - [ ] เพิ่ม "fails with 403 without permission" test ให้ Restore/Reset-Password/Update-Role (ปัจจุบันมีแค่ Archive — ซึ่งตัวมันเองมีบั๊กตาม R4-1)
  - [ ] `admin.route.js` — ลบ dead-code fallback `genCheck.user ?? (await authService.repo.findUserById(...))` เหลือ `const user = genCheck.user`
  - [ ] `admin.route.js` — พิจารณา `genCheck.problem` fallback ให้ robust กว่าการ hardcode `types.invalidToken`/`TOKEN_REFRESH_REJECTED`
  - [ ] `admin.service.js` (`deleteMenu`) — 3 จุดที่ตอบ `409` ด้วย `code: 'AUTH_INVALID_REQUEST'` (registered @ 400) ยังไม่ตรงเหมือนที่ R3-5 แก้ให้ `deleteRolePermission` แล้ว พิจารณาเพิ่ม `AUTH_MENU_IN_USE`@409
  - [ ] `AdminLayout.tsx` — ย้าย type alias `AntdMenuItem`/`MenuItemType` ออกจาก component body ไปไว้ module scope
