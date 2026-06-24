# Review #4 — Action Items (Round 5 fixes)

ที่มา: [`review-4-dynamic-permission.md`](./review-4-dynamic-permission.md) (รีวิว 2026-06-15, verification ของ review-3-todo.md)
ลำดับการแก้: Critical (CI แดงตอนนี้) → Suggestion (ของเดิมที่ carry มา)

## 🔴 Critical — ต้องแก้ก่อน merge (CI แดงอยู่ตอนนี้)

- [x] **Task R5-1: [Phase 5] แก้ 2 eslint errors ใหม่ที่ทำให้ `npm run ci` (backend/auth) fail (NEW-CRITICAL-1)**
  - [x] `backend/auth/src/modules/admin/admin.route.js:4` — ลบ `import { ObjectId } from 'mongodb'` ที่ไม่ได้ใช้แล้ว (เหลือจาก R4-10 ที่ simplify `genCheck.user`)
  - [x] `backend/auth/test/seed-permissions.test.js:131-136` — ลบ local `const menus = [...]` ที่ไม่ได้ใช้ (test ใช้ `menusWithRolesUnderProfiles`/`menusWithPermUnderPermDomain` แทน)
  - [x] รัน `npm run ci` ใน `backend/auth` ให้ผ่านทั้ง chain (lint && format:check && test && audit:check)

- [x] **Task R5-2: [Phase 3] แก้ 6 integration test ที่ fail ใน `backend/service/staff` เมื่อรันกับ MongoDB จริง (NEW-CRITICAL-2)**
  - [x] `profiles.lifecycle.test.js:239` "staff role archive returns 403 PERMISSION_DENIED" ได้ `412` — ใช้วิธีแก้แบบเดียวกับที่ R4-1 ทำกับ Archive-403 test ใน `profiles.permissions.test.js` (ดึง `If-Match` etag จริงก่อนยิง request เพื่อไม่ให้ `parseIfMatchHeader` throw 412 ก่อน permission check)
  - [x] `profiles.permissions.test.js:305` Archive "succeeds with profiles:edit" ได้ `500` — เพิ่ม `payload: {}` ให้ POST `.../archive` (สาเหตุ: `buildMeshHeaders()` ตั้ง `content-type: application/json` แต่ไม่มี body → `FST_ERR_CTP_EMPTY_JSON_BODY`)
  - [x] `profiles.permissions.test.js:335` Archive "fails with 403 ... without profiles:edit" ได้ `500` — แก้แบบเดียวกับข้อบน (เพิ่ม `payload: {}`)
  - [x] `profiles.permissions.test.js:375` Restore "succeeds with profiles:edit" ได้ `500` — เพิ่ม `payload: {}` ให้ POST `.../restore`
  - [x] `profiles.permissions.test.js:414` Reset Password "succeeds with profiles:edit" ได้ `404` — แก้ URL จาก `.../reset-password` เป็น `.../password` (ตรงกับ `profiles.route.js:52-53`)
  - [x] `profiles.permissions.test.js:456` Update Role "succeeds with roles:assign" ได้ `503` (ไม่มี auth-internal service ฟังที่ `127.0.0.1:3001` ใน sandbox) — ตัดสินใจ: mock/stand-up auth-internal สำหรับ test นี้ หรือ document ว่า test นี้ require `AUTH_INTERNAL_BASE_URL` จริงและคาดว่าจะ fail ใน sandbox-only run
  - [x] รัน `npm test` ใน `backend/service/staff` ให้ได้ 200/200 pass (หรือบันทึกเหตุผลที่ #6 ยังไม่ผ่านถ้าเป็น environment-only)

## 🟡 Suggestion — ของเดิมที่ carry มา + เก็บกวาดเพิ่มเติม

- [ ] เพิ่ม `StaffManagement.test.tsx`: mock `usePermission` ทั้งกรณีมี/ไม่มี `profiles:create`/`profiles:edit` แล้วตรวจ visibility ของปุ่ม "Add New Staff" และ Edit action

- [x] **Task R5-4: [Phase 3] staff logging/test cleanup ที่ carry มาจาก R3-10/R4-7**
  - [x] `profiles.service.js` — `assertPermission` รับ `{log}` แล้วแต่ทั้ง 5 call sites (lines ~78,87,138,178,213) ยังไม่ส่ง `log` เข้าไป — เดิน `request.log`/`reqId` ผ่าน wrapper functions (`assertAdminRole`, `assertPlatformAdmin`, `resolveListScope`, `resolveLookupScope`, `assertProfileScope`, `assertAdminLifecycleAccess`) จนถึง controller
  - [x] เพิ่ม unit test สำหรับ `PERMISSION_MODE` validation ใหม่ใน `env.test.js` (logic ถูกแล้ว แต่ไม่มี test คุม)
  - [x] `profiles.service.unit.test.js:362-401` — เปลี่ยนจาก `resetRuntimeEnvForTests()` ครั้งเดียวใน `after()` เป็น `afterEach` ตาม pattern `rbac.test.js:88-94`

- [x] **Task R5-5: [Phase 5] housekeeping ที่ carry มาจาก R3-/R4-10**
  - [x] `admin.route.js` — `genCheck.problem ?? problemPayload({...types.invalidToken, TOKEN_REFRESH_REJECTED...})` ยัง hardcode เพราะ `unauthorizedServiceOutcome()` (`auth.service.js:61-63`) ไม่เคยตั้ง `.problem` — พิจารณาให้ helper ตั้ง `.problem` เสมอ หรือ derive จาก `sendServiceProblem`/`codeForProblemType`
  - [x] `admin.service.js` (`deleteMenu`) — 3 จุด (line ~264, 280, 300) ตอบ `409` ด้วย `code: 'AUTH_INVALID_REQUEST'` (registered @ 400) ยังไม่ตรง พิจารณาเพิ่ม `AUTH_MENU_IN_USE`@409 ใน `codes.yaml`/`problem.js` แล้วใช้ให้ตรง
  - [x] เพิ่ม "fails with 403 without permission" test ให้ Restore/Reset-Password/Update-Role ใน `profiles.permissions.test.js` (ปัจจุบันมีแค่ Archive)

- [x] **Task R5-6: [Phase 4] AdminLayout cycle/depth test + act() warnings (carry จาก R3-9/R4-6)**
  - [x] เพิ่ม explicit test สำหรับ cycle/depth guard ของ menu tree builder (T6.11.1/T6.11.2)
  - [x] ซ่อม act() warnings ใน AuthContext.test.tsx และ AdminLayout.test.tsx โดยใช้ `await screen.findBy...` แทน `act(async () => userEvent...)` + `waitFor`

- [x] **Task R5-7: [Phase 1] index/docs cleanup ที่ carry มาจาก R3-11/R4-8**
  - [x] ตัดสินใจ: ต้องการ compound index `{type:1, ou_id:1}` บน `auth_menus` ตามที่ขอไว้เดิมหรือไม่ (ปัจจุบันมีแต่ `{ou_id:1, role:1}` ชื่อ `by_ou_role` บน `auth_users`) — ถ้าไม่ต้องการแล้วให้ปิด item นี้อย่างชัดเจนใน `tasks/plan.md`
  - [x] อัพเดต `openapi.yaml`: เพิ่ม 403 response ให้ endpoints ภายใน auth service (ที่ตอนนี้มี 401 แต่ตกหล่น 403) ตามที่เจอใน phase 3

- [x] `_mission-control/tasks/todo.md` — อัปเดต Phase A checkbox ให้ตรงสถานะจริง (งานเสร็จและมี test ผ่านหลายส่วนแล้ว)
