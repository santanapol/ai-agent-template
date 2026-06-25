# Implementation Plan: Active Branch Selector (Approach 2)

> อ้างอิง Spec: [`../SPEC-active-branch-selector.md`](../SPEC-active-branch-selector.md)
> สถานะ: **DRAFT — รอ Human review** (Phase 2: Plan ตาม `planning-and-task-breakdown`)
> ครอบคลุม 4 แพ็กเกจ: `backend/auth`, `backend/gateway`, `backend/service/staff`, `frontend/backoffice`

## Overview

ให้ role `platform_admin` / `support_admin` / `support` สลับ "สาขาที่กำลังทำงาน" (active branch) ผ่านการออก access JWT ใหม่ (claim `branch_id` = active, เพิ่ม `home_branch_id`) โดย downstream services ไม่ต้องแก้ logic การ scope; active branch อยู่รอดข้าม refresh ผ่าน `active_branch_id` ที่ refresh row; กัน My Profile 403 ด้วย `x-user-home-branch` + staff self-check

## Architecture Decisions

- **branch_id = active, home_branch_id = home (claim ใหม่)** — ใช้ประโยชน์จาก gateway ที่ map `branch_id → x-user-branch` อยู่แล้ว downstream ไม่ต้องแก้ scope
- **switch ไม่ rotate refresh** — แค่ `$set active_branch_id` ที่ row ปัจจุบัน + ออก access ใหม่ เลี่ยง reuse-detection churn
- **session-bound** — active เก็บที่ refresh row, copy ตอน rotate, reset เป็น home ทุก login
- **su_branch อ่านจาก `gpp_777ww` (read-only connection แยก)** — เลียนแบบ `agent-invoice/config/database-read.js`, reuse env `MONGODB_URI_READ` + `MONGODB_DB_BRANCH`
- **gateway backward-compatible** — `x-user-home-branch` เป็น optional ไม่ reject ถ้าขาด (token เก่ายังใช้ได้)
- **staff self-check ใช้ home branch** — `homeBranchId ?? branchId` (fallback ปลอดภัยเมื่อ header ขาด)

## Dependency Graph

```
[T1] jwt-access: home_branch_id claim + issueAccess({activeBranchId, homeBranchId})
   │   (foundation — backward compatible, active defaults to home)
   ▼
[T2] refresh row: active_branch_id field + copy-on-rotate + login sets null
   │
   ├─────────────► [T3] branch-read-db + branch-read.repository (su_branch)
   │                   │
   │                   ▼
   │               [T4] error codes (codes.yaml + problem types)
   │                   │
   │                   ▼
   │               [T5] endpoint: validator+route+controller+service+openapi  ← AC-1..4
   │                       │
   │                       └──────────────► [T8] FE: api client + AuthContext
   │                                            │
   │                                            ▼
   │                                        [T9] FE: AdminLayout switcher UI  ← US-1,5
   │
   └─► [T6] gateway: forward x-user-home-branch (env+inject+allowlist) ← AC-5
           │
           ▼
       [T7] staff: user-context homeBranchId + self-profile patch ← AC-6
```

## Task List

### Phase 1: Foundation (auth core — backward compatible, ระบบยังทำงานปกติ)

- [ ] **T1** jwt-access + issueAccess: เพิ่ม claim `home_branch_id`, ปรับ signature ให้รับ `{ activeBranchId, homeBranchId }` (active default = home)
- [ ] **T2** refresh row `active_branch_id`: เพิ่มฟิลด์ (default null), copy-on-rotate, `login()` ตั้ง null, `issueAccess` อ่าน active จาก row ตอน refresh

### Checkpoint: Foundation

- [ ] `npm test` (auth) ผ่านทั้งหมด — login/refresh/menus เดิมไม่พัง
- [ ] decode token จาก login เห็น `home_branch_id` == `branch_id`
- [ ] Human review ก่อนไป Phase 2

### Phase 2: Switch Endpoint (auth — vertical slice หลังบ้าน) → AC-1,2,3,4

- [ ] **T3** branch-read connection + `branch-read.repository.findByIdInOu(branch_id, ou_id)` (su_branch, secondaryPreferred) + env
- [ ] **T4** ลงทะเบียน error codes ใหม่ (`AUTH_BRANCH_SWITCH_FORBIDDEN`, `AUTH_BRANCH_FORBIDDEN`, `AUTH_BRANCH_NOT_FOUND`) ใน `codes.yaml` + problem types
- [ ] **T5** `POST /auth/me/active-branch`: validator + route (rate limit + requireAccessBearer) + controller + `service.switchActiveBranch` + audit + openapi

### Checkpoint: Backend Switch

- [ ] integration test: role allowed/denied, branch in/out OU, not found, no-refresh→401
- [ ] refresh survival test: switch → refresh → `branch_id` ยังเป็น active
- [ ] `npm run lint` + spectral (openapi) ผ่าน
- [ ] Human review

### Phase 3: My Profile Survival (gateway + staff) → AC-5,6

- [ ] **T6** gateway: `JWT_CLAIM_HOME_BRANCH` env + inject `x-user-home-branch` (optional) + allowlist/forward ตาม canonical order
- [ ] **T7** staff: `user-context` อ่าน `homeBranchId` + `assertProfileScope` self-check ใช้ home branch

### Checkpoint: My Profile

- [ ] gateway test: forward home branch; token ไม่มี claim → ยัง 200 (backward compat)
- [ ] staff test: self-profile ผ่านเมื่อ active ≠ home; cross-branch scope เดิมไม่พัง
- [ ] Human review

### Phase 4: Frontend (backoffice) → US-1,5, AC-7

- [ ] **T8** FE foundation: `types/auth.ts` (+home_branch_id), `authApiClient.switchActiveBranch`, `AuthContext.switchBranch` (applyToken)
- [ ] **T9** FE UI: AdminLayout branch switcher (`<Select>` เฉพาะ 3 roles) + โหลดสาขา (reuse `GET /api/v1/invoices/agent`) + refetch หน้า/เมนู

### Checkpoint: Complete

- [ ] vitest: switcher แสดงเฉพาะ 3 roles; branch_admin/staff ไม่เห็น; เลือกแล้วเรียก API + applyToken
- [ ] manual E2E: login platform_admin → สลับสาขา → staff/invoices list เปลี่ยนตามสาขา → My Profile เปิดได้ → refresh แล้ว active คงอยู่
- [ ] lint + test + build ผ่านทั้ง 4 แพ็กเกจ
- [ ] บรรลุ AC-1..AC-7 + Success Criteria ครบ

## Risks and Mitigations

| ความเสี่ยง                                                       | ผลกระทบ | วิธีรับมือ                                                                                          |
| ---------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| auth เข้าถึง `gpp_777ww` (su_branch) ไม่ได้ (credential/cluster) | High    | ทำ T3 ก่อน (fail fast); เพิ่ม health check; เตรียม provision read-only user                         |
| token เก่าไม่มี `home_branch_id` หลัง deploy                     | High    | gateway ทำ optional (ไม่ reject); staff fallback `?? branchId`; ทดสอบ backward compat ใน checkpoint |
| self-profile ของ 3 roles 403 เมื่อ active ≠ home                 | High    | T6+T7 เป็น phase เดียว มี checkpoint AC-6 ก่อนปล่อย FE                                              |
| active_branch_id ไม่ถูก copy ตอน rotate → active หายหลัง refresh | Med     | unit test เฉพาะ `rotateRefreshTokenTxnBody`; AC-4 ใน checkpoint                                     |
| ขนาด JWT โตขึ้นจาก claim ใหม่                                    | Low     | home_branch_id เป็น 24-hex สั้น; soft-limit guard เดิมยังทำงาน                                      |
| FE applyToken ไม่ refetch เมนู/หน้า                              | Med     | switchBranch trigger re-fetch (`token_gen`/permissionsKey effect เดิม) + manual E2E                 |

## Parallelization Opportunities

- **ขนานได้หลัง T5 (API contract นิ่ง):** Phase 3 (gateway+staff) กับ Phase 4 (frontend) ทำขนานได้
- **ต้องทำตามลำดับ:** T1 → T2 → T3 → T4 → T5 (foundation chain)
- **ภายใน Phase 3:** T6 ก่อน T7 (staff อ่าน header ที่ gateway ส่ง) แต่ staff fallback ปลอดภัยจึงทดสอบแยกได้

## Open Questions

- (ไม่มี — ปิดครบใน Spec แล้ว)
