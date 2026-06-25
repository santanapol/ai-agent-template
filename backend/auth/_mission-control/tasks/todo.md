# Tasks: Active Branch Selector (Approach 2)

> อ้างอิง: [`plan.md`](./plan.md) · [`../SPEC-active-branch-selector.md`](../SPEC-active-branch-selector.md)
> path ทั้งหมดสัมพัทธ์กับ repo root `code-base/zero-platform/`

---

## Task 1: JWT home_branch_id claim + issueAccess signature

**Description:** เพิ่ม claim `home_branch_id` ใน access JWT และปรับ `issueAccess` ให้รับ `{ activeBranchId, homeBranchId }` โดย `branch_id = activeBranchId ?? homeBranchId` — backward compatible (ยังไม่มี endpoint, active ยังเป็น home เสมอ)

**Acceptance criteria:**

- [x] `signAccessJwt` ใส่ claim `home_branch_id`
- [x] `issueAccess(user, opts?)` คำนวณ `branchId = opts?.activeBranchId ?? user.branch_id` และ `homeBranchId = user.branch_id`
- [x] login/refresh เดิมยังออก token ได้ โดย `branch_id == home_branch_id`

**Verification:**

- [x] `cd backend/auth && npm test` (jwt-access + auth integration เดิมผ่าน)
- [x] เพิ่ม unit test: payload มี `home_branch_id`
- [ ] manual: decode token จาก `/auth/login`

**Dependencies:** None
**Files likely touched:**

- `backend/auth/src/lib/jwt-access.js`
- `backend/auth/src/modules/auth/auth.service.js` (`issueAccess`)
- `backend/auth/test/jwt-permissions.test.js` (หรือ test ใหม่)

**Estimated scope:** S (2-3 files)

---

## Task 2: Refresh row active_branch_id + survival

**Description:** เพิ่มฟิลด์ `active_branch_id` ใน `auth_refresh_tokens` (default null), copy ตอน rotate, `login()` ตั้ง null, และ `refresh()` ส่ง active จาก row ปัจจุบันเข้า `issueAccess`

**Acceptance criteria:**

- [x] `insertRefreshToken` เขียน `active_branch_id: null` เป็น default
- [x] `rotateRefreshTokenTxnBody` copy `active_branch_id` จาก current row → row ใหม่
- [x] `refresh()` เรียก `issueAccess(u, { activeBranchId: current.active_branch_id ?? null })`
- [x] `login()` ไม่ตั้ง active (null → token branch_id = home)

**Verification:**

- [x] `cd backend/auth && npm test`
- [x] unit test rotate: row ใหม่มี active_branch_id เท่าเดิม
- [x] refresh เดิมไม่พัง (regression)

**Dependencies:** T1
**Files likely touched:**

- `backend/auth/src/modules/auth/auth.repository.js`
- `backend/auth/src/modules/auth/auth.service.js` (`login`, `refresh`, `rotateRefreshTokenTxnBody`)
- `backend/auth/test/auth.integration.test.js`

**Estimated scope:** M (3 files)

---

## Checkpoint A (หลัง T1–T2)

- [x] `npm test` (auth) เขียว ทั้ง login/refresh/menus
- [x] token จาก login มี `home_branch_id == branch_id`
- [ ] **Human review**

---

## Task 3: Branch read-only connection + repository (su_branch)

**Description:** เปิด read-only connection ไป `gpp_777ww` และ repository `findByIdInOu(branch_id, ou_id)` บน `su_branch` (เลียนแบบ `agent-invoice/config/database-read.js`, `secondaryPreferred`)

**Acceptance criteria:**

- [x] `branch-read-db.js`: lazy connect ด้วย `MONGODB_URI_READ` + `MONGODB_DB_BRANCH`, มี close + ping
- [x] `branch-read.repository.findByIdInOu(branchId, ouId)` คืน branch หรือ null (match ทั้ง `_id` และ `ou_id`)
- [x] wiring connection ตอน bootstrap (app start) + เพิ่ม env ใน `.env.example`/`.env.prod`

**Verification:**

- [x] `cd backend/auth && npm test` (repo test แบบ mock/integration)
- [ ] manual: เรียก repo ด้วย branch จริงใน OU → ได้ doc; ข้าม OU → null

**Dependencies:** None (ทำขนานกับ T1/T2 ได้ แต่ chain ก่อน T5)
**Files likely touched:**

- `backend/auth/src/config/branch-read-db.js` (NEW)
- `backend/auth/src/modules/auth/branch-read.repository.js` (NEW)
- `backend/auth/src/app.js` (wiring) · `backend/auth/.env.example` · `backend/auth/.env.prod`

**Estimated scope:** M (3-5 files)

---

## Task 4: Register new error codes

**Description:** ลงทะเบียน RFC 7807 codes/types ใหม่สำหรับ branch switch

**Acceptance criteria:**

- [x] `codes.yaml` มี `AUTH_BRANCH_SWITCH_FORBIDDEN`(403), `AUTH_BRANCH_FORBIDDEN`(403), `AUTH_BRANCH_NOT_FOUND`(404)
- [x] problem types/`auth-problem-codes` map slug ↔ code ครบ
- [x] `application/problem+json` ตาม `coding-standard/auth/6-api-response-codes.md`

**Verification:**

- [x] `cd backend/auth && npm test` (problem/codes test)
- [x] `npm run lint`

**Dependencies:** None
**Files likely touched:**

- `backend/auth/codes.yaml` (หรือไฟล์ที่นิยาม)
- `backend/auth/src/lib/auth-problem-codes.js` · `backend/auth/test/problem.test.js`

**Estimated scope:** S (2-3 files)

---

## Task 5: POST /auth/me/active-branch (endpoint vertical)

**Description:** เพิ่ม endpoint สลับสาขา: validate role+OU, `$set active_branch_id` ที่ refresh row ปัจจุบัน (ไม่ rotate), ออก access token ใหม่, audit `auth.active_branch_changed`, อัปเดต openapi

**Acceptance criteria:**

- [x] role ที่อนุญาต + branch ใน OU → `200` + token ใหม่ (`branch_id`=active, `home_branch_id`=home)
- [x] role ไม่อนุญาต → `403 AUTH_BRANCH_SWITCH_FORBIDDEN`; ข้าม OU → `403 AUTH_BRANCH_FORBIDDEN`; ไม่พบ → `404`; ไม่มี refresh → `401`
- [x] เขียน `active_branch_id` ที่ row ปัจจุบัน โดย**ไม่** revoke/rotate
- [x] openapi path + schemas + responses ครบ (spectral ผ่าน)

**Verification:**

- [x] integration test ครบทุก branch ของ logic ข้างต้น
- [x] refresh-survival test: switch → refresh → branch_id ยัง active (AC-4)
- [x] `npm run lint`

**Dependencies:** T1, T2, T3, T4
**Files likely touched:**

- `backend/auth/src/modules/auth/auth.validator.js` · `auth.route.js` · `auth.controller.js` · `auth.service.js`
- `backend/auth/openapi.yaml` · test ใหม่ `test/active-branch.integration.test.js`

**Estimated scope:** L (5+ files) → ถ้าจะหั่น: 5a (service+repo logic+test), 5b (route+controller+validator+openapi)

---

## Checkpoint B (หลัง T3–T5)

- [x] integration + refresh-survival tests เขียว
- [x] `npm run lint` + spectral (openapi) ผ่าน
- [ ] **Human review** (API contract นิ่งก่อนแยกขนาน Phase 3/4)

---

## Task 6: Gateway forward x-user-home-branch

**Description:** เพิ่ม `JWT_CLAIM_HOME_BRANCH` (default `home_branch_id`), inject `x-user-home-branch` (optional, ไม่ reject ถ้าขาด), เพิ่มใน allowlist + forward ตาม canonical header order

**Acceptance criteria:**

- [x] token มี `home_branch_id` → upstream ได้ `x-user-home-branch`
- [x] token ไม่มี claim → ยังผ่าน (ไม่ `GATEWAY_CLAIM_REJECTED`) backward compat
- [x] header order ตาม `coding-standard/gateway/4-request-headers.md` (หลัง `x-user-branch`)

**Verification:**

- [x] `cd backend/gateway && npm test` (inject-context + proxy integration)
- [x] `npm run lint`

**Dependencies:** T1 (token ต้องมี claim ก่อนทดสอบ end-to-end จริง แต่ test gateway ใช้ token ปลอมได้)
**Files likely touched:**

- `backend/gateway/src/config/env.js` · `src/plugins/inject-context.js`
- `backend/gateway/src/app.js` · `src/proxy/register-proxies.js` · test ที่เกี่ยว

**Estimated scope:** M (4-5 files)

---

## Task 7: Staff self-profile uses home branch

**Description:** staff `user-context` อ่าน `x-user-home-branch` → `homeBranchId`; `assertProfileScope` self-check ใช้ `homeBranchId ?? branchId`

**Acceptance criteria:**

- [x] `userContext.homeBranchId` set จาก header (optional)
- [x] self-profile: ผ่านเมื่อ active ≠ home (เทียบ home); cross-branch scope เดิมไม่เปลี่ยน
- [x] ไม่มี header → fallback `branchId` (พฤติกรรมเดิม)

**Verification:**

- [x] `cd backend/service/staff && npm test` (profiles.service unit + integration)
- [x] `npm run lint`

**Dependencies:** T6 (ใช้ header จริง) — แต่ทดสอบแยกด้วย mock header ได้
**Files likely touched:**

- `backend/service/staff/src/plugins/user-context.js`
- `backend/service/staff/src/modules/profiles/profiles.service.js`
- `backend/service/staff/src/modules/profiles/tests/unit-test/profiles.service.unit.test.js`

**Estimated scope:** S (2-3 files)

---

## Checkpoint C (หลัง T6–T7) → AC-5, AC-6

- [x] gateway forward + backward-compat tests เขียว
- [x] staff self-profile (active≠home) ผ่าน; cross-branch ไม่ regress
- [ ] **Human review**

---

## Task 8: Frontend foundation (types + api + context)

**Description:** เพิ่ม type `home_branch_id`, `authApiClient.switchActiveBranch(branch_id)`, และ `AuthContext.switchBranch` ที่เรียก API แล้ว `applyToken`

**Acceptance criteria:**

- [x] `DecodedUser` มี `home_branch_id`
- [x] `switchActiveBranch(branch_id)` POST `/auth/me/active-branch` คืน TokenResponse
- [x] `AuthContext.switchBranch(branch_id)` → applyToken(ใหม่) → state อัปเดต (เมนู/permission refetch)

**Verification:**

- [x] `cd frontend/backoffice && npm test` (authApiClient + AuthContext)
- [x] `npm run lint`

**Dependencies:** T5 (API contract)
**Files likely touched:**

- `frontend/backoffice/src/types/auth.ts` · `src/lib/authApiClient.ts` · `src/contexts/AuthContext.tsx`
- test: `src/lib/authApiClient.test.ts`

**Estimated scope:** M (3-4 files)

---

## Task 9: Frontend branch switcher UI

**Description:** เพิ่ม `<Select>` สลับสาขาใน AdminLayout header (เฉพาะ 3 roles), โหลดรายการสาขา (reuse `GET /api/v1/invoices/agent`), เลือกแล้ว switchBranch + refetch หน้าปัจจุบัน; role อื่นแสดง Tag read-only เดิม

**Acceptance criteria:**

- [x] switcher แสดงเฉพาะ `platform_admin`/`support_admin`/`support`
- [x] `branch_admin`/`staff` ไม่เห็น switcher (Tag read-only เดิม)
- [x] เลือกสาขา → เรียก `switchBranch` → ข้อมูลหน้าปัจจุบัน (staff/invoices) refetch ตามสาขา
- [x] inactive branch แสดงในรายการพร้อม tag สถานะ, เรียง active ก่อน

**Verification:**

- [x] `cd frontend/backoffice && npm test` (AdminLayout switcher tests)
- [x] `npm run build`
- [ ] manual E2E: สลับสาขา → list เปลี่ยน → My Profile เปิดได้ → refresh active คงอยู่

**Dependencies:** T8 (+ T6/T7 ปล่อยจริงเพื่อ My Profile)
**Files likely touched:**

- `frontend/backoffice/src/layouts/AdminLayout.tsx`
- `frontend/backoffice/src/contexts/BranchContext.tsx` (optional NEW) หรือ state ใน AdminLayout
- `frontend/backoffice/src/lib/invoicesApiClient.ts` (reuse listInvoiceAgents)
- test: `src/layouts/AdminLayout.sidebar.test.tsx` / ใหม่

**Estimated scope:** M (3-5 files)

---

## Checkpoint D: Complete

- [x] vitest FE ครบ (visibility ตาม role, switch flow)
- [ ] manual E2E เต็ม flow (US-1..US-5)
- [ ] lint + test + build ผ่านทั้ง 4 แพ็กเกจ
- [ ] AC-1..AC-7 + Success Criteria ครบ
- [ ] **Human review** ก่อนเข้า `/code-build`

---

## Summary

| Task | Phase | Size | Deps  | Package    |
| ---- | ----- | ---- | ----- | ---------- |
| T1   | 1     | S    | —     | auth       |
| T2   | 1     | M    | T1    | auth       |
| T3   | 2     | M    | —     | auth       |
| T4   | 2     | S    | —     | auth       |
| T5   | 2     | L\*  | T1-T4 | auth       |
| T6   | 3     | M    | T1    | gateway    |
| T7   | 3     | S    | T6    | staff      |
| T8   | 4     | M    | T5    | backoffice |
| T9   | 4     | M    | T8    | backoffice |

\* T5 หั่นเป็น 5a/5b ได้ถ้าเกิน 1 รอบโฟกัส
