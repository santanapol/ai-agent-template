# Code Review #1 — Dynamic Permission Rollout (Phase 1–5)

**Date:** 2026-06-15
**Scope:** diff `main...HEAD` (branch `feature/auth-dynamic-permissions`) — 82 files, +6,602 / −204 lines
**Method:** `/review` (code-review-and-quality, 5-axis: Correctness, Readability, Architecture, Security, Performance)
**Reviewers:** 5 parallel review agents (1 ต่อ phase ตาม `ROADMAP.md`) + cross-check จาก main session

---

## Decision Summary

| Phase                               | พื้นที่                          | PR  | Verdict            | Critical | Important |
| ----------------------------------- | -------------------------------- | --- | ------------------ | -------- | --------- |
| 1 — Auth (Dynamic Permission in DB) | `backend/auth` core              | #12 | ✅ Approve         | 0        | 2         |
| 2 — Gateway (`x-user-permissions`)  | `backend/gateway`                | #13 | ✅ Approve         | 0        | 0         |
| 3 — Staff (dual-check)              | `backend/service/staff`          | #14 | ❌ Request Changes | 1        | 3         |
| 4 — Frontend (Menu + guards)        | `frontend/backoffice`            | —   | ❌ Request Changes | 1        | 2         |
| 5 — Permission Admin API            | `backend/auth/src/modules/admin` | —   | ❌ Request Changes | 3        | 4         |

ดู action items แบบ checklist ที่ [`review-1-todo.md`](./review-1-todo.md)

---

## Cross-phase blockers เด่น (ยืนยันด้วยการอ่านโค้ดจริงแล้ว)

1. **[1↔5] `permissions:manage` ไม่อยู่ใน seed data** — `backend/auth/scripts/seed-data/permissions.js:78` ให้ `platform_admin: ['profiles:*', 'roles:assign']` แต่ `backend/auth/src/modules/admin/admin.route.js:62` gate ทุก endpoint ของ Admin API ด้วย `anyPermissionMatches(permissions, 'permissions:manage')` → ถ้า deploy ตามกฎเหล็ก (seed ก่อน deploy) **จะไม่มีใครเรียก Admin API ได้เลยแม้แต่ platform_admin**
2. **[Phase 3] `profiles:create` vs `profiles:edit` ผิดที่ archive/restore** — `profiles.service.js:763` เรียก `assertAdminRole(userContext)` (= เช็ค `profiles:create`) ซ้ำกับ `assertAdminLifecycleAccess(..., "profiles:edit")` ที่ line 777 ซึ่งถูกต้องตาม SPEC อยู่แล้ว → enforce mode จะ 403 ผิดสำหรับผู้ใช้ที่มี `profiles:edit` แต่ไม่มี `profiles:create`
3. **[Phase 4] `npm run build` (tsc) fail จริง 6 errors** — ขัดกับสถานะ ROADMAP "เสร็จสมบูรณ์ ผ่าน pre-launch review"
4. **[Phase 5] `revoke_sessions` ไม่ stale token ของ admin ที่เรียกเอง** — `requirePermissionManage` ไม่เช็ค `token_gen`
5. **[Phase 5] ไม่ enforce กฎ "escalating action ห้ามอยู่ใต้ wildcard domain"** ใน Admin API validation
6. **[Phase 5] `deleteRolePermission` ไม่เช็ค active users** ก่อนลบ Global Default mapping (`countUsersInScope` มีแต่เป็น dead code)

---

## Phase 1 — Auth: Dynamic Permission in DB (PR #12)

### Verdict: ✅ Approve

### Important

- **`backend/auth/scripts/seed-data/permissions.js`** (cross-phase, ดูข้อ 1 ด้านบน) — `platform_admin.menu_keys` ไม่มี `permissions:manage`/`permissions:*` ทำให้ Phase 5 Admin API ใช้งานไม่ได้หลัง deploy ตามลำดับปกติ
  - **แก้:** เพิ่ม action node domain `permissions` (เช่น `permissions:manage`) ใน `seedMenus` และเพิ่มเข้า `platform_admin.menu_keys` ใน `seedRolePermissions`

- **`backend/auth/src/modules/auth/auth.service.js:262-271`** (`warnIfAccessJwtOversize`) — ใช้ `this.log.warn(...)` ตรงๆ ไม่มี `?.` ต่างจาก pattern ที่เหลือในคลาส (`this.log?.warn?.()`, เช่น `audit()` line 99) JSDoc ระบุ `log` เป็น optional (default `null`) — ถ้า construct `AuthService` โดยไม่ส่ง logger และ JWT เกิน soft size limit จะ throw `TypeError` บน `login`/`refresh` จริง
  - **แก้:** เปลี่ยนเป็น `this.log?.warn?.(...)`

### Suggestion

- `backend/auth/scripts/seed-permissions.js:15-16` — `MAX_DEPTH`/`MENU_TYPES` เป็น dead code หลังย้าย validation ไป `src/lib/permission-validation.js` (มี copy ของตัวเองแล้ว ที่ line 3-4) — ลบทิ้ง
- `backend/auth/src/modules/auth/auth.repository.js` (`findActionMenusForOu` ใน `getMyMenus`) — query `{ type: 'action', ou_id: { $in: [null, ouId] } }` ไม่มี index ครอบ `type`/`ou_id` → collection scan ทุกครั้งที่ `GET /auth/me/menus` ถูกเรียก พิจารณา compound index `{ type: 1, ou_id: 1 }` ถ้า registry โตขึ้น
- `backend/auth/_mission-control/tasks/plan.md` และ `tasks/todo.md` — เนื้อหาทั้งสองไฟล์เป็นของ "Phase A" (Phase 5 Admin API) ไม่ใช่ Phase 1 แต่อยู่ใน shared `_mission-control/tasks/` ทำให้สับสนว่าเป็น task tracker ของ phase ไหน (เป็นแค่ documentation hygiene ไม่ใช่บั๊ก)
- `tasks/todo.md` ทุกข้อยังเป็น `- [ ]` ทั้งที่ `admin.integration.test.js` (292 บรรทัด) มีอยู่และผ่านแล้ว — todo ตกหล่นจากความเป็นจริง

### Cross-cutting contract notes

1. **Permission Matching Contract (canonical)** — `backend/auth/src/lib/permission-match.js` ถูกต้อง, isolate ดี (`isWildcardEntry`, `matchesPermission`, `anyPermissionMatches` เป็น pure functions ไม่มี external deps — portable สำหรับ staff/frontend) `test/permission-match.test.js` (16 assertions / 7 tests) ครอบ exact/wildcard/cross-domain-reject/malformed-as-literal/non-string — เพียงพอสำหรับ port
2. **Header contract** — `permissions` claim ใน JWT และ response body ของ login/refresh เป็น raw `menu_keys` (ไม่ expand wildcard) ยืนยันโดย `jwt-permissions.test.js` + `auth.integration.test.js`; ไม่มี mapping → `permissions: []` (deny-by-default) — ยืนยันโดย "ghost user" integration test
3. **`key` immutable / `parent_key`-only moves** — `permission-validation.js` enforce unique key, parent ต้องเป็น `type: menu`, ไม่มี cycle, depth ≤ 3, action node เป็น leaf เสมอ; `auth_menus.key` มี unique index (`uniq_menu_key`)
4. **Escalating action ไม่อยู่ใต้ wildcard** — `roles:assign` (domain `roles`) แยกจาก `profiles:*` ของ `platform_admin`/`branch_admin` ถูกต้องตามกฎ — กรณีเดียวที่ยังไม่ผ่านคือ `permissions:manage` ที่ยังไม่ถูก seed (ดู Important ข้างบน)
5. **Deploy rule (seed ก่อน deploy)** — `seed-permissions.js` idempotent (upsert `$setOnInsert`/`$set`, preserve `cr_*` audit fields), default ไม่ลบอะไร, `--prune` report ก่อนลบ — ครบตามที่ ROADMAP ต้องการ ยกเว้นยังไม่ provision คีย์ `permissions:manage` ที่ Phase 5 ต้องใช้

### Verification

- `node --test test/permission-match.test.js test/permission-resolution.test.js test/jwt-permissions.test.js test/env.test.js` → **23/23 pass**
- `node --test test/seed-permissions.test.js` (mongodb-memory-server) → **17/17 pass**
- `node --test test/me-menus.integration.test.js test/permission-repository.integration.test.js` → **15/15 pass**
- `node --test test/auth.integration.test.js` → **19/19 pass**
- รวม **74/74 pass**
- `npx eslint` → 0 errors (2 ignore-warnings ตามปกติ)
- `npx spectral lint openapi.yaml` + `validate-auth-openapi-problem-codes.mjs` → pass

---

## Phase 2 — Gateway: Forward `x-user-permissions` (PR #13)

### Verdict: ✅ Approve

### Suggestion

- `backend/gateway/src/plugins/inject-context.js:43` — `request.log.debug({ err }, 'claim normalization or validation failed')` log raw `Error` object (รวม stack) ขณะที่ sibling pattern `jwt-auth.js:72` ใช้ derived code เท่านั้น (`{ jwtVerifyFailedCode: code }`) ปัจจุบัน error message เป็น static string ไม่มี claim value ฝังอยู่ — ยังไม่รั่ว แต่ไม่ตรง convention; ถ้าจะให้ปลอดภัยกว่า ใช้ `{ claimRejectReason: err?.message }`
- `backend/gateway/openapi.yaml` — ไม่มี parameter entry สำหรับ `x-user-permissions` (เหมือน header injected อื่นๆ ที่ไม่มีเช่นกัน — ไม่ใช่ regression แต่ flag ไว้เผื่อ phase หน้าจะ formalize)

### Cross-cutting contract notes

1. **Header contract** — `normalizePermissionsClaim` (`src/lib/claims.js:75-94`) ทำ `value.join(',')` ตรงๆ ไม่ expand wildcard; missing/null claim → `''`; malformed shape → throw → `GATEWAY_CLAIM_REJECTED` (401) ครบทั้ง unit + integration tests
2. **Anti-spoofing ครบ 3 ชั้นในพีอาร์เดียว**:
   - `DANGEROUS_HEADERS` (`register-proxies.js:7`) เพิ่ม `x-user-permissions` → strip จาก inbound
   - `trustedHeaders` (`register-proxies.js:49`) ดึงจาก `ctx['x-user-permissions']` (จาก JWT ที่ verify แล้ว) เท่านั้น
   - `TRUSTED_HEADER_KEYS` (`app.js:22`) เพิ่ม `x-user-permissions` เข้า duplicate-header guard → 401 ถ้ามี header ซ้ำ
   - ทดสอบครบทั้ง 3 จุดใน integration tests
3. **Forward ให้ทุก upstream** — `registerProxies` apply `rewriteRequestHeaders` เดียวกันให้ทุก route ใน loop — ไม่มี per-route special-case
4. **Always inject แม้ว่าง** — `inject-context.js:61` set `x-user-permissions` แบบไม่มีเงื่อนไข (ต่างจาก `if-match` ที่ conditional)
5. **Refactor "simplify claims normalizer/if-match"** — ตรวจกับ `main` แล้ว equivalent behavior, อ่านง่ายขึ้นเล็กน้อย ไม่มี regression
6. **Performance** — O(n) ต่อ request, ไม่มี nested loop/I-O เพิ่ม

### Verification

- `node --test test/*.test.js test/*/*.test.js` (จาก `backend/gateway/`) → **66/66 pass**
- `npm run lint` clean, `npm run format:check` pass
- `npm run spec:lint` 0 errors, `npm run spec:codes` pass
- ไม่มี dependency เปลี่ยนแปลง (ตรง Tech Stack constraint ของ SPEC)

---

## Phase 3 — Staff: Permission checks (dual-check) (PR #14)

### Verdict: ❌ Request Changes

### Critical

- **`backend/service/staff/src/modules/profiles/profiles.service.js:763`** (`transitionProfileStatus`, ใช้โดย `archiveProfile`/`restoreProfile`) — เรียก `assertAdminRole(userContext)` ซึ่ง resolve เป็น `assertPermission(userContext, "profiles:create", { legacyRoleCheck: isAdminRole })` แต่ตาม `SPEC.md` (line 29-30) และ `openapi.yaml` ("Requires permission `profiles:edit`") archive/restore ต้องใช้ **`profiles:edit`** — line 777 มี `assertAdminLifecycleAccess(existing.profile, userContext, "profiles:edit")` ที่ถูกต้องอยู่แล้ว
  - **ผลกระทบ:** enforce mode → ผู้ใช้ที่มี `profiles:edit` แต่ไม่มี `profiles:create` จะถูก 403 `PERMISSION_DENIED` ผิด
  - **ทำไม test ไม่จับ:** ทุก fixture ที่ทดสอบ archive/restore ใน dual mode ใช้ role-based fallback หรือ `permissions: ["profiles:*", "roles:assign"]` ซึ่ง `profiles:*` cover ทั้ง `profiles:create` และ `profiles:edit`
  - **แก้:** ลบบรรทัด 763 ทิ้ง (ซ้ำซ้อนและ action key ผิด)

### Important

- **`backend/service/staff/src/config/env.js:56`** — `permissionMode: process.env.PERMISSION_MODE || "dual"` ไม่ validate ค่า ถ้า typo (`"Dual"`, `"enforced"`) จะหลุดเข้า branch ที่ไม่ใช่ `"dual"` ใน `assertPermission` → enforce โดยไม่มี startup error
  - **แก้:** validate ค่าเป็น `["dual","enforce"]` ตอน startup, throw หรือ warn+default `"dual"`

- **fallback-hit warn log ไม่มี test คุม** — `profiles.service.js:58-61` (`logger.warn({ action_key, role }, "permission dual-check fallback used")`) คือ signal หลักของเกณฑ์ "0 hit 7 วันติด → switch enforce" ตาม SPEC Resolved 2 แต่ `SPEC.md` Testing Strategy item 4 ที่ระบุให้ test สิ่งนี้ยังไม่ถูก implement
  - **แก้:** เพิ่ม unit test mock/spy `logger.warn` ยืนยัน shape `{ action_key, role }`

- **enforce-mode integration coverage ไม่ครบ** — `profiles.permissions.test.js` คุมแค่ `GET /profiles` (list) และ `POST /profiles` (create) ใน enforce mode ส่วน archive/restore/reset-password/`PATCH /profiles/:id/role` ไม่มีเลย — เป็นช่องที่ปล่อยให้ Critical ข้างบนหลุดมา
  - **แก้:** เพิ่ม enforce-mode integration test สำหรับ endpoint ที่เหลือทั้งหมดตาม openapi permission table

### Suggestion

- `openapi.yaml`/`openapi-via-gateway.yaml` — `InvalidUserContext` 403 ถูกแทนที่ด้วย `PermissionDenied` ทั่วทุก endpoint แต่ service ยังคง throw `INVALID_USER_CONTEXT` (403) สำหรับ scope mismatch (เช่น `profiles.service.js:217,228,147,101/112,742`) — เก็บทั้งสอง ref ไว้ใต้ `403` หรือ broaden description
- `profiles.service.js:190-195` — `assertProfileScope` JSDoc ไม่ได้อัปเดต parameter `actionKey`
- `src/lib/permission-match.js:1` — staff port ไม่มี top-of-file contract comment เหมือนตัว canonical — ใส่ไว้เพื่อ remind ว่าต้อง sync
- `openapi.yaml` — `PATCH /profiles/{profileId}/role` (`roles:assign`) ยังไม่ถูก document ใน openapi เลย (pre-existing gap, แต่ phase นี้คือที่ wire `roles:assign` ควรปิดช่องนี้ด้วย)
- `profiles.service.js:58` — fallback-hit log ใช้ module-level `logger` ไม่ใช่ request-scoped → ไม่มี `reqId` correlation พิจารณาส่ง `request.log`

### Cross-cutting contract notes

- **permission-match parity** — `src/lib/permission-match.js` logic เหมือน canonical 100% (ต่างแค่ formatting); test file mirror ครบ 8 group ของ `backend/auth/test/permission-match.test.js`
- **Header parsing** — `user-context.js:33,57` อ่าน `x-user-permissions` ผ่าน `readHeader` เดียวกับ header อื่น, empty string → `[]` (deny-by-default), ไม่ 403 ถ้า header หาย (transition-safe)
- **duplicate-header guard** — `duplicate-header.js:12` เพิ่ม `x-user-permissions` เข้า `CRITICAL_HEADERS`, ทดสอบด้วย raw HTTP → 400 `INVALID_HEADER`
- **Dual-check/PERMISSION_MODE** — `assertPermission` (line 46-70) ถูกต้องตาม truth table 4 กรณี ยกเว้นบั๊กที่ critical ข้างบน และไม่มี validation ของค่า `PERMISSION_MODE` เอง
- **Escalating action (`roles:assign`)** — `assertPlatformAdmin` เช็ค `roles:assign` (domain แยก), `profiles:*` คัฟเวอร์ไม่ถึง; legacy fallback เฉพาะ `role === "platform_admin"` (เข้มกว่า `isAdminRole`) — ไม่มี privilege escalation path
- **Deny-by-default** — `[]` permissions → `anyPermissionMatches` false → enforce mode = 403 เสมอ (เว้น dual + legacy ผ่าน) — fail-closed ถูกต้อง
- **SPEC "Resolved 2"** documented ชัดเจน (line 187-191) แต่ enforceability ขึ้นกับ fallback-hit log ที่ยังไม่มี test (ดู Important)

### Verification

- Unit tests (`permission-match`, `user-context`, `rbac`, `profiles.service.unit`, `auth-internal.client.unit` ฯลฯ) → **66/66 pass**
- `npm test` เต็ม: **141 pass / 1 fail / 51 cancelled** — ทั้งหมดเป็น integration tests ที่ fail ที่ `before()` ด้วย `ECONNREFUSED 127.0.0.1:27017` (ไม่มี MongoDB ใน sandbox รีวิว) — **`profiles.permissions.test.js` (296 บรรทัดใหม่) ยังไม่ถูกรันยืนยัน**
- `npx eslint` → clean

---

## Phase 4 — Frontend: Menu + guards

### Verdict: ❌ Request Changes

### Critical

- **`npm run build` (`tsc -b && vite build`) fail — 6 TS errors** (ยืนยันแล้วว่า `main` build ผ่าน 0 errors, `HEAD` ไม่ผ่าน — ขัดกับ ROADMAP "เสร็จสมบูรณ์ ผ่าน pre-launch review" และ SPEC Success Criteria #5)
  - **`frontend/backoffice/src/layouts/AdminLayout.tsx:91-97, :215`** — TS2322: `MenuItemType.children?: MenuItemType[]` (optional) ไม่ตรงกับ antd `SubMenuType<T>.children: ItemType<T>[]` (ไม่ optional) ที่ `items={menuItems}` line 215
    - **แก้:** ทำให้ `children` เป็น array เสมอ (default `[]`) หรือ type ให้ตรง `ItemType<MenuItemType>[] | undefined`
  - **`PermissionGuard.test.tsx:4,7`, `usePermission.test.ts:3`, `AdminLayout.test.tsx:4,6`** — TS1484: `AuthContextValue`/`DecodedUser` ถูก import เป็น value แต่เป็น type-only ภายใต้ `verbatimModuleSyntax: true`
    - **แก้:** ใช้ `import { useAuth, type AuthContextValue } from '...'` / `import type { DecodedUser } from '...'`
  - **หมายเหตุ:** `npm test` (vitest 16/16) และ `npm run lint` ผ่านทั้งคู่ — ไม่เคยรัน `tsc` จึงไม่จับเคสนี้

### Important

- **Staff Management Create/Edit ยังไม่ถูก permission-gate** — `src/pages/StaffManagement.tsx:326` (Create button) และ `:356` (Edit action) render แบบไม่มีเงื่อนไข `usePermission` ไม่ถูก import ใน `src/pages/` เลย แต่ SPEC Success Criteria #3 / Objective #3 และ `todo.md` T6.13 ต้องการให้ปุ่มเหล่านี้ซ่อนถ้าไม่มี `profiles:create`/`profiles:edit`
  - **แก้:** gate ด้วย `usePermission('profiles:create')` / `usePermission('profiles:edit')`

- **ไม่มี AuthContext integration test** — SPEC Testing Strategy item 4 ("login/refresh response with `permissions` → stored in AuthContext; `getMyMenus` → update menu state") ไม่มี test ตรงๆ ใน `src/contexts/` (มีแค่ทดสอบผ่าน mocked `useAuth` ใน `AdminLayout.test.tsx`)
  - **แก้:** เพิ่ม integration test ของ `AuthContext.tsx` (`applyToken`/menu-refetch effect)

- `frontend/backoffice/src/types/auth.ts:5` — `permissions?: string[]` เป็น optional พร้อมคอมเมนต์ `// permissions might be optional or string[]` ทั้งที่ SPEC Assumption #1 ระบุว่า login/refresh ตอบ `permissions: string[]` (required) — deny-by-default ยัง work เพราะ `data.permissions || []` แต่ควร confirm contract กับ Phase 1 แล้ว tighten type

### Suggestion

- `AdminLayout.tsx:210` — `key={defaultOpenKeys.join(',')}` force remount ทั้ง `<Menu>` ทุกครั้งที่ navigate ข้าม submenu — ใช้ `openKeys`/`onOpenChange` แบบ controlled จะเลี่ยง remount ได้ (impact ต่ำ)
- `AdminLayout.tsx:101-147` — menu tree builder ไม่มี cycle/depth guard เป็น test case (T6.11.1/T6.11.2 ใน todo.md) แม้ algorithm ปัจจุบัน safe โดยธรรมชาติ (2-pass, วาง node ครั้งเดียว) — เพิ่ม test ให้ explicit
- `AdminLayout.test.tsx` — มี `act(...)` warnings จาก async effect ที่ยัง resolve อยู่ตอน assert — ใช้ `await screen.findBy...` หรือ `act(async () => {})`
- `AuthContext.tsx:107-111` — `Promise.resolve().then(() => {...})` ก่อนเรียก `getMyMenus()` ไม่จำเป็น — set state ตรงๆ ที่ต้นของ effect จะ idiomatic กว่าและลด window ที่ `menuLoading` ยัง false ทั้งที่ fetch กำลังเริ่ม

### Cross-cutting contract notes

- **`permissionMatch.ts` parity** — port ตรงกับ canonical 1:1 (logic + 8 test groups ทั้งหมด, vitest idiom) ไม่พบ divergence
- **ไม่ decode JWT เพื่อเอา permissions** — `decodeJwt` ใช้แค่ identity claims (`sub`, `role`, `ou_id`, `branch_id`); `permissions` มาจาก response body เท่านั้น
- **`key`/`parent_key`-driven menu** — `menuItems` useMemo ใช้ `node.key`/`node.parent_key` เป็น source of truth, `label` เป็น display-only
- **Deny-by-default** — ตรวจ end-to-end: `usePermission` (`anyPermissionMatches(permissions||[], key)`), `PermissionGuard` (loading→spinner, ไม่มี permission→redirect `/403`), `AuthContext` defaults `[]`/`false`, `AdminLayout` skip unmapped keys — ไม่มี path ใดที่ default เป็น "show"
- **Escalating action gating** — `/staff` guard ด้วย `profiles:list` (specific key, ไม่ wildcard) — ถูกต้อง แต่ `roles:assign` ไม่มี representation ใน frontend เลย (ไม่มีใน `MENU_UI`/guard/`usePermission`) — ถ้ามี UI สำหรับ role assignment ต้อง wire เข้าระบบ permission ด้วย, ถ้ายังไม่มี UI ก็ out of scope
- **Client-side guard = UX only** — สอดคล้องกับ SPEC ("ห้ามตัดสินใจ authorization จริงฝั่ง frontend") — accepted risk ตาม SPEC ไม่ใช่ gap ของ phase นี้

### Verification

- `npx vitest run` (4 test files) → **16/16 pass** (มี non-fatal `act()` warnings ใน `AdminLayout.test.tsx`)
- `npx eslint .` → clean
- `npx tsc -b` → **FAIL — 6 errors** (ดู Critical) → `npm run build` ไม่ผ่าน

---

## Phase 5 — Permission Admin API

### Implementation status

โค้ดเป็น implementation จริงและทำงานได้ ~85% ของ `SPEC-permission-admin-api.md` (ทั้ง 7 endpoints wire ครบ, JSON-schema validation, audit log, optimistic locking, self-lockout guard, integration test 13/13 pass) — **ไม่ใช่ scaffold ทิ้งไว้** แต่ ROADMAP ยังระบุสถานะ "spec approved, ready for /plan" ซึ่งไม่ตรงกับโค้ดจริงแล้ว ส่วนที่เหลือ 15% คือรายการความเสี่ยงสูงสุดที่ ROADMAP เองระบุไว้ (escalating-action guard, active-user guard ก่อนลบ, revoke_sessions self-staleness)

### Verdict: ❌ Request Changes

### Critical

1. **`revoke_sessions` ไม่ stale token ของ admin ที่เรียกเอง** — `admin.route.js:37-86` + `require-access-bearer.js`: `requireAccessBearer` เก็บ `request.accessTokenGen = payload.token_gen` แต่ `requirePermissionManage` ไม่เคยเทียบกับ `auth_users.access_token_gen` ถ้า `revoke_sessions: true` bump `access_token_gen` ของ platform_admin ที่ token หลุด token เดิมยังเรียก `/auth/admin/*` ต่อได้จนกว่า `ACCESS_TOKEN_TTL_SECONDS` หมด (default 15 นาที) — ขัด "เคสเร่งด่วน" ตาม spec
   - **แก้:** เรียก `authService.assertAccessTokenGenMatches({ user_id_hex, token_gen_claim: request.accessTokenGen })` ใน `requirePermissionManage` แบบเดียวกับ `getMyMenus`

2. **ไม่มีการ enforce "escalating action ห้ามอยู่ใต้ wildcard domain"** — `permission-validation.js` (7 rules) และ `admin.validator.js`/`admin.service.js` ไม่มีแนวคิด "escalating action" เลย — `POST /auth/admin/menus` สามารถสร้าง action key ใหม่ในโดเมนที่ role อื่นถือ `domain:*` อยู่แล้ว แล้วเกิด privilege escalation ทันที (เช่น สร้าง `profiles:roles_assign` ใต้ domain `profiles` ที่ `branch_admin` ถือ `profiles:*` อยู่)
   - **แก้:** เพิ่ม validation rule ที่ reject/flag การสร้าง action key ใหม่ที่ domain prefix ถูก grant เป็น `domain:*` อยู่แล้วในที่ใดที่หนึ่ง เว้นแต่ allow-list

3. **`deleteRolePermission` ไม่เช็ค active users ก่อนลบ Global Default mapping** — `admin.service.js:449-508` มีแค่ hardcoded block สำหรับ `role === 'platform_admin'` (line 482) role อื่น (เช่น `branch_staff`) ลบ `(null, role)` ได้แม้มี user ใช้อยู่ → ผู้ใช้เหล่านั้น fallback เป็น `permissions: []` ทันทีที่ refresh token `AdminRepository.countUsersInScope` (`admin.repository.js:70-72`) มีอยู่แต่เป็น dead code — ดูเหมือนตั้งใจไว้แต่ไม่ wire
   - **แก้:** เรียก `countUsersInScope(ouId, role)` ก่อนลบ ถ้า > 0 ต้องมี `?confirm=true`/body flag (409 ถ้าไม่มี) ตามกฎ ROADMAP "Never"

### Important

4. **`admin.route.js:46-53,64-72,76-84`** — `type: types.forbidden || 'AUTH_FORBIDDEN'` — `problemTypes()` ไม่มี key `forbidden` → `types.forbidden` เป็น `undefined` เสมอ → `type` ตกเป็น literal string `'AUTH_FORBIDDEN'` ซึ่งละเมิด `Problem.type` schema (`format: uri`) ที่ใช้ทั้ง service
   - **แก้:** เพิ่ม `forbidden: \`${b}/forbidden\``ใน`problemTypes()`แล้วใช้ตรงๆ (ตัด`||` fallback)

5. **Error codes ไม่ได้ลงทะเบียน** — `AUTH_FORBIDDEN`, `AUTH_MENU_NOT_FOUND`, `AUTH_PRECONDITION_FAILED`, `AUTH_ROLE_PERMISSION_NOT_FOUND` ไม่อยู่ใน `coding-standard/auth/codes.yaml` หรือ openapi `Problem.code` enum — `spec:codes` ไม่จับเพราะ admin paths ไม่มี problem example ให้เช็ค `AUTH_MENU_NOT_FOUND`/`AUTH_ROLE_PERMISSION_NOT_FOUND` ยังใช้ `type: this.types.userNotFound` ผิดคู่กับ `code`
   - **แก้:** เพิ่ม 4 codes เข้า `codes.yaml` (httpStatus 403/404/412/404) + openapi enum + เพิ่ม 4xx examples ใน admin paths

6. **Optimistic locking ไม่ atomic (TOCTOU)** — `admin.service.js:101-176, 190-301`: `updateMenu`/`deleteMenu` เทียบ `If-Match` กับ `existing.upd_date` ใน application code แล้วเรียก `repo.updateMenu(key, doc)`/`repo.deleteMenu(key)` ที่ filter ด้วย `{key}` เท่านั้น — สอง concurrent PATCH ด้วย If-Match เดิม (stale) ผ่าน app-level check ได้ทั้งคู่
   - **แก้:** ส่ง `existing.upd_date` เข้า filter ของ repo (`{key, upd_date: existing.upd_date}`), `matchedCount === 0` → 412 ตาม `coding-standard/auth/12-data-management.md`

7. **ไม่มี transaction/mutex สำหรับ concurrent menu edits** — roadmap "Race Condition Prevention" ต้องการ MongoDB transaction หรือ app-level mutex; `createMenu`/`updateMenu`/`deleteMenu`/`upsertRolePermission` เป็น read-validate-write แยกกัน ไม่ atomic — สอง concurrent request อาจ pass validation บน snapshot เดียวกันแล้วเขียนทั้งคู่ ทำให้ registry invalid ตาม "กฎ 7 ข้อ" (Success Criteria #2)
   - **แก้:** wrap แต่ละ mutation ด้วย `session.withTransaction(...)` หรือ per-collection mutex

8. **ขาด index `{ou_id:1, role:1}` บน `auth_users`** — roadmap "Urgent revoke option" step 1 ต้องการ index นี้สำหรับ `revoke_sessions`'s bulk `updateMany`/`find` ใน `admin.repository.js:70-83` ทั้ง `test/helpers/ensure-indexes.mjs` และ `scripts/init-db.mjs` ไม่มี (มีแต่ `{ou_id:1,branch_id:1}`, `{username:1}`)
   - **แก้:** เพิ่ม `createIndex({ou_id:1, role:1}, {name:'by_ou_role'})` ทั้ง 2 ไฟล์

### Suggestion

- `admin.service.js` (509 บรรทัด, ไฟล์ใหญ่สุดของทั้ง rollout) — มี `problemPayload({...})` ซ้ำ ~17 ครั้ง (>50% ของไฟล์) — extract helper เช่น `fail(status, typeKey, title, detail, code)`; พิจารณาแยก menu-CRUD vs role-permission-CRUD เป็นคนละไฟล์/คลาส
- `admin.repository.js:70-72` (`countUsersInScope`) — dead code, wire เข้า Critical #3 หรือลบ
- ไม่มี rate limit บน `/auth/admin/*` (ต่างจาก `/auth/me/menus` ที่มี `RATE_LIMIT_ME_MENUS`) — `PUT .../role-permissions/:ou_id/:role` ที่ `revoke_sessions: true` ทำ bulk update + Redis pipeline ข้าม user จำนวนมาก ควรมี rate limit ขั้นต่ำ
- openapi admin paths บางตัว response schema บาง: `GET role-permissions` 200 ไม่มี body schema, `PUT .../role-permissions/{ou_id}/{role}` 200 ไม่มี schema (ทั้งที่ return `revoked_sessions`/`revoked_users_count`), หลาย path ขาด `401`/`403`/`404`/`412` `$ref: Problem`
- `admin.service.js:331-347` — self-lockout check ซับซ้อนเกินจำเป็น (`hasManage` มีทางเดียวคือ `permissions:*` เพราะ outer if กันไว้แล้ว) — ลดเหลือเงื่อนไขเดียวด้วย `anyPermissionMatches`

### Cross-cutting contract notes

- **Escalating action / wildcard-domain** — ไม่ implement (Critical #2)
- **Key immutability** — ป้องกันได้ "โดยบังเอิญ" จาก Ajv `additionalProperties: false` + Fastify `removeAdditional` (ไม่มี explicit reject) — เพิ่ม explicit check ใน `updateMenu` เพื่อ defense-in-depth
- **OU scoping** — `PUT`/`DELETE role-permissions/:ou_id/:role` reject `ou_id !== "null"` ด้วย 400 ถูกต้องตาม Resolved Q#2; `GET role-permissions?ou_id=...` ไม่ apply กฎเดียวกัน (คืน `[]` เงียบๆ) — inconsistent
- **`revoke_sessions`** — `updateMany` + chunked (1000/batch) Redis pipeline ตาม spec แต่ (1) ขาด index ที่ Important #8, (2) `getUsersInScope` โหลดทั้ง scope เข้า memory ก่อน chunk แค่ขั้น Redis, (3) ไม่ stale token ของ admin เอง (Critical #1)
- **Key validation ตาม matching contract** — `validateSeedData` reuse `isWildcardEntry`/`anyPermissionMatches` จาก `permission-match.js` ถูกต้อง ไม่มี duplicate logic

### Verification

- `node --test test/admin.integration.test.js` (mongodb-memory-server) → **13/13 pass**
- `npm run lint` → clean
- `node scripts/validate-auth-openapi-problem-codes.mjs` (`spec:codes`) → pass (แต่ไม่ครอบ admin paths — ดู Important #5)
- `npx spectral lint openapi.yaml` (`spec:lint`) → pass
- **`npm run format:check` → FAIL** — Prettier violations ใน `src/modules/admin/admin.controller.js`, `admin.repository.js`, `admin.route.js`, `admin.service.js`, `test/admin.integration.test.js`, `ROADMAP.md`, `SPEC-permission-admin-api.md`, `tasks/plan.md` → **`npm run ci` (lint && format:check && test && audit:check) จะ fail ทั้ง pipeline** (mechanical fix: `npx prettier --write .`)
- ไม่ได้รัน `npm run audit:check` (ไม่มี dependency ใหม่)

---

## สรุป Verification ทั้งหมด

| Phase | Tests                                                                                                                           | Lint/Format                           | Build/Spec                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------- |
| 1     | 74/74 pass                                                                                                                      | eslint clean                          | openapi lint pass            |
| 2     | 66/66 pass                                                                                                                      | lint+format+spec:lint+spec:codes pass | —                            |
| 3     | unit 66/66 pass; integration ติด `ECONNREFUSED 27017` (ไม่มี MongoDB ใน sandbox — ยังไม่ verify `profiles.permissions.test.js`) | eslint clean                          | —                            |
| 4     | vitest 16/16 pass                                                                                                               | eslint clean                          | **`tsc -b` FAIL (6 errors)** |
| 5     | integration 13/13 pass                                                                                                          | lint clean, **format:check FAIL**     | spec:lint/spec:codes pass    |

---

## Next steps

ดู [`review-1-todo.md`](./review-1-todo.md) สำหรับ action items แบบ checklist เรียงตามความสำคัญ
