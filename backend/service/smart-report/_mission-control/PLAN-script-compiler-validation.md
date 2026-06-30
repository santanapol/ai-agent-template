# Plan: Smart Report Script Compiler, Validate & Test Run

> อ้างอิง [`SPEC-script-compiler-validation.md`](./SPEC-script-compiler-validation.md)  
> สถานะ: **อนุมัติแล้ว** — พร้อม implement

---

## Overview

```
Phase 1: Sandbox refactor + compiler core (backend)
    ↓
Phase 2: Validate / Test Run APIs + token + save gate + error codes + gateway
    ↓
Phase 3: Frontend UI (Validate, Test Run, Save gate + token)
    ↓
Phase 4: Deploy migrate scripts + P1 disable + cleanup regex
    ↓
Phase 5: Verify end-to-end + release 2 cleanup
```

**ความเสี่ยงหลัก**

| ความเสี่ยง | ผลกระทบ | แนวทาง |
|-----------|---------|--------|
| AST compiler ไม่ครอบคลุม pattern เก่า | report พังหลัง migrate | golden fixtures จาก prod 13 ตัว |
| Report ใหญ่เกิน 120s | Save/Test ไม่ได้ | แจ้งใน UI; async queue เป็น follow-up |
| P1 ใช้ insert | migrate ไม่ผ่าน | **disable** + ticket rewrite แยก |
| Save gate บล็อก edit อื่น | UX แย่ | gate + token เฉพาะเมื่อ `script` เปลี่ยน |
| Deploy กลางทาง | report พัง | transitional compile-on-read (AST) ใน release 1 |
| Gateway timeout 30s | Test Run 504 | per-route 130s สำหรับ test-run |

---

## Phase 1 — Sandbox refactor + compiler core

### 1.1 Refactor sandbox runner

- [x] **Task:** เพิ่ม `withReport(fn => fn())` ใน sandbox context; `aggregate`/`find` คืน `Promise<array>`
  - Acceptance: compiled script `withReport(async () => { return await ... })` ทำงาน
  - Verify: integration test รัน fixture collection
  - Files: `sandbox-runner.service.js`

- [x] **Task:** ใช้ `REPORT_SCRIPT_TIMEOUT_MS` (default 120000) แทน hardcoded 30s
  - Acceptance: env ปรับได้; ค่าเดียวกันทุก caller
  - Files: `sandbox-runner.service.js`, `.env.example`

- [ ] **Task:** Transitional `compileOnRead(script)` fallback เมื่อ `compiledScript` ว่าง
  - Acceptance: log WARN + metric; ใช้ AST compiler ไม่ใช่ regex
  - Files: `reports.service.js` หรือ `scheduler.service.js`

- [x] **Task:** ยังคง `prepareBoosterStyleScript` ชั่วคราวจน Phase 4 (หรือลบทันทีถ้ามี compile-on-read)
  - Acceptance: ไม่มี regression ระหว่าง Phase 1–3
  - Files: `sandbox-runner.service.js` — อัปเดตให้ strip `.toArray()` เมื่อ inject await

### 1.2 Script compiler (AST)

- [x] **Task:** เพิ่ม dependency `acorn` + `acorn-walk`
  - Acceptance: `package.json` + lockfile อัปเดต; `ecmaVersion: 2022`
  - Files: `package.json`

- [x] **Task:** สร้าง `script-compiler.service.js`
  - Acceptance: แปลงครบตาม spec (trailing aggregate/find/findOne, assignment ไม่มี toArray, batch toArray, result;)
  - Verify: `unit-test/script-compiler.service.test.js` + `fixtures/prod-scripts/`
  - Files: `script-compiler.service.js`, tests

- [x] **Task:** สร้าง `script-validator.service.js` (acorn-walk CallExpression)
  - Acceptance: reject WRITE_OPS; reject `withReport(` input (`ALREADY_COMPILED`); ต้องมี return path
  - Verify: unit tests
  - Files: `script-validator.service.js`, tests

**Checkpoint 1:** compiler unit tests ผ่านทุก pattern จาก prod 13 ตัว (compile-only)

---

## Phase 2 — APIs + persistence + infrastructure

### 2.1 Error codes

- [ ] **Task:** เพิ่ม 6 codes ใน `codes.yaml` + `error-codes.js`
  - Codes: `VALIDATION_FAILED`, `REPORT_NOT_VALIDATED`, `REPORT_NOT_TESTED`, `TEST_RUN_TIMEOUT`, `TEST_RUN_TOKEN_INVALID`, `ALREADY_COMPILED`
  - Files: `codes.yaml`, `src/lib/error-codes.js`

### 2.2 Schema & repository

- [ ] **Task:** ขยาย `reports` document + repository + `serializeReport`
  - Acceptance: ฟิลด์ validation ครบ; GET list/detail ตามตารางใน spec
  - Files: `reports.repository.js`, `reports.schema.js`, `reports.service.js`

### 2.3 testRunToken service

- [ ] **Task:** สร้าง `test-run-token.service.js`
  - Acceptance: issue หลัง test run สำเร็จ; verify hash + expiry; TTL 15m
  - Verify: unit tests (valid, expired, hash mismatch)
  - Files: `test-run-token.service.js`, tests

### 2.4 Validate API

- [ ] **Task:** `POST /api/v1/smart-reports/validate`
  - Acceptance: คืน `valid`, `compiledScript`, `errors[]`; ไม่เชื่อม read DB
  - Verify: `integration-test/validate-test-run.route.test.js`
  - Files: `reports.route.js`, `reports.controller.js`, `reports.service.js`, `reports.schema.js`

### 2.5 Test Run API

- [ ] **Task:** `POST /api/v1/smart-reports/test-run`
  - Acceptance: รัน `compiledScript` + params (yesterday เหมือน manual); คืน `recordCount`, `sample` (≤5), `durationMs`, `testRunToken`
  - Verify: integration test + timeout case
  - Files: เดียวกับด้านบน

### 2.6 Save gate

- [ ] **Task:** บังคับ `testRunToken` + validate state ก่อน create/update เมื่อ `script` เปลี่ยน
  - Acceptance: 422 `TEST_RUN_TOKEN_INVALID` / `REPORT_NOT_VALIDATED` / `REPORT_NOT_TESTED`
  - Verify: integration test `reports.route.test.js`
  - Files: `reports.service.js`

- [ ] **Task:** Manual run + scheduler ใช้ `compiledScript` (fallback compile-on-read)
  - Acceptance: ไม่เรียก regex ตอน runtime
  - Verify: scheduler integration test
  - Files: `scheduler.service.js`, `reports.service.js`

- [ ] **Task:** Scheduler skip เมื่อไม่มี `compiledScript`
  - Acceptance: `download_history` status `failed`, error `MISSING_COMPILED_SCRIPT`; ไม่ auto-disable
  - Files: `scheduler.service.js`

### 2.7 Gateway

- [ ] **Task:** ลงทะเบียน/override timeout สำหรับ route ใหม่
  - Acceptance: `validate` 10s; `test-run` 130s
  - Files: gateway route config

**Checkpoint 2:** validate + test-run ผ่าน `app.inject` กับ Staff Login History; token verify บน mock save

---

## Phase 3 — Frontend

### 3.1 API client & types

- [ ] **Task:** `validateReport(script)` และ `testRunReport(script, compiledScript, params?)`
  - Acceptance: map `testRunToken`; types ครบ
  - Verify: `smartReportApiClient.test.ts`
  - Files: `smartReportApiClient.ts`, `types/smartReport.ts`

### 3.2 UI — Script editor

- [ ] **Task:** ปุ่ม Validate + errors / tab "Compiled"
  - Acceptance: error แสดงบรรทัด
  - Files: `SmartReport.tsx`

- [ ] **Task:** ปุ่ม Test Run + preview table + badge `Testing with: yesterday`
  - Acceptance: disabled จน validate ผ่าน; เก็บ `testRunToken` ใน form state
  - Files: `SmartReport.tsx`

- [ ] **Task:** Save gate + ส่ง `testRunToken` + status badges
  - Acceptance: Save disabled จน tested; แก้ script → reset pending + ล้าง token
  - Files: `SmartReport.tsx`

- [ ] **Task:** แสดง validation fields ใน list/detail (badges)
  - Acceptance: `validationStatus`, `lastTestRunMeta.recordCount` ใน list
  - Files: `SmartReport.tsx`

**Checkpoint 3:** UI flow ครบ Validate → Test Run → Save บน local

---

## Phase 4 — Migration & deploy

### 4.1 Migrate script

- [ ] **Task:** `scripts/migrate-report-scripts.mjs`
  - Acceptance: `--dry-run`, `--test-run`, `--fail-on-error`; รายงาน pass/fail
  - Verify: รันกับ local DB ที่มี prod 13 ตัว
  - Files: `scripts/migrate-report-scripts.mjs`

- [ ] **Task:** Disable **Rolling Commission 777WW [New] P1**
  - Acceptance: `enabled: false`; ไม่ block `--fail-on-error` สำหรับที่เหลือ
  - Verify: migrate report ≥12 pass

### 4.2 Deploy runbook

- [ ] **Task:** บันทึก deploy steps ใน plan หรือ README
  ```
  1. Deploy release 1
  2. node scripts/migrate-report-scripts.mjs --test-run --fail-on-error
  3. Restart scheduler
  ```

**Checkpoint 4:** ≥12 reports migrate สำเร็จ; P1 disabled

---

## Phase 5 — E2E verify + cleanup (release 2)

- [ ] **Task:** Manual run Staff Login History + WWL Monthly — `recordCount > 0`, ไฟล์ไม่ว่าง
- [ ] **Task:** Scheduler smoke ด้วย `compiledScript`
- [ ] **Task:** ลบ `prepareBoosterStyleScript`, `wrapShellCursor`, `sandbox-runner.prepare.test.js`
- [ ] **Task:** ลบ transitional compile-on-read fallback
- [ ] **Task:** อัปเดต `SPEC.md` baseline — sandbox API (`withReport`), timeout, validation flow
- [ ] **Task:** สร้าง ticket P1 rewrite (out of scope รอบนี้)

**Checkpoint 5:** `rg prepareBooster` ว่าง; manual run ตรงกับ test run

---

## Parallelization

| ทำขนานได้ | ต้องรอก่อน |
|-----------|-----------|
| Phase 1 compiler + Phase 2 schema design | Phase 2 APIs รอ Phase 1 sandbox + compiler |
| Phase 2 gateway + error codes | ไม่ขึ้นกับ frontend |
| Phase 3 API client (mock) | Phase 3 UI รอ Phase 2 endpoints |
| Migration script draft | รัน migrate หลัง Phase 2 เสร็จ |

---

## Task summary (ลำดับแนะนำ)

| # | Task | Phase |
|---|------|-------|
| 1 | Sandbox `withReport` + timeout 120s | 1 |
| 2 | script-compiler + validator + fixtures | 1 |
| 3 | Error codes (6) | 2 |
| 4 | Schema + repository + serializeReport | 2 |
| 5 | test-run-token.service | 2 |
| 6 | POST /validate + POST /test-run | 2 |
| 7 | Save gate + scheduler compiledScript | 2 |
| 8 | Gateway timeouts | 2 |
| 9 | Frontend API client + types | 3 |
| 10 | Frontend UI + token | 3 |
| 11 | migrate-report-scripts.mjs | 4 |
| 12 | P1 disable | 4 |
| 13 | Deploy + migrate | 4 |
| 14 | E2E verify | 5 |
| 15 | ลบ regex + compile-on-read fallback | 5 |

---

## Definition of Done

- [x] Spec + Plan อนุมัติแล้ว
- [ ] ทุก task ด้านบนเสร็จ
- [ ] `npm test` + `npm run lint` ผ่าน (backend + frontend ที่แตะ)
- [ ] ≥12 prod scripts migrate สำเร็จ; P1 disabled
- [ ] ไม่มี `prepareBoosterStyleScript` หลัง release 2 cleanup
- [ ] Test Run timeout = Manual run timeout = 120s (default)
