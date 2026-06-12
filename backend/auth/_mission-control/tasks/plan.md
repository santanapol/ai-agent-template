# Implementation Plan: Dynamic Permission in DB (Approach B)

> อ้างอิง Spec: [`../SPEC.md`](../SPEC.md) — แผนนี้แตกงานจาก Spec ที่ปิดคำถามครบแล้ว (Resolved Questions 1-5)

## Overview

เพิ่มระบบสิทธิ์แบบไดนามิกให้ `auth` service: ดึง `menu_keys` จาก MongoDB ตามคู่ `(ou_id, role)` (พร้อม fallback ไป Global Default) ฝังเป็นเคลม `permissions` ใน Access JWT และ Response Body ของ login/refresh, เพิ่ม endpoint `GET /auth/me/menus` สำหรับโครงเมนูหลายระดับ (สูงสุด 3 ชั้น), รองรับ wildcard `domain:*` แบบไม่ expand เพื่อคุมขนาด JWT, และมี seed script แบบ sync เต็มรูปแบบ (validate + upsert + `--prune`)

## Architecture Decisions

- **Match logic รวมศูนย์ที่ `lib/permission-match.js`** — เป็น pure function ไม่มี dependency ทำก่อนได้ทันที และเป็น Permission Matching Contract ที่ gateway/staff ต้อง implement ตรงกันใน phase ถัดไป
- **Resolution อยู่ใน `AuthService`** (ไม่ใช่ repository) — repository มีหน้าที่ query ดิบต่อคู่ `(ou_id, role)` เท่านั้น ส่วนตรรกะ fallback/deny-by-default เป็น business logic ตาม layer ของ coding standard auth/2-folder-structure
- **DB error ≠ `[]`** — ปล่อย error ไหลออกจาก `login()`/`refresh()` ตามทางเดิมของ Mongo error อื่น (กลายเป็น 5xx) ไม่เขียน try/catch ครอบ
- **Endpoint ใหม่ใช้ pattern เดิมของ `/auth/me/password`** — `requireAccessBearer` preHandler + `assertAccessTokenGenMatches` ใน service; error 401 ใช้ `types.invalidToken` + code `TOKEN_REFRESH_REJECTED` ที่ลงทะเบียนใน `codes.yaml` แล้ว (ไม่ต้องเพิ่ม code ใหม่)
- **Audit fields ตาม standard auth/12-data-management** — seed script ใช้ `$setOnInsert` สำหรับ `cr_by/cr_date/cr_prog` และ `$set` สำหรับ `upd_*` ทุกครั้ง (Spec อัปเดต schema ให้ตรง standard แล้ว — user เคาะ "ยึดตาม standard")
- **Tenant scoping deviation (จงใจ — user อนุมัติแล้ว)** — `auth_role_permissions`/`auth_menus` scope ด้วย `ou_id` อย่างเดียว ไม่มี `branch_id` เพราะสิทธิ์เป็นระดับ OU โดยดีไซน์ (บันทึกใน SPEC.md แล้ว)
- **Seed script เป็น `.js`** ตาม Spec (package เป็น ESM อยู่แล้ว — `scripts/*.mjs` เดิมเป็น legacy convention) แยกข้อมูลออกเป็น `scripts/seed-data/permissions.js` เพื่อให้ logic ทดสอบได้
- **Index สร้าง 2 ที่** — seed script (production path ตาม Spec) และ `test/helpers/ensure-indexes.mjs` (test path ตามแบบแผนเดิมของ repo)

## Dependency Graph

```
Task 1: lib/permission-match.js (pure, ไม่มี dependency)
Task 2: mongo-collections.js + auth.repository.js (query ดิบ + indexes)
    │
    ├── Task 3: resolution logic ใน auth.service.js (fallback + deny-default)   [ต้องมี 2]
    │       │
    │       ├── Task 4: ฝัง permissions ใน JWT + login/refresh body + size guard [ต้องมี 3]
    │       │
    │       └── Task 6: GET /auth/me/menus (expand wildcard + ancestors)         [ต้องมี 1, 3]
    │
    └── Task 5: seed script (validate + upsert + --prune)                        [ต้องมี 1, 2]

Task 5 ⟂ Task 4/6 — ทำขนานกันได้หลัง Checkpoint A
```

## Task List

---

### Phase 1: Foundation

## Task 1: Permission Matching Contract (`lib/permission-match.js`)

**Description:** สร้างฟังก์ชัน match สิทธิ์กลางตาม contract ใน Spec — exact match และ wildcard `domain:*` (รูปแบบเดียว ไม่รองรับ `*` กลาง string) พร้อมฟังก์ชันช่วยตรวจรูปแบบ entry (เช่น `isWildcardEntry`, `matchesPermission(entry, actionKey)`, `anyPermissionMatches(entries, actionKey)`) เป็นจุดเดียวที่ logic นี้อยู่ในโปรเจกต์ `auth`

**Acceptance criteria:**

- [ ] `"profiles:create"` match `profiles:create` (exact) และไม่ match `profiles:list`
- [ ] `"profiles:*"` match `profiles:create`/`profiles:list` แต่**ไม่** match `profile:create`, `invoice:read`, หรือ `profiles` เปล่า ๆ
- [ ] ไม่รองรับ `*` เดี่ยวหรือ `*` กลาง string (คืน false / ถือเป็น entry ปกติที่ไม่ match)

**Verification:**

- [ ] Tests ผ่าน: `npm test` (ไฟล์ใหม่ `test/permission-match.test.js`)
- [ ] Lint ผ่าน: `npm run lint`

**Dependencies:** None

**Files likely touched:**

- `src/lib/permission-match.js`
- `test/permission-match.test.js`

**Estimated scope:** S (2 ไฟล์)

---

## Task 2: Collections + Repository queries + Indexes

**Description:** ลงทะเบียนคอลเลกชัน `auth_menus`, `auth_role_permissions` ใน `mongo-collections.js` และเพิ่มเมธอด query ดิบใน `AuthRepository`: `findRolePermissions(ou_id, role)` (query ตรงต่อหนึ่งคู่ — ไม่มี fallback logic ที่ชั้นนี้) และ `findActionMenusForOu(ouId)` / `findMenusByKeys(keys, ouId)` สำหรับ endpoint เมนู พร้อมเพิ่ม unique index `auth_menus.key`, `auth_role_permissions(ou_id, role)` และ index `auth_menus.parent_key` ใน `test/helpers/ensure-indexes.mjs`

**Acceptance criteria:**

- [ ] `AUTH_COLLECTIONS` มี `MENUS: 'auth_menus'`, `ROLE_PERMISSIONS: 'auth_role_permissions'` และอยู่ใน `AUTH_COLLECTION_NAME_LIST` (test reset ใช้)
- [ ] `findRolePermissions(ouId, role)` คืนเอกสารหรือ `null` — รับ `ouId` เป็น `ObjectId | null` ได้ทั้งคู่
- [ ] เมธอด query เมนูกรองด้วย `ou_id: { $in: [null, ouId] }` ตาม Spec
- [ ] Index ใหม่ถูกสร้างใน test helper (unique ทำงานจริง — insert ซ้ำต้อง fail)

**Verification:**

- [ ] Tests ผ่าน: `npm test`
- [ ] Lint ผ่าน: `npm run lint`

**Dependencies:** None

**Files likely touched:**

- `src/config/mongo-collections.js`
- `src/modules/auth/auth.repository.js`
- `test/helpers/ensure-indexes.mjs`

**Estimated scope:** S (3 ไฟล์)

---

### Checkpoint A: Foundation

- [ ] `npm test` ผ่านทั้งหมด (ของเดิมไม่พัง)
- [ ] `npm run lint && npm run format:check` ผ่าน

---

### Phase 2: Core — เส้นทาง Token

## Task 3: Permission Resolution ใน `AuthService`

**Description:** เพิ่มเมธอด `resolveEffectivePermissions({ ouId, role })` ใน `AuthService` ตาม Resolution Logic ของ Spec: query `(ou_id, role)` → ไม่พบจึง fallback `(null, role)` → ไม่พบทั้งคู่คืน `[]` (deny by default) คืนค่า `menu_keys` ดิบ (ไม่ expand wildcard) และ**ไม่**ดัก DB error (ปล่อยไหลเป็น 5xx)

**Acceptance criteria:**

- [ ] คู่ `(ou_id, role)` มีเอกสาร → ได้ `menu_keys` ของเอกสารนั้น (ไม่แตะ Global)
- [ ] คู่ไม่มีเอกสาร แต่ `(null, role)` มี → ได้ Global Default; OU ที่ override role อื่นไม่กระทบ role นี้
- [ ] เอกสาร `(ou_id, role)` ที่มี `menu_keys: []` → ได้ `[]` (override ปฏิเสธ — ไม่ fallback ต่อ)
- [ ] ไม่พบทั้งสองระดับ → `[]`
- [ ] Repository โยน error → error ทะลุออก (ทดสอบด้วย mock repo)

**Verification:**

- [ ] Tests ผ่าน: `npm test` (ไฟล์ใหม่ `test/permission-resolution.test.js` — unit test ด้วย mock repo)
- [ ] Lint ผ่าน: `npm run lint`

**Dependencies:** Task 2

**Files likely touched:**

- `src/modules/auth/auth.service.js`
- `test/permission-resolution.test.js`

**Estimated scope:** S (2 ไฟล์)

---

## Task 4: ฝัง `permissions` ใน JWT + Response Body ของ Login/Refresh + Size Guard

**Description:** ต่อ resolution เข้าเส้นทางออก token: `issueAccess` เรียก `resolveEffectivePermissions` แล้วส่งเข้า `signAccessJwt` (เพิ่มพารามิเตอร์ `permissions` — ค่าดิบรวม wildcard), เพิ่ม `permissions` ใน response body ผ่าน `buildAccessTokenResponseBody`, เพิ่ม env `ACCESS_JWT_SOFT_LIMIT_BYTES` (default 4096) + warning log เมื่อ token ยาวเกิน, และ sync เอกสาร `openapi.yaml` (response schema ของ login/refresh)

**Acceptance criteria:**

- [ ] Login/Refresh สำเร็จ → body มี `permissions: string[]` และ JWT decode แล้วมีเคลม `permissions` ค่าตรงกับ `menu_keys` ใน DB (wildcard ไม่ถูก expand)
- [ ] User ที่ไม่มี mapping → `permissions: []` ทั้ง body และเคลม (login ยังสำเร็จ)
- [ ] Token ยาวเกิน soft limit → `log.warn` พร้อมจำนวน entries (ทดสอบด้วย mock logger); env default 4096 เมื่อไม่ตั้งค่า
- [ ] `openapi.yaml` schema ของ `AccessTokenResponse` (ทั้ง login/refresh) มีฟิลด์ `permissions` พร้อม example

**Verification:**

- [ ] Tests ผ่าน: `npm test` (เพิ่มเคสใน `test/auth.integration.test.js` + unit ใน `test/env.test.js`)
- [ ] OpenAPI ผ่าน: `npm run spec:lint && npm run spec:codes`
- [ ] Lint ผ่าน: `npm run lint`

**Dependencies:** Task 3

**Files likely touched:**

- `src/lib/jwt-access.js`
- `src/config/env.js`
- `src/modules/auth/auth.service.js`
- `openapi.yaml`
- `test/auth.integration.test.js`, `test/env.test.js`

**Estimated scope:** M (5-6 ไฟล์)

---

### Checkpoint B: Token path ทำงานครบ

- [ ] `npm test` ผ่านทั้งหมด — login → ได้ JWT มี `permissions` → refresh → เคลมยังถูกต้อง
- [ ] `npm run spec:lint && npm run spec:codes` ผ่าน
- [ ] **Human review** ก่อนเริ่ม Phase 3

---

### Phase 3: Seed tooling + Menus endpoint (Task 5 ⟂ Task 6 ทำขนานได้)

## Task 5: Seed Script (`scripts/seed-permissions.js`)

**Description:** สร้างสคริปต์ sync ข้อมูลสิทธิ์แบบ idempotent: validate ก่อนเขียนเสมอ (key ซ้ำ, parent ชี้ key ที่มีจริงและเป็น `type: "menu"`, ไม่มี cycle, ลึกไม่เกิน 3, action เป็น leaf, ทุก entry ใน `menu_keys` ต้อง match action ≥ 1 ตัว — wildcard match ศูนย์ = fail), upsert `auth_menus` ตาม `key` / `auth_role_permissions` ตาม `(ou_id, role)` พร้อม audit fields (`$setOnInsert` cr*\*, `$set` upd*_), โหมด `--prune` ลบส่วนเกิน (แสดงรายการก่อนลบ), และสร้าง index ทั้งหมด ข้อมูลตั้งต้นแยกไฟล์ `scripts/seed-data/permissions.js` (โครง `staff` → `staff:profiles` → `profiles:_`5 actions + role mappings ของ`branch_admin`, `platform_admin`, `support`, `staff` ตามสิทธิ์ static เดิมใน staff service)

**Acceptance criteria:**

- [ ] รันสองครั้งติดกัน → จำนวนเอกสารเท่าเดิม, `upd_date` อัปเดต, `cr_*` ไม่เปลี่ยน
- [ ] ข้อมูลผิดทุกแบบ → exit code ≠ 0 พร้อมรายงานรายการที่ผิด: key ซ้ำ / parent ชี้ action / cycle / ลึกเกิน 3 / exact key ไม่มีจริง / wildcard match ศูนย์ / `menu_keys` อ้าง key ที่เป็น `type: "menu"`
- [ ] `--prune`: ลบเมนูและ mapping ที่ไม่อยู่ในไฟล์ seed พร้อมแสดงรายการ; ไม่ส่ง flag → ไม่ลบ
- [ ] Unique index ทั้งสองตัว + index `parent_key` ถูกสร้าง

**Verification:**

- [ ] Tests ผ่าน: `npm test` (ไฟล์ใหม่ `test/seed-permissions.test.js` — รัน logic ของสคริปต์กับ Mongo test server)
- [ ] เช็คด้วยมือ: `node scripts/seed-permissions.js` กับ dev MongoDB แล้วตรวจเอกสารใน mongosh
- [ ] Lint ผ่าน: `npm run lint`

**Dependencies:** Task 1, Task 2

**Files likely touched:**

- `scripts/seed-permissions.js`
- `scripts/seed-data/permissions.js`
- `test/seed-permissions.test.js`

**Estimated scope:** M (3 ไฟล์ แต่ logic หนาแน่น — validation 7 กฎ)

---

## Task 6: Endpoint `GET /auth/me/menus`

**Description:** เพิ่ม endpoint ตอบโครงเมนูเฉพาะที่ผู้ใช้มีสิทธิ์: ใช้ `requireAccessBearer` + `assertAccessTokenGenMatches` (pattern เดียวกับ `/auth/me/password`), resolve permissions สดจาก DB, expand wildcard กับ `auth_menus` ผ่าน `permission-match`, เติมโหนดบรรพบุรุษ (`type: "menu"`) ครบถึง root, ตอบ flat list เรียงตาม (ระดับชั้น, `sort_order`) ใน `{ menus: [...] }`, rate limit 60 req/min, อัปเดต `openapi.yaml`

**Acceptance criteria:**

- [ ] ผู้ใช้มี `"profiles:*"` → ได้ทุก action ใต้ `profiles:` + โหนด `staff:profiles` + `staff` (ancestors ครบถึง root) เรียงตาม `sort_order`
- [ ] ผู้ใช้ไม่มีสิทธิ์กิ่งใด → ไม่เห็นโหนด menu ของกิ่งนั้นเลย; ผู้ใช้ permissions `[]` → `{ menus: [] }`
- [ ] เมนู OU-specific แสดงเฉพาะผู้ใช้ OU นั้น (กรอง `ou_id: { $in: [null, userOuId] }`)
- [ ] ไม่มี token / token ผิด / `token_gen` ไม่ตรง → `401 application/problem+json` (code `TOKEN_REFRESH_REJECTED`)
- [ ] `openapi.yaml` มี path `/auth/me/menus` + response schema + rate limit ระบุไว้

**Verification:**

- [ ] Tests ผ่าน: `npm test` (ไฟล์ใหม่ `test/me-menus.integration.test.js` — ตามแบบ `me-password.integration.test.js`)
- [ ] OpenAPI ผ่าน: `npm run spec:lint && npm run spec:codes`
- [ ] Lint ผ่าน: `npm run lint`

**Dependencies:** Task 1, Task 3

**Files likely touched:**

- `src/modules/auth/auth.service.js`
- `src/modules/auth/auth.controller.js`
- `src/modules/auth/auth.route.js`
- `src/modules/auth/auth.validator.js`
- `openapi.yaml`
- `test/me-menus.integration.test.js`

**Estimated scope:** M (5-6 ไฟล์ แต่ทุกไฟล์เป็นการเพิ่มตาม pattern เดิม)

---

### Checkpoint C: Complete

- [ ] `npm run ci` ผ่านครบ (lint + format + test + audit)
- [ ] Flow ครบวงจรด้วยมือ: `node scripts/seed-permissions.js` → `npm run dev` → login ได้ `permissions` → เรียก `GET /auth/me/menus` ได้โครงเมนู → refresh เคลมถูกต้อง
- [ ] Success Criteria ทั้ง 6 ข้อใน SPEC.md ผ่าน
- [ ] อัปเดต `CHANGELOG.md`
- [ ] **Human review** ก่อน merge

---

## Risks and Mitigations

| ความเสี่ยง                                                                                                                               | ผลกระทบ | วิธีรับมือ                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| Resolution เพิ่ม DB query ทุก login/refresh — ถ้า query ช้าจะหน่วงทุก token issue                                                        | Med     | Index `(ou_id, role)` unique ครอบ query พอดี (covered lookup); ไม่ทำ cache รอบนี้ (premature)                         |
| `permissions: []` ของ user เดิมที่ยังไม่ seed mapping — หลัง deploy ทุกคนเมนูหาย                                                         | High    | ลำดับ rollout: รัน seed script **ก่อน** deploy โค้ดใหม่; integration test ครอบเคส user ไม่มี mapping ว่า login ไม่พัง |
| เพิ่มฟิลด์ใน response body อาจชน frontend/gateway ที่ validate schema แบบ strict                                                         | Low     | เป็น additive field; ตรวจ `routes.json`/gateway docs ตอน Checkpoint C ว่าไม่มี response validation ขวาง               |
| `withTransaction` + collection ใหม่บน MongoMemoryReplSet — resolution query ไม่อยู่ใน transaction ใด ไม่น่ามีปัญหา แต่ test แรกจะพิสูจน์ | Low     | Task 4 รัน integration กับ replica set จริงตั้งแต่แรก (fail fast)                                                     |
| Seed validation 7 กฎมี edge cases (cycle detection, depth)                                                                               | Med     | แยก validation เป็น pure functions ใน script ให้ unit test ได้ตรง ๆ; Task 5 มี test ต่อกฎครบทุกข้อ                    |

## Open Questions

- ไม่มี — Spec ปิดคำถามครบแล้ว (Resolved Questions 1-5) หากเจอประเด็นใหม่ระหว่าง implement ที่เข้าเงื่อนไข "Ask first" ใน Boundaries จะหยุดถามก่อน

## Parallelization

- **Task 1 ⟂ Task 2** — อิสระต่อกัน เริ่มพร้อมกันได้
- **Task 5 ⟂ Task 4, Task 6** — seed script ไม่แตะ `src/` ทำขนานกับเส้นทาง endpoint ได้หลัง Task 2
- **Task 4 → Task 6** ควรเรียงตามลำดับ (แตะ `auth.service.js` ทั้งคู่ — เลี่ยง conflict)
