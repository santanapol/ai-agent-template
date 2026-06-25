# Spec: Active Branch Selector (Approach 2 — Active Branch in JWT)

> สถานะ: **READY FOR PLAN — Open Questions ปิดครบแล้ว** (Phase 1: Specify ตาม `spec-driven-development`)
> ฟีเจอร์นี้ครอบคลุม 3 แพ็กเกจ + 1 patch: `backend/auth`, `backend/gateway`, `frontend/backoffice`, และ patch เล็กที่ `backend/service/staff`

---

## Assumptions I'm Making

1. ใช้ **Approach 2**: เมื่อผู้ใช้สลับสาขา auth จะออก **access token ใหม่** โดย claim `branch_id` = สาขาที่เลือก (active/working branch) → gateway แปลงเป็น `x-user-branch` ตามเดิม → downstream services (staff, agent-invoice) **ไม่ต้องแก้ logic การ scope**
2. branch switcher ใช้ได้เฉพาะ role: **`platform_admin`, `support_admin`, `support`** ส่วน `branch_admin` / `staff` ล็อกสาขาตัวเอง (ไม่แสดง switcher)
3. ต้อง validate เสมอว่าสาขาที่เลือกอยู่ใน **`ou_id` เดียวกัน** กับ user (กันการข้าม OU)
4. **แหล่งข้อมูลสาขา**: อ่าน branch master จาก MongoDB โดยตรง — collection `su_branch` ใน database `gpp_777ww` (**คนละ DB กับ auth ที่ใช้ `zero-platform`**) ฟิลด์ `_id`, `ou_id`, `branch_name`, `branch_code`, `active` ผ่าน read-only connection ใหม่ใน auth (เลียนแบบ `agent-invoice/config/database-read.js`, `readPreference: secondaryPreferred`) reuse ชื่อ env `MONGODB_URI_READ` + `MONGODB_DB_BRANCH`
5. **คงอยู่ข้าม refresh**: เก็บ `active_branch_id` ที่ refresh token row (ระดับ family) และ copy ทุกครั้งที่ rotate → `issueAccess` อ่านจาก session
6. **switch ไม่ rotate refresh**: endpoint สลับสาขาแค่ `$set active_branch_id` ที่ row ปัจจุบัน + ออก access token ใหม่อย่างเดียว (ไม่ revoke/rotate refresh) เพื่อเลี่ยง reuse-detection churn
7. **home branch ต้องไม่หาย**: เพิ่ม claim `home_branch_id` (= `auth_users.branch_id` ถาวร), gateway forward เป็น `x-user-home-branch`, และ patch staff self-profile check ให้ใช้ home branch — กัน My Profile 403
8. `auth_users.branch_id` (home branch ถาวร) **ไม่ถูกแก้** ไม่ว่าจะสลับสาขากี่ครั้ง
9. การสลับสาขาเป็น **session-bound** (เหมือน GitHub org switch) — logout/login ใหม่จะ reset กลับ home branch เสมอ (ไม่จำข้ามรอบ login)
10. **สาขา inactive ถูกปฏิเสธ** — `POST /auth/me/active-branch` คืน `403 AUTH_BRANCH_FORBIDDEN`; UI ปิดการเลือกสาขา inactive

> → โปรดแก้ไขทันทีหากข้อใดไม่ถูกต้อง มิเช่นนั้นจะดำเนินการตามนี้

---

## Objective

### ปัญหา

role ระดับ OU (`platform_admin`, `support_admin`, `support`) ต้องการ "เลือกสาขา" จาก backoffice เพื่อดู (และทำงานกับ) ข้อมูลของสาขาที่ต้องการ แต่ปัจจุบัน `branch_id` ถูกฝังตายตัวใน JWT ตอน login → `x-user-branch` ที่ส่งให้ทุก service เป็น home branch เสมอ ทำให้ write operations และ audit ผูกกับ home branch เท่านั้น

### เป้าหมาย

เพิ่มความสามารถ **สลับ "สาขาที่กำลังทำงาน" (active branch)** ผ่านการออก JWT ใหม่ โดยมีผลครอบคลุมทั้ง **read และ write** ของ downstream services โดยไม่แก้ logic การ scope ของ service ปลายทาง

### User Stories

| ID   | ในฐานะ                                   | ฉันต้องการ                                      | เพื่อ                                           |
| ---- | ---------------------------------------- | ----------------------------------------------- | ----------------------------------------------- |
| US-1 | platform_admin / support_admin / support | เลือกสาขาจาก dropdown ใน backoffice             | ดูข้อมูล (staff/invoices/dashboard) ของสาขานั้น |
| US-2 | role ข้างต้น                             | ให้สาขาที่เลือกคงอยู่แม้ session refresh        | ไม่ถูกเด้งกลับ home branch ทุก 15 นาที          |
| US-3 | role ข้างต้น                             | สร้าง/แก้ข้อมูลในสาขาที่เลือก โดย audit ถูกต้อง | งานเขียนผูกกับสาขาที่ตั้งใจ                     |
| US-4 | ทุก role                                 | เข้า My Profile ได้เสมอแม้สลับสาขา              | ไม่เจอ 403                                      |
| US-5 | branch_admin / staff                     | ไม่เห็น switcher และถูกล็อกสาขาตัวเอง           | ความปลอดภัยตาม scope เดิม                       |

### Acceptance Criteria (วัดผลได้)

- AC-1: `POST /auth/me/active-branch` ด้วย role ที่อนุญาต + branch ใน OU เดียวกัน → `200` พร้อม access token ใหม่ที่ claim `branch_id` = สาขาที่เลือก, `home_branch_id` = home เดิม
- AC-2: เลือก branch นอก OU → `403 AUTH_BRANCH_FORBIDDEN`; branch ไม่มีจริง → `404 AUTH_BRANCH_NOT_FOUND`
- AC-3: role ที่ไม่อนุญาต (`branch_admin`/`staff`) เรียก endpoint → `403 AUTH_BRANCH_SWITCH_FORBIDDEN`
- AC-4: หลังสลับสาขาแล้ว `POST /auth/refresh` → access token ใหม่ยังคง `branch_id` = active branch (มาจาก session ไม่ใช่ home)
- AC-5: gateway forward `x-user-branch` = active branch และ `x-user-home-branch` = home branch
- AC-6: เปิด My Profile ด้วย active branch ≠ home → `200` (ใช้ home branch ใน self-check)
- AC-7: staff list / invoices list สะท้อนสาขาที่เลือกโดยไม่ต้องส่ง `?branch_id=` เพิ่ม (มาจาก `x-user-branch`)
  - **OU-wide roles** (`platform_admin`, `support_admin`, `support`): เมื่อไม่ส่ง `branch_id` ใน query ให้ default scope เป็น **active branch** จาก `x-user-branch` (ไม่ใช่ home branch) — เปลี่ยนพฤติกรรมจากเดิมที่บาง list endpoint ไม่ filter branch สำหรับ role เหล่านี้
  - **branch-scoped roles** (`branch_admin`, `staff`): ยังคงล็อกตาม `x-user-branch` (= home) เหมือนเดิม

---

## Tech Stack

- **auth / gateway / staff / agent-invoice**: Node.js >=24, Fastify v5, MongoDB 8, `jose` (RS256), Argon2id
- **frontend/backoffice**: React 19 + TS (strict), Vite 8, Ant Design 6, react-router-dom 7, axios
- **Test**: `node:test` (backend), vitest + @testing-library/react (frontend)

**Frontend branch list (interim):** dropdown ใช้ `GET /api/v1/invoices/agent` (`listInvoiceAgents`) เป็นแหล่งรายการสาขาใน OU ชั่วคราว — branch master จริงอ่านที่ auth (`MONGODB_URI_READ` / `su_branch`); invoice agent list ให้ `branch_id`, `active`, และชื่อสำหรับ UI

---

## Commands

```bash
# auth
cd code-base/zero-platform/backend/auth
npm run dev
npm test
npm run lint
node --env-file=.env scripts/seed-permissions.js        # (ถ้าเพิ่ม menu key ใหม่)

# gateway
cd code-base/zero-platform/backend/gateway
npm run dev && npm test && npm run lint

# staff (patch)
cd code-base/zero-platform/backend/service/staff
npm test && npm run lint

# frontend backoffice
cd code-base/zero-platform/frontend/backoffice
npm run dev
npm test
npm run lint
npm run build
```

---

## Project Structure (ไฟล์ที่เกี่ยวข้อง)

```
backend/auth/
  _mission-control/
    SPEC-active-branch-selector.md         ← [NEW] เอกสารนี้
  src/
    config/
      mongo-collections.js                 ← [ไม่แก้] (su_branch อยู่คนละ DB อ่านผ่าน repo ใหม่)
    modules/auth/
      auth.route.js                        ← [MODIFY] เพิ่ม POST /auth/me/active-branch (requireAccessBearer + rate limit)
      auth.controller.js                   ← [MODIFY] เพิ่ม handler switchActiveBranch
      auth.service.js                      ← [MODIFY] switchActiveBranch(), แก้ issueAccess ให้รับ activeBranchId + homeBranchId, อ่าน active จาก session ตอน refresh
      auth.repository.js                   ← [MODIFY] อ่าน/เขียน active_branch_id ที่ refresh token family
      auth.validator.js                    ← [MODIFY] schema body { branch_id }
    lib/
      jwt-access.js                         ← [MODIFY] เพิ่ม claim home_branch_id ใน signAccessJwt
      branch-read.repository.js            ← [NEW] read-only repo: findByIdInOu(branch_id, ou_id) บน su_branch
    config/
      branch-read-db.js                    ← [NEW] read-only connection ไป gpp_777ww (เลียนแบบ agent-invoice/config/database-read.js, secondaryPreferred)
  openapi.yaml                             ← [MODIFY] เพิ่ม path + schemas + error codes
  codes.yaml / auth-problem-codes          ← [MODIFY] ลงทะเบียน error codes ใหม่
  .env.example / .env.prod                 ← [MODIFY] เพิ่ม MONGODB_URI_READ, MONGODB_DB_BRANCH (=gpp_777ww)

backend/gateway/
  src/config/env.js                        ← [MODIFY] เพิ่ม JWT_CLAIM_HOME_BRANCH (default 'home_branch_id')
  src/plugins/inject-context.js            ← [MODIFY] forward x-user-home-branch (optional, ไม่ reject ถ้าไม่มี)
  src/app.js / proxy/register-proxies.js   ← [MODIFY] เพิ่ม x-user-home-branch ใน allowlist + forward

backend/service/staff/
  src/plugins/user-context.js              ← [MODIFY] อ่าน x-user-home-branch → userContext.homeBranchId
  src/modules/profiles/profiles.service.js ← [MODIFY] assertProfileScope: self-check ใช้ homeBranchId (fallback branchId)

frontend/backoffice/
  src/types/auth.ts                        ← [MODIFY] DecodedUser + home_branch_id; type สำหรับ active-branch
  src/lib/authApiClient.ts                 ← [MODIFY] switchActiveBranch(branch_id)
  src/lib/branchApiClient.ts (หรือ reuse)  ← [MODIFY/NEW] โหลดรายการสาขา (reuse GET /api/v1/invoices/agent)
  src/contexts/AuthContext.tsx             ← [MODIFY] expose switchBranch() + applyToken
  src/contexts/BranchContext.tsx (optional)← [NEW] selectedBranchId + branches[]
  src/layouts/AdminLayout.tsx              ← [MODIFY] branch switcher dropdown ใน header (เฉพาะ 3 roles)
```

---

## Design Detail

### 1. Claim layout (JWT access token)

| Claim                                       | ความหมาย                               | มาจาก                                    |
| ------------------------------------------- | -------------------------------------- | ---------------------------------------- |
| `branch_id`                                 | **active/working branch** (เปลี่ยนได้) | session active_branch_id → fallback home |
| `home_branch_id`                            | **home branch ถาวร** (ใหม่)            | `auth_users.branch_id`                   |
| `ou_id`, `role`, `token_gen`, `permissions` | เดิม                                   | เดิม                                     |

> เหตุผล: gateway map `JWT_CLAIM_BRANCH` (`branch_id`) → `x-user-branch` อยู่แล้ว การให้ `branch_id` = active ทำให้ downstream scope ตาม active โดยไม่แก้ service; `home_branch_id` แยกไว้สำหรับ self-profile

### 2. Endpoint

```
POST /auth/me/active-branch          (preHandler: requireAccessBearer)
Body: { "branch_id": "<24-hex>" }
Rate limit: ≤ 30 req/min/IP
ต้องมี refresh (cookie หรือ body) เพื่อระบุ session — ไม่มี = 401
```

ขั้นตอน service (**switch ไม่ rotate refresh**):

1. `pickRefreshToken()` จาก cookie/body → ไม่มี = `401` (ต้องผูกกับ session)
2. ตรวจ role ∈ { platform_admin, support_admin, support } → ไม่ใช่ = `403 AUTH_BRANCH_SWITCH_FORBIDDEN`
3. โหลด user จาก `request.accessSub` (ได้ `ou_id`, `branch_id` home)
4. `branchReadRepo.findByIdInOu(branch_id, user.ou_id)` → ไม่พบ = `404 AUTH_BRANCH_NOT_FOUND` (อนุญาต inactive)
5. `findRefreshByTokenHash()` หา row ปัจจุบันของ session → ถ้า revoked/หมดอายุ = `401`
6. `$set: { active_branch_id }` ที่ row ปัจจุบัน (**ไม่ revoke, ไม่ insert ใหม่**)
7. `issueAccess(user, { activeBranchId: branch_id, homeBranchId: user.branch_id })` — ออก **access token ใหม่อย่างเดียว**
8. audit `auth.active_branch_changed`
9. ตอบ `200` รูปแบบเดียวกับ login (`access_token`, `expires_in`, `token_type`, `permissions`) — **ไม่แตะ refresh cookie**

### 3. Refresh survival

- `auth_refresh_tokens` row เพิ่มฟิลด์ `active_branch_id` (nullable; null = ใช้ home) — default null ใน `insertRefreshToken`
- `rotateRefreshTokenTxnBody`: copy `active_branch_id` จาก current row → row ใหม่
- `refresh()`: หลัง rotate, `issueAccess(u, { activeBranchId: current.active_branch_id ?? null, homeBranchId: u.branch_id })`
- `issueAccess`: `branchId = activeBranchId ?? homeBranchId`
- `login()`: ไม่ตั้ง `active_branch_id` (null) → reset เป็น home ทุก login

### 4. Gateway (soft, backward-compatible)

- `inject-context.js`: อ่าน `payload[JWT_CLAIM_HOME_BRANCH]` (ถ้ามี) → `x-user-home-branch`
- **ไม่ reject** ถ้า claim นี้ขาด (token เก่าก่อน deploy ยังใช้ได้) — ต่างจาก `x-user-branch` ที่ยัง required
- เพิ่ม `x-user-home-branch` ใน upstream header allowlist (วางหลัง `x-user-branch` ตาม canonical order ของ `coding-standard/auth/4-request-headers.md`)

### 5. Staff self-profile patch

```js
// assertProfileScope: self branch ใช้ home branch ก่อน
const selfBranch = userContext.homeBranchId ?? userContext.branchId;
if (profile.user_id === userContext.userId) {
  if (profile.ou_id !== userContext.ouId || profile.branch_id !== selfBranch) { ... 403 }
  return;
}
```

> `user-context.js` ของ staff อ่าน `x-user-home-branch` (optional) → `homeBranchId`

### 6. Frontend UX

- AdminLayout header: `<Select>` "กำลังดูสาขา: …" แสดงเฉพาะ 3 roles
- รายการสาขา: reuse `GET /api/v1/invoices/agent` (คืนทุกสาขาใน OU)
- เลือกสาขา → `authApi.switchActiveBranch(branch_id)` → `applyToken(newToken)` → refetch หน้า/เมนูปัจจุบัน
- branch_admin / staff: แสดง Tag สาขาตัวเอง read-only (เหมือนปัจจุบัน)

---

## Error Codes (ใหม่ — RFC 7807 / `application/problem+json`)

| `code`                           | HTTP | `type` slug                                                    |
| -------------------------------- | ---- | -------------------------------------------------------------- |
| `AUTH_BRANCH_SWITCH_FORBIDDEN`   | 403  | `branch-switch-forbidden`                                      |
| `AUTH_BRANCH_FORBIDDEN`          | 403  | `branch-forbidden`                                             |
| `AUTH_BRANCH_NOT_FOUND`          | 404  | `branch-not-found`                                             |
| `TOKEN_REFRESH_REJECTED` (reuse) | 401  | `refresh-rejected` (ไม่มี refresh/ session invalid ตอน switch) |
| `AUTH_INVALID_REQUEST` (reuse)   | 400  | `invalid-request`                                              |

---

## Code Style (ตัวอย่าง — ตาม pattern เดิมของ repo)

```js
// auth.service.js — ออก token ตาม pattern issueAccess เดิม
async switchActiveBranch({ user_id_hex, branch_id, refreshFamilyContext }) {
  const user = await this.repo.findUserById(new ObjectId(user_id_hex))
  if (!user) return this.problem(404, this.types.userNotFound, 'AUTH_USER_NOT_FOUND')
  if (!BRANCH_SWITCH_ROLES.has(user.role)) {
    return this.problem(403, this.types.branchSwitchForbidden, 'AUTH_BRANCH_SWITCH_FORBIDDEN')
  }
  const branch = await this.branchRepo.findByIdInOu(branch_id, user.ou_id)
  if (!branch) return this.problem(404, this.types.branchNotFound, 'AUTH_BRANCH_NOT_FOUND')
  // ... persist active_branch_id ที่ family, issueAccess(user, { activeBranchId, homeBranchId })
}
```

กฎ: ไม่ rename claim เดิม; audit event ใหม่ `auth.active_branch_changed`; ฟิลด์ `cr_*/upd_*` ตาม `coding-standard/auth/12-data-management.md`

---

## Testing Strategy

- **auth (node:test)**:
  - `switchActiveBranch` integration: role allowed/denied, branch in/out OU, not found
  - refresh survival: สลับสาขา → refresh → branch_id ยังเป็น active
  - jwt-access: home_branch_id อยู่ใน payload
- **gateway (node:test)**: forward `x-user-home-branch`; token ไม่มี home claim ยัง 200 (backward compat)
- **staff (node:test)**: self-profile ผ่านเมื่อ active ≠ home; cross-branch ยังคง scope ถูก
- **frontend (vitest)**: switcher แสดงเฉพาะ 3 roles; เลือกแล้วเรียก API + applyToken; branch_admin ไม่เห็น switcher
- Coverage: คงมาตรฐาน package เดิม (ไม่ลดจาก baseline)

---

## Boundaries

**Always**

- validate `ou_id` match ทุกครั้งก่อนออก token ใหม่
- ใช้ RFC 7807 (`application/problem+json`) ทุก error ของ auth
- เขียน test ก่อน/พร้อม implement ตาม TDD; รัน lint + test ก่อน commit
- รักษา canonical trusted-header order ที่ gateway

**Ask first**

- เพิ่ม dependency ใหม่
- เปลี่ยน schema ถาวรของ `auth_users` หรือ index ของ `auth_refresh_tokens`
- เปลี่ยนพฤติกรรม required ของ `x-user-branch` ที่ gateway
- เพิ่ม menu key / permission ใหม่ (กระทบ seed)

**Never**

- แก้ `auth_users.branch_id` (home branch) เมื่อสลับสาขา
- ทำให้ `x-user-home-branch` กลายเป็น required ที่ gateway (ต้อง backward-compatible)
- commit secret / .env
- ให้ frontend เป็นผู้ override branch โดยไม่ผ่านการ validate ที่ auth

---

## Success Criteria

- [ ] AC-1..AC-7 ผ่านครบ (มี test รองรับ)
- [ ] token เก่า (ก่อน deploy, ไม่มี home_branch_id) ยังใช้งานได้ปกติ
- [ ] downstream services (staff list, invoices list) สะท้อน active branch โดยไม่แก้ scope logic
- [ ] My Profile ใช้งานได้ทุก role ทุกสถานะ active/home
- [ ] lint + test + build ผ่านทั้ง 4 แพ็กเกจที่แตะ

---

## Resolved Decisions (ปิด Open Questions แล้ว — 2026-06-24)

1. **family ปัจจุบันตอน switch** → ใช้ refresh cookie/token ที่ติดมากับ request (backoffice `withCredentials`), หา row ด้วย `findRefreshByTokenHash`, `$set active_branch_id` ที่ row นั้น **โดยไม่ rotate**; ไม่มี refresh = `401`. ไม่ผูกกับ `sub` ทั้งก้อน (กัน leak ข้าม session/อุปกรณ์)
2. **default ตอน login** → reset เป็น home branch ทุก login (session-bound, ไม่จำข้ามรอบ); การจำ "สาขาล่าสุด" เป็น future enhancement (out of scope)
3. **su_branch DB connection** → read-only connection ใหม่ใน auth เลียนแบบ `agent-invoice/config/database-read.js`, reuse env `MONGODB_URI_READ` + `MONGODB_DB_BRANCH` (=`gpp_777ww`), `secondaryPreferred`; provision read-only user ถ้า credential เดิมอ่าน `gpp_777ww` ไม่ได้
4. **`active` flag** → อนุญาตเลือกสาขา inactive (validate แค่ `ou_id`); UI แสดงทุกสาขาใน OU เรียง active ก่อน + ติด tag สถานะ

## Open Questions

- (ไม่มี — ปิดครบแล้ว พร้อมเข้า Phase 2: Plan)
