# TODO: Dynamic Permission in DB (Approach B)

> รายละเอียดแต่ละ Task อยู่ใน [`plan.md`](./plan.md) — ทำตามลำดับ Phase และหยุดที่ Checkpoint ทุกจุด

## Phase 1: Foundation

- [x] **Task 1**: `lib/permission-match.js` — Permission Matching Contract (exact + wildcard `domain:*`) + unit tests `(S)` — commit `9609e39`
- [x] **Task 2**: ลงทะเบียนคอลเลกชัน `auth_menus`/`auth_role_permissions` + repository queries + indexes ใน test helper `(S)` — commit `52bf3f9`

### Checkpoint A

- [x] `npm test` ผ่านทั้งหมด (80/80 — ของเดิมไม่พัง)
- [x] `npm run lint && npm run format:check` ผ่าน

## Phase 2: Core — เส้นทาง Token

- [x] **Task 3**: `resolveEffectivePermissions` ใน `AuthService` — fallback `(ou_id, role)` → `(null, role)` → `[]`, DB error ทะลุ + unit tests `(S)` — commit `29fc772`
- [x] **Task 4**: ฝัง `permissions` ใน JWT + response body login/refresh + `ACCESS_JWT_SOFT_LIMIT_BYTES` size guard + sync `openapi.yaml` + integration tests `(M)` — commit `3b4ffa2`

### Checkpoint B

- [x] `npm test` ผ่าน (95/95) — login → JWT มี `permissions` → refresh เคลมถูกต้อง
- [x] `npm run spec:lint && npm run spec:codes` ผ่าน
- [x] **Human review** ก่อนเริ่ม Phase 3 — อนุมัติแล้ว (พร้อมเคาะ 2 deviation: size guard ที่ service, ไม่เพิ่ม response schema ใน validator)

## Phase 3: Seed tooling + Menus endpoint (Task 5 ⟂ Task 6)

- [x] **Task 5**: `scripts/seed-permissions.js` + `scripts/seed-data/permissions.js` — validate 7 กฎ (fail ทันที), upsert + audit fields, `--prune`, สร้าง indexes + tests `(M)` — commit `09943d5`
- [x] **Task 6**: `GET /auth/me/menus` — expand wildcard + ancestors ครบถึง root, flat list เรียง `sort_order`, rate limit 60/min, sync `openapi.yaml` + integration tests `(M)` — commit `9fb456b`

### Checkpoint C: Complete

- [x] `npm run ci` ผ่านครบ (lint + format + 118/118 tests + audit)
- [x] Flow ครบวงจรด้วยมือกับ dev MongoDB จริง: seed ×2 (idempotent) → login (`permissions` ใน body+JWT) → `GET /auth/me/menus` (โครง 3 ระดับครบ) → refresh (เคลมถูกต้อง) → no token = 401
- [x] Success Criteria ทั้ง 6 ข้อใน `SPEC.md` ผ่าน
- [x] อัปเดต `CHANGELOG.md`
- [ ] **Human review** ก่อน merge
