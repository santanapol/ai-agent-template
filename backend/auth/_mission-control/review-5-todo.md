# Review #5 — Action Items (Round 6 fixes)

ที่มา: [`review-5-dynamic-permission.md`](./review-5-dynamic-permission.md) (รีวิว 2026-06-15, verification ของ review-4-todo.md)
ลำดับการแก้: Critical (CI แดงตอนนี้) → Important (registry violation) → Suggestion (ของเดิมที่ carry มา)

## 🔴 Critical — ต้องแก้ก่อน merge (CI แดงอยู่ตอนนี้)

- [x] **Task R6-1: [Frontend] แก้ 6 TS errors + 2 eslint errors ที่ทำให้ `tsc -b`/`npm run build`/`eslint .` fail (NEW-CRITICAL-3)**
  - [x] `src/components/staff/StaffTable.test.tsx:3` — ลบ `import React ...` ที่ไม่ได้ใช้แล้ว (TS6133)
  - [x] `src/components/staff/StaffTable.test.tsx:33,39` — เพิ่ม field ที่จำเป็นของ `StaffProfile` (`user_id`, `ou_id`, `branch_id`, `user`) ให้ `mockProfiles` entries ตาม `types/staff.ts:22-33` (TS2322 ×2)
  - [x] `src/contexts/AuthContext.test.tsx:2` — ลบ `act` ที่ import มาแต่ไม่ได้ใช้ (TS6133 + eslint no-unused-vars)
  - [x] `src/pages/StaffManagement.test.tsx:6` — ลบ `import { AuthProvider } ...` ที่ไม่ได้ใช้ (local mock factory shadow ไปแล้ว) (TS6133 + eslint no-unused-vars)
  - [x] `src/pages/StaffManagement.test.tsx:43` — แก้ mock ของ `listProfiles` ให้ตรงกับ `ApiEnvelope<StaffProfile[]>` (`types/staff.ts:8-15`): เปลี่ยน `meta` → `pagination`, เพิ่ม `success`/`code` ที่จำเป็น (TS2353)
  - [x] รัน `npx tsc -b && npx eslint . && npm run build` ใน `frontend/backoffice` ให้ผ่านทั้งหมด

- [x] **Task R6-2: [Staff] แก้ 1 lint error + 4 ไฟล์ที่ fail `prettier --check` ที่ทำให้ `npm run ci` fail (NEW-CRITICAL-4)**
  - [x] `src/modules/profiles/tests/unit-test/profiles.service.unit.test.js:1` — ลบ `after` ที่ import จาก `node:test` แต่ไม่ได้ใช้ (เหลือใช้แค่ `afterEach`)
  - [x] รัน `npx prettier --write` บน 4 ไฟล์: `src/config/tests/unit-test/env.test.js`, `src/lib/test-helpers/mock-auth-internal-server.js`, `src/modules/profiles/profiles.controller.js`, `src/modules/profiles/profiles.service.js`
  - [x] รัน `npm run ci` ใน `backend/service/staff` ให้ผ่านทั้ง chain (205/205 + lint + format + audit ✅)

## 🟠 Important — registry/spec violation

- [x] **Task R6-3: [Auth] register `AUTH_MENU_IN_USE`@409 (NEW-IMPORTANT-1)**
  - [x] เพิ่ม `AUTH_MENU_IN_USE` (httpStatus 409) ใน `coding-standard/auth/codes.yaml` (ตามรูปแบบเดียวกับ `AUTH_ROLE_PERMISSION_IN_USE` ที่ทำไปใน R3-4/R3-5)
  - [x] เพิ่ม `AUTH_MENU_IN_USE` ใน `openapi.yaml`'s `Problem.code` enum (~line 1251-1266) และเพิ่มคำอธิบาย 409 ให้ `DELETE /auth/admin/menus/{key}`
  - [x] รัน `spec:codes`/`spec:lint` ให้ผ่าน

## 🟡 Suggestion — ของเดิมที่ carry มา + เก็บกวาดเพิ่มเติม

- [x] **Task R6-4: [Frontend] แก้ `StaffManagement.test.tsx` ให้ Edit-action assertion ไม่เป็น no-op**
  - [x] mock `staffApi.listProfiles` ใน test case "permission granted" ให้คืน profile อย่างน้อย 1 รายการ (ไม่ใช่ `data: []`) เพื่อให้ table render แถวจริง แล้วตรวจ visibility ของปุ่ม Edit (`StaffManagement.tsx:362`) ตาม `profiles:edit`

- [x] **Task R6-5: [Frontend] ปิด gap ของ T6.11.1/T6.11.2 ใน AdminLayout test (carry จาก R5-6)**
  - [x] เพิ่ม test สำหรับ T6.11.1 (orphaned `parent_key` — parent ไม่อยู่ใน `menus`) ว่าไม่ crash และ item กลายเป็น top-level item
  - [x] T6.11.2: เพิ่ม test สำหรับ true cycle (`A→B→A`) จริงๆ — confirm ว่า algorithm handle ได้แบบ silent-drop (ไม่ crash, ไม่ warning) + แยก test เดิม (depth-guard บน non-circular chain) ออกจากชื่อ T6.11.2 เพื่อไม่ให้สับสน

- [x] **Task R6-6: [Auth] ปิด index decision ที่ carry มา 4 รอบแล้ว (R3-11 → R4-8 → R5-7 → ตอนนี้)**
  - [x] ตัดสินใจและเขียนลง `tasks/plan.md` (section "Decisions Log"): **ไม่เพิ่ม** compound index `{type:1, ou_id:1}` บน `auth_menus` — registry ขนาดเล็ก ไม่คุ้มกับ write-amplification ของ index เพิ่ม; `by_ou_role` บน `auth_users` เป็นคนละ decision คนละจุดประสงค์ (ไม่ใช่ superseded)
