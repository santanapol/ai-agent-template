# Review #1 — Action Items (Dynamic Permission Rollout)

ที่มา: [`review-1-dynamic-permission.md`](./review-1-dynamic-permission.md) (รีวิว 2026-06-15, /review Phase 1-5)
ลำดับการแก้: Critical (blocking merge) → Important → Suggestion

## 🔴 Critical — ต้องแก้ก่อน merge

- [x] **Task 1: [Phase 3] แก้ permission ผิดที่ archive/restore profile**
  - [x] ลบบรรทัด `assertAdminRole(userContext)` ที่ `backend/service/staff/src/modules/profiles/profiles.service.js:763` (ซ้ำซ้อนกับ `assertAdminLifecycleAccess(..., "profiles:edit")` ที่ line 777 ซึ่งถูกต้องตาม SPEC อยู่แล้ว)
  - [x] เพิ่ม enforce-mode integration test สำหรับ archive/restore ด้วย user ที่มีแค่ `profiles:edit` (ไม่มี `profiles:create`) เพื่อกัน regression

- [x] **Task 2: [Phase 1 ↔ 5] เพิ่ม `permissions:manage` เข้า seed data**
  - [x] เพิ่ม action node domain `permissions` (เช่น `permissions:manage`) ใน `backend/auth/scripts/seed-data/permissions.js` (`seedMenus`)
  - [x] เพิ่ม `permissions:manage` เข้า `platform_admin.menu_keys` ใน `seedRolePermissions`
  - [x] รัน `node --env-file=.env scripts/seed-permissions.js` ตามกฎ deploy ก่อน deploy Phase 5

- [x] **Task 3: [Phase 4] แก้ `npm run build` (tsc) ที่ fail 6 errors**
  - [x] `frontend/backoffice/src/layouts/AdminLayout.tsx:91-97,215` — ทำให้ `MenuItemType.children` เป็น array เสมอ (หรือปรับ type ให้ตรง antd `ItemType<MenuItemType>[]`) แก้ TS2322
  - [x] `PermissionGuard.test.tsx:4,7` — เปลี่ยน import `AuthContextValue` เป็น `import type`
  - [x] `usePermission.test.ts:3` — เปลี่ยน import type ที่เกี่ยวข้องเป็น `import type`
  - [x] `AdminLayout.test.tsx:4,6` — เปลี่ยน import `DecodedUser`/ที่เกี่ยวข้องเป็น `import type`
  - [x] ยืนยัน `npx tsc -b` ผ่าน 0 errors แล้ว `npm run build` สำเร็จ

- [x] **Task 4: [Phase 5] `revoke_sessions` ต้อง stale token ของ admin ที่เรียกเอง**
  - [x] เพิ่มการเช็ค `access_token_gen` ใน `requirePermissionManage` (`backend/auth/src/modules/admin/admin.route.js`) แบบเดียวกับ `getMyMenus`
  - [x] เพิ่ม integration test: หลัง `revoke_sessions: true` ที่ส่งผลถึง role ของผู้เรียกเอง → request ถัดไปด้วย token เดิมต้องถูก 401

- [x] **Task 5: [Phase 5] enforce กฎ "escalating action ห้ามอยู่ใต้ wildcard domain"**
  - [x] เพิ่ม validation rule ใน `backend/auth/src/lib/permission-validation.js` (หรือ `admin.validator.js`) ที่ reject การสร้าง/แก้ action key ใหม่ในโดเมนที่มี role ใดถือ `domain:*` อยู่แล้ว เว้นแต่อยู่ใน allow-list ที่ตั้งใจ
  - [x] เพิ่ม unit test ครอบกรณีนี้ (เช่น พยายามสร้าง `profiles:roles_assign` ขณะ `branch_admin` มี `profiles:*`)

- [x] **Task 6: [Phase 5] เช็ค active users ก่อนลบ Global Default role-permission mapping**
  - [x] wire `AdminRepository.countUsersInScope` (`backend/auth/src/modules/admin/admin.repository.js:70-72`, ปัจจุบัน dead code) เข้า `deleteRolePermission` (`admin.service.js:449-508`) สำหรับทุก role ไม่ใช่แค่ `platform_admin`
  - [x] ถ้า count > 0 และไม่มี `confirm=true` → ตอบ 409 ตามกฎ ROADMAP "ห้ามลบโดยไม่เตือน"
  - [x] เพิ่ม integration test สำหรับเคส block และเคส confirm-then-delete

## 🟠 Important

- [x] **Task 7: [Phase 1] กัน `TypeError` จาก optional logger**
  - [x] `backend/auth/src/modules/auth/auth.service.js:262-271` (`warnIfAccessJwtOversize`) — เปลี่ยน `this.log.warn(...)` เป็น `this.log?.warn?.(...)` ให้ตรง pattern เดียวกับ `audit()`

- [x] **Task 8: [Phase 3] validate ค่า `PERMISSION_MODE` ตอน startup**
  - [x] `backend/service/staff/src/config/env.js:56` — validate ว่า `PERMISSION_MODE` ต้องเป็น `"dual"` หรือ `"enforce"` เท่านั้น, throw/warn ถ้า typo อื่น

- [x] **Task 9: [Phase 3] เพิ่ม test คุม fallback-hit log + enforce coverage ที่เหลือ**
  - [x] เพิ่ม unit test ยืนยัน `logger.warn({ action_key, role }, "permission dual-check fallback used")` ที่ `profiles.service.js:58-61` ถูกเรียกถูกต้อง (signal สำหรับเกณฑ์ 7 วัน zero fallback hit)
  - [x] เพิ่ม enforce-mode integration test ให้ครบทุก endpoint ตาม openapi permission table (archive, restore, reset-password, `PATCH /profiles/:id/role`) — ปัจจุบันมีแค่ list/create
  - [x] รัน `profiles.permissions.test.js` กับ MongoDB จริง (sandbox รีวิวไม่มี Mongo จึง integration ติด `ECONNREFUSED 27017`) เพื่อยืนยันผลจริง

- [x] **Task 10: [Phase 4] permission-gate ปุ่ม Create/Edit ใน Staff Management**
  - [x] `frontend/backoffice/src/pages/StaffManagement.tsx:326` (Create) — ซ่อนถ้าไม่มี `profiles:create` ผ่าน `usePermission`
  - [x] `StaffManagement.tsx:356` (Edit action) — ซ่อนถ้าไม่มี `profiles:edit` ผ่าน `usePermission`

- [x] **Task 11: [Phase 4] เพิ่ม AuthContext integration test ตาม SPEC Testing Strategy #4**
  - [x] เพิ่ม test สำหรับ `frontend/backoffice/src/contexts/AuthContext.tsx` ยืนยันว่า `permissions` จาก login/refresh response ถูกเก็บ และ `getMyMenus` อัปเดต menu state

- [x] **Task 12: [Phase 5] แก้ `type: types.forbidden` ที่เป็น `undefined`**
  - [x] เพิ่ม key `forbidden` ใน `problemTypes()` แล้วใช้ตรงๆ ที่ `admin.route.js:46-53,64-72,76-84` (ตัด `|| 'AUTH_FORBIDDEN'` fallback ที่ไม่เป็น URI)

- [x] **Task 13: [Phase 5] ลงทะเบียน error codes ที่ขาด**
  - [x] เพิ่ม `AUTH_FORBIDDEN` (403), `AUTH_MENU_NOT_FOUND` (404), `AUTH_PRECONDITION_FAILED` (412), `AUTH_ROLE_PERMISSION_NOT_FOUND` (404) เข้า `coding-standard/auth/codes.yaml` และ openapi `Problem.code` enum
  - [x] แก้ `admin.service.js` ให้ `type`/`code` คู่กันถูกต้อง (ปัจจุบัน `AUTH_MENU_NOT_FOUND`/`AUTH_ROLE_PERMISSION_NOT_FOUND` ใช้ `type: this.types.userNotFound` ผิดคู่)
  - [x] เพิ่ม 4xx `Problem` examples ให้ admin paths ใน openapi เพื่อให้ `spec:codes` ครอบคลุม

- [x] **Task 14: [Phase 5] แก้ optimistic locking ให้ atomic (TOCTOU)**
  - [x] `admin.service.js` `updateMenu`/`deleteMenu` (line 101-176, 190-301) — ส่ง `existing.upd_date` เข้า filter ของ `admin.repository.js` mutation (`{key, upd_date: existing.upd_date}`) แทนการเช็คใน application code เท่านั้น
  - [x] ถ้า `matchedCount === 0` → ตอบ 412 ตาม `coding-standard/auth/12-data-management.md`

- [x] **Task 15: [Phase 5] เพิ่ม index `{ou_id:1, role:1}` บน `auth_users`**
  - [x] เพิ่มใน `test/helpers/ensure-indexes.mjs` และ `scripts/init-db.mjs` (เช่น `createIndex({ou_id:1, role:1}, {name:'by_ou_role'})`) — รองรับ `revoke_sessions` bulk query ใน `admin.repository.js:70-83`

## 🟡 Suggestion (nice to have / ทำตามเวลาเหลือ)

- [x] **Task 16: [Phase 1] เก็บกวาด dead code / sync docs**
  - [x] ลบ `MAX_DEPTH`/`MENU_TYPES` ที่ไม่ใช้แล้วใน `backend/auth/scripts/seed-permissions.js:15-16`
  - [x] พิจารณา compound index `{type:1, ou_id:1}` บน `auth_menus` ถ้า registry โตขึ้น (`findActionMenusForOu`)
  - [x] ทบทวน `_mission-control/tasks/plan.md` และ `tasks/todo.md` (Phase A) — ทำเครื่องหมาย task ที่เสร็จแล้วจริง (เช่น `admin.integration.test.js` มีแล้ว)

- [x] **Task 17: [Phase 2] ปรับ log field ให้ตรง convention**
  - [x] `backend/gateway/src/plugins/inject-context.js:43` — เปลี่ยนจาก log raw `{ err }` เป็น derived field เช่น `{ claimRejectReason: err?.message }` ให้ตรงกับ pattern ของ `jwt-auth.js:72`

- [x] **Task 18: [Phase 3] ความสะอาดของโค้ด/doc เล็กๆ**
  - [x] อัปเดต JSDoc ของ `assertProfileScope` (`profiles.service.js:190-195`) ให้มี parameter `actionKey`
  - [x] เพิ่ม top-of-file contract comment ใน `src/lib/permission-match.js` (staff) ให้ remind sync กับ canonical (`backend/auth/src/lib/permission-match.js`)
  - [x] เพิ่ม `PATCH /profiles/{profileId}/role` (`roles:assign`) เข้า openapi ที่ยังไม่ document
  - [x] พิจารณาใช้ `request.log` แทน module-level `logger` สำหรับ fallback-hit log เพื่อมี `reqId` correlation

- [x] **Task 19: [Phase 4] ปรับ UX/test เล็กๆ**
  - [x] `AdminLayout.tsx:210` — เปลี่ยนจาก `key={defaultOpenKeys.join(',')}` (force remount ทั้ง Menu) เป็น controlled `openKeys`/`onOpenChange`
  - [x] เพิ่ม explicit test สำหรับ cycle/depth guard ของ menu tree builder (ตาม todo.md T6.11.1/T6.11.2)
  - [x] แก้ `act()` warnings ใน `AdminLayout.test.tsx` ด้วย `await screen.findBy...`
  - [x] `AuthContext.tsx:107-111` — ลบ `Promise.resolve().then(...)` ที่ไม่จำเป็นก่อนเรียก `getMyMenus()`

- [x] **Task 20: [Phase 5] ลด duplication และ housekeeping**
  - [x] extract helper `fail(status, typeKey, title, detail, code)` แทนการเรียก `problemPayload({...})` ซ้ำ ~17 ครั้งใน `admin.service.js`
  - [x] พิจารณา rate limit บน `/auth/admin/*` (โดยเฉพาะ `PUT role-permissions/:ou_id/:role` ที่มี `revoke_sessions: true`)
  - [x] เติม response schema และ `401/403/404/412 $ref: Problem` ที่ขาดใน openapi admin paths
  - [x] ลดความซับซ้อนของ self-lockout check ที่ `admin.service.js:331-347`
  - [x] รัน `npx prettier --write .` แก้ `format:check` fail (`admin.controller.js`, `admin.repository.js`, `admin.route.js`, `admin.service.js`, `test/admin.integration.test.js`, `ROADMAP.md`, `SPEC-permission-admin-api.md`, `tasks/plan.md`)
  - [x] ทำให้ `GET role-permissions?ou_id=...` กับ `ou_id !== "null"` reject ด้วย 400 ให้ consistent กับ `PUT`/`DELETE`
