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
- [ ] **Human review** ก่อนเริ่ม Phase 3

## Phase 3: Seed tooling + Menus endpoint (Task 5 ⟂ Task 6)

- [ ] **Task 5**: `scripts/seed-permissions.js` + `scripts/seed-data/permissions.js` — validate 7 กฎ (fail ทันที), upsert + audit fields, `--prune`, สร้าง indexes + tests `(M)` — ต้องมี Task 1, 2
- [ ] **Task 6**: `GET /auth/me/menus` — expand wildcard + ancestors ครบถึง root, flat list เรียง `sort_order`, rate limit 60/min, sync `openapi.yaml` + integration tests `(M)` — ต้องมี Task 1, 3

### Checkpoint C: Complete

- [ ] `npm run ci` ผ่านครบ
- [ ] Flow ครบวงจรด้วยมือ: seed → dev → login → `/auth/me/menus` → refresh
- [ ] Success Criteria ทั้ง 6 ข้อใน `SPEC.md` ผ่าน
- [ ] อัปเดต `CHANGELOG.md`
- [ ] **Human review** ก่อน merge
