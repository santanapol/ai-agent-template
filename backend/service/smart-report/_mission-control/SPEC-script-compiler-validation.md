# Spec: Smart Report Script Compiler, Validate & Test Run

> ฟีเจอร์ย่อยของ **smart-report** — อ้างอิง baseline ใน [`SPEC.md`](./SPEC.md)  
> สถานะ: **อนุมัติแล้ว** — พร้อม implement ตาม [`PLAN-script-compiler-validation.md`](./PLAN-script-compiler-validation.md)

---

## Assumptions (ข้อสมมติฐาน)

1. ผู้ใช้วาง query แบบ **MongoDB Booster / mongo shell** (sync, ไม่มี `async/await`)
2. ยอม **migrate script ทั้งหมด** ใน DB (ปัจจุบัน 13 reports บน prod) — ไม่ต้อง backward compat กับ `prepareBoosterStyleScript` (regex)
3. การรัน query ยังใช้ **read-only** connection (`MONGODB_URI_READ`) เท่านั้น
4. **Validate** ไม่ยิง DB; **Test Run** ยิง DB จริง
5. **Save** ต้อง Validate ผ่าน + **Test Run ผ่าน** + ส่ง **`testRunToken`** ที่ยังไม่หมดอายุ (บังคับเมื่อ `script` เปลี่ยน)
6. เก็บทั้ง script ต้นฉบับ (ที่ user แก้) และ compiled script (ที่ระบบแปลง)
7. Timeout **เดียวกัน** ทุก path ที่รัน script: `REPORT_SCRIPT_TIMEOUT_MS` (default **120_000** ms)
8. งาน async job queue / timeout ชั่วโมง **อยู่นอก scope** รอบนี้ (ระบุเป็น follow-up)

---

## Objective

### ปัญหา

- Staff วาง query จาก Booster โดยตรง แต่ smart-report sandbox เป็น **Node.js async** — ต้องใช้ `await` / `withReport`
- การแปลง script ด้วย regex ตอน runtime (`prepareBoosterStyleScript`) ซับซ้อนและเปราะ
- ไม่มี gate ก่อน Save — script พังค้นพบตอนรันจริง (ไฟล์ว่าง, timeout)
- Test Run กับ Manual run ใช้ timeout ไม่เท่ากัน — test ผ่านแต่รันจริงล้ม

### เป้าหมาย

ให้ผู้ใช้วาง query แบบ Booster แล้ว:

1. กด **Validate** → ระบบแปลงเป็น `withReport(async () => { ... })` + ตรวจ syntax/rules (ไม่รัน DB)
2. กด **Test Run** → รัน compiled script บน read DB แสดง preview + คืน **`testRunToken`**
3. กด **Save** ได้เมื่อ Validate + Test Run ผ่าน และส่ง `testRunToken` ที่ server verify ได้

### ผู้ใช้

- Staff / Developer ที่สร้างหรือแก้ smart report scripts ผ่าน backoffice `/smart-reports`

### User stories

| # | ในฐานะ | ต้องการ | เพื่อ |
|---|--------|---------|-------|
| US-1 | staff | วาง Booster query โดยไม่เขียน async | ลด friction จาก workflow เดิม |
| US-2 | staff | กด Validate แล้วเห็น error ชัดเจน | แก้ syntax ก่อนเสียเวลารัน |
| US-3 | staff | กด Test Run แล้วเห็นจำนวนแถว + ตัวอย่าง | มั่นใจว่า query ถูกก่อน schedule |
| US-4 | staff | Save ได้เมื่อ validate + test ผ่าน | ป้องกัน report พังบน prod |

### Acceptance criteria

- [ ] Validate แปลง single-trailing `aggregate([...])` เป็น `return await ...` ได้ถูกต้อง
- [ ] Validate แปลง `const x = expr.aggregate(...)` (ไม่มี `.toArray()`) เป็น `const x = await ...`
- [ ] Validate แปลง batch script (หลาย `.toArray()`, `result;`) เป็น `await` + `return` ได้ถูกต้อง
- [ ] Validate ปฏิเสธ script ที่มี write ops (AST: `insert`, `update`, `delete`, `drop`, …)
- [ ] Validate ปฏิเสธ script ที่มี `withReport(` อยู่แล้ว (`ALREADY_COMPILED`)
- [ ] Test Run คืน `recordCount`, `durationMs`, `sample` (สูงสุด 5 แถว), `testRunToken`
- [ ] Save ถูกปฏิเสธ (422) ถ้าไม่มี `testRunToken` ที่ valid หรือ hash ไม่ตรง `script`/`compiledScript`
- [ ] Manual run + scheduler + test run ใช้ `REPORT_SCRIPT_TIMEOUT_MS` เดียวกัน (default 120s)
- [ ] Manual run + scheduler ใช้ `compiledScript` เป็นหลัก (transitional compile-on-read ชั่วคราวได้)
- [ ] migrate ≥12/13 reports สำเร็จ; P1 **disable** + ticket rewrite แยก

---

## Tech Stack

| ชั้น | เทคโนโลยี |
|------|-----------|
| Backend | Node.js >=24, Fastify v5, `mongodb` v7, `vm` sandbox |
| Script parse/transform | **`acorn`** (parse, `ecmaVersion: 2022`) + **`acorn-walk`** (validator) |
| Token | HMAC-signed `testRunToken` (in-memory store หรือ signed payload — ไม่เชื่อ client timestamp อย่างเดียว) |
| Frontend | React, Ant Design, existing `smartReportApiClient` |
| Test | Node built-in test runner (`node --test`) |

---

## Environment

| Variable | Default | ใช้กับ |
|----------|---------|--------|
| `REPORT_SCRIPT_TIMEOUT_MS` | `120000` | Test Run, Manual run, Scheduler |
| `TEST_RUN_TOKEN_TTL_MS` | `900000` (15 นาที) | อายุ `testRunToken` |
| `TEST_RUN_TOKEN_SECRET` | (required in prod) | HMAC sign/verify token |

**Gateway (per-route upstream timeout)**

| Route | Timeout |
|-------|---------|
| `POST .../validate` | 10s |
| `POST .../test-run` | 130s (≥ `REPORT_SCRIPT_TIMEOUT_MS` + buffer) |
| อื่นๆ | ตามค่าเดิม |

---

## Commands

```bash
# Backend (smart-report service)
cd backend/service/smart-report
npm run dev
npm test
npm run lint

# Migrate prod scripts (รันใน deploy pipeline)
node --env-file-if-exists=.env scripts/migrate-report-scripts.mjs --test-run --fail-on-error

# Dry-run (compile only, ไม่ยิง DB)
node --env-file-if-exists=.env scripts/migrate-report-scripts.mjs --dry-run

# Frontend (backoffice)
cd frontend/backoffice
npm run dev
npm test
```

---

## Project Structure (ไฟล์ใหม่ / แก้ไข)

```
backend/service/smart-report/
├── _mission-control/
│   ├── SPEC.md
│   ├── SPEC-script-compiler-validation.md
│   └── PLAN-script-compiler-validation.md
├── src/modules/reports/
│   ├── script-compiler.service.js           # NEW — parse + transform Booster → compiled
│   ├── script-validator.service.js          # NEW — acorn-walk static rules (no DB)
│   ├── test-run-token.service.js            # NEW — issue/verify testRunToken
│   ├── sandbox-runner.service.js            # REFACTOR — withReport helper, ลบ regex
│   ├── reports.schema.js
│   ├── reports.route.js
│   ├── reports.controller.js
│   ├── reports.service.js
│   └── reports.repository.js
├── scripts/
│   └── migrate-report-scripts.mjs
└── src/modules/reports/tests/
    ├── unit-test/
    │   ├── script-compiler.service.test.js
    │   ├── script-validator.service.test.js
    │   └── fixtures/prod-scripts/           # anonymized golden snippets
    └── integration-test/
        └── validate-test-run.route.test.js

backend/gateway/                               # per-route timeout สำหรับ test-run
frontend/backoffice/
├── src/pages/SmartReport.tsx
├── src/lib/smartReportApiClient.ts
└── src/types/smartReport.ts

codes.yaml + src/lib/error-codes.js            # error codes ใหม่ 6 ตัว
```

---

## Technical Design

### 1. Script model (MongoDB `reports` collection)

| ฟิลด์ | ประเภท | คำอธิบาย |
|-------|--------|----------|
| `script` | string | **ต้นฉบับ** ที่ user วาง (Booster style) |
| `compiledScript` | string \| null | หลังแปลง — ใช้รันจริง |
| `validationStatus` | `"pending"` \| `"valid"` \| `"invalid"` | สถานะ Validate ล่าสุด |
| `validationErrors` | string[] | ข้อความ error จาก Validate |
| `validatedAt` | Date \| null | เวลา Validate ผ่านล่าสุด |
| `lastTestRunAt` | Date \| null | เวลา Test Run สำเร็จล่าสุด |
| `lastTestRunMeta` | object \| null | `{ recordCount, durationMs }` snapshot |

**กฎ consistency**

- แก้ `script` → reset `validationStatus=pending`, ล้าง `compiledScript`, `lastTestRunAt`, `lastTestRunMeta`
- Save (เมื่อ `script` เปลี่ยน): ต้อง `validationStatus=valid`, `lastTestRunAt >= validatedAt`, และ `testRunToken` verify ผ่าน
- Save (แก้ name/schedule/enabled/outputFormat อย่างเดียว): **ไม่ต้อง** Validate/Test Run ใหม่

### 2. API response — ฟิลด์ validation ใน GET

| ฟิลด์ | GET list | GET detail | CREATE/UPDATE response |
|-------|----------|------------|------------------------|
| `script` | ไม่ | ใช่ | ใช่ |
| `compiledScript` | ไม่ | ใช่ (read-only) | ใช่ |
| `validationStatus` | ใช่ | ใช่ | ใช่ |
| `validationErrors` | ไม่ | ใช่ (ถ้า invalid) | ใช่ |
| `validatedAt` | ใช่ | ใช่ | ใช่ |
| `lastTestRunAt` | ใช่ | ใช่ | ใช่ |
| `lastTestRunMeta` | ใช่ (`recordCount` only) | ใช่ | ใช่ |

### 3. Compiler (`script-compiler.service.js`)

แปลง Booster script → canonical form:

```js
withReport(async () => {
  // ... body ของ user (แปลงแล้ว) ...
  return <rows>;
});
```

**กฎแปลง (AST-based, ไม่ใช้ regex)**

| รูปแบบ input | output |
|---------------|--------|
| `expr.aggregate([...])` เป็น expression สุดท้าย | `return await expr.aggregate([...])` |
| `expr.find({...})` เป็น expression สุดท้าย | `return await expr.find({...})` |
| `expr.findOne({...})` เป็น expression สุดท้าย | `return await expr.findOne({...})` |
| `const x = expr.aggregate(...)` (ไม่มี `.toArray()`) | `const x = await expr.aggregate(...)` |
| `const x = expr.find(...)` (ไม่มี `.toArray()`) | `const x = await expr.find(...)` |
| `const x = expr.aggregate(...).toArray()` | `const x = await expr.aggregate(...)` |
| `const x = expr.find(...).toArray()` | `const x = await expr.find(...)` |
| `result;` / `rows;` ท้าย script | `return result` / `return rows` |
| มี `withReport(` อยู่แล้ว | **reject** `ALREADY_COMPILED` |

**Golden fixtures:** snippet จาก prod 13 ตัวใน `unit-test/fixtures/prod-scripts/`

### 4. Validator (`script-validator.service.js`)

ใช้ **acorn-walk** ตรวจ `CallExpression` — ไม่ใช้ string/regex match

```js
const WRITE_OPS = [
  "insert", "insertOne", "insertMany",
  "update", "updateOne", "updateMany",
  "delete", "deleteOne", "deleteMany",
  "drop", "dropIndex",
];
```

- ต้องมี return path หลัง compile (ReturnStatement ใน `withReport` callback)
- Reject `.toArray().forEach(...insert...)` และ write ops ทุกรูปแบบที่ตรวจได้จาก AST

### 5. Sandbox refactor (`sandbox-runner.service.js`)

**ลบ (release สุดท้าย):** `prepareBoosterStyleScript`, `wrapShellCursor` / `.toArray()` wrapper

**ใหม่:**

```js
// sandbox context — ชื่อ withReport ไม่ชน scheduler.runReport()
withReport: (fn) => fn(),

// collection API — คืน Promise ตรงๆ
await db.getSiblingDB("x").col.aggregate([...])  // → array
await db.getSiblingDB("x").col.find({...})      // → array
await db.getSiblingDB("x").col.findOne({...})   // → object | null
```

**Runtime script resolution**

```js
const runnable =
  report.compiledScript ?? compileOnRead(report.script); // transitional only — log WARN
```

- Production path หลัก: รัน **`compiledScript`**
- Transitional (release แรกเท่านั้น): ถ้า `compiledScript` ว่าง → AST compile-on-read + log warning
- **ไม่** ใช้ regex `prepareBoosterStyleScript` อีก

**Timeout:** ทุก `runReportScript()` ใช้ `REPORT_SCRIPT_TIMEOUT_MS` (default 120s)

### 6. Validate vs Test Run vs Save

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ User script │────▶│ Validate (fast)  │────▶│ compiledScript  │
└─────────────┘     │ • acorn parse    │     │ + status valid  │
                    │ • acorn-walk     │     └────────┬────────┘
                    │ • compile        │              │
                    │ • NO database    │              ▼
                    └──────────────────┘     ┌─────────────────┐
                                             │ Test Run (slow) │
                                             │ • run compiled  │
                                             │ • read DB       │
                                             │ • preview rows  │
                                             │ • testRunToken  │
                                             └────────┬────────┘
                                                      ▼
                                             ┌─────────────────┐
                                             │ Save + token    │
                                             └─────────────────┘
```

| | Validate | Test Run | Save |
|--|----------|----------|------|
| HTTP | `POST .../validate` | `POST .../test-run` | `POST` / `PUT .../:id` |
| DB read | ไม่ | ใช่ | ไม่ (verify token) |
| Timeout | 5s (parse only) | `REPORT_SCRIPT_TIMEOUT_MS` | — |
| Response | `compiledScript`, `errors[]` | `recordCount`, `sample[]`, `durationMs`, `testRunToken` | report document |

### 7. Test Run — params

ใช้ logic **เดียวกับ manual run**:

```js
params = {
  ...reportParamsFromForm,              // ou_id, branch_id, timezoneOffsetMinutes, etc.
  startDate: yesterdayStart.toISOString(),
  endDate: yesterdayEnd.toISOString(),
};
```

- UI แสดง badge: `Testing with: yesterday (YYYY-MM-DD)`
- Date picker สำหรับ test ช่วงอื่น → **out of scope** รอบนี้

### 8. testRunToken (`test-run-token.service.js`)

**ออกเมื่อ Test Run สำเร็จ**

```js
{
  scriptHash: sha256(script),           // จาก request หรือ compile ย้อนกลับ
  compiledHash: sha256(compiledScript),
  recordCount: number,
  testedAt: ISO8601,
  expiresAt: ISO8601,                   // now + TEST_RUN_TOKEN_TTL_MS (15m)
}
```

- Sign ด้วย HMAC (`TEST_RUN_TOKEN_SECRET`)
- Save ต้องส่ง `testRunToken` + `script` + `compiledScript`
- Server verify: signature valid, ไม่หมดอายุ, hash ตรง

### 9. API Endpoints

```
POST /api/v1/smart-reports/validate
Body: { script: string }
Response 200: {
  success, data: {
    valid: boolean,
    compiledScript: string | null,
    errors: { line?: number, message: string }[]
  }
}

POST /api/v1/smart-reports/test-run
Body: { script: string, compiledScript: string, params?: object }
Response 200: {
  success, data: {
    success: boolean,
    recordCount: number,
    durationMs: number,
    sample: object[],           // max 5 rows
    testRunToken: string,
    errors: string[]
  }
}

POST /api/v1/smart-reports
PUT  /api/v1/smart-reports/:id
Body (เมื่อ script เปลี่ยน): {
  ...reportFields,
  script: string,
  compiledScript: string,
  testRunToken: string
}
```

**แก้ไข existing**

- `POST /api/v1/smart-reports/:id/run` — ใช้ `compiledScript` จาก DB (transitional compile-on-read ได้)

**Error codes** (เพิ่มใน `codes.yaml` + `error-codes.js`):

| สถานการณ์ | HTTP | code |
|-----------|------|------|
| Syntax / rule invalid | 422 | `VALIDATION_FAILED` |
| Save without validate | 422 | `REPORT_NOT_VALIDATED` |
| Save without test run | 422 | `REPORT_NOT_TESTED` |
| Script run timeout | 422 | `TEST_RUN_TIMEOUT` |
| Token missing/expired/wrong hash | 422 | `TEST_RUN_TOKEN_INVALID` |
| User pasted compiled script | 422 | `ALREADY_COMPILED` |

### 10. Scheduler — missing `compiledScript`

ถ้า `enabled=true` แต่ไม่มี `compiledScript`:

```js
logger.warn({ reportId, name }, "Skipping scheduled run: missing compiledScript");
insertDownloadHistory({
  status: "failed",
  error: "MISSING_COMPILED_SCRIPT",
});
return; // ไม่ auto-disable report
```

### 11. Frontend (`SmartReport.tsx`)

**Script editor drawer**

- ปุ่ม **Validate** — เรียก API, แสดง errors หรือ tab "Compiled"
- ปุ่ม **Test Run** — disabled จน Validate ผ่าน; แสดง recordCount + sample table + date badge
- ปุ่ม **Save** — disabled จน Validate + Test Run ผ่าน; ส่ง `testRunToken` ใน payload
- แสดง badge: `Pending` / `Validated` / `Tested`
- แก้ script → reset สถานะเป็น Pending, ล้าง token

**Default template** (Booster style — มีอยู่แล้วใน `DEFAULT_QUERY_EXAMPLE`):

```js
const targetDB = db.getSiblingDB("your_database");

const startDate = ISODate(params.startDate);
const endDate = ISODate(params.endDate);

targetDB.your_collection.aggregate([
  { $match: { created_at: { $gte: startDate, $lte: endDate } } },
  { $project: { _id: 0, field: 1 } },
]);
```

### 12. Deploy strategy

```
Release 1 (feature):
1. Deploy code (compiler + APIs + transitional compile-on-read)
2. รัน migrate-report-scripts.mjs --test-run --fail-on-error
3. ตรวจ ≥12/13 pass (P1 disabled)
4. เปิด traffic / restart scheduler

Release 2 (cleanup):
5. ลบ compile-on-read fallback
6. ลบ prepareBoosterStyleScript + dead tests
```

### 13. Migration (13 prod reports)

| กลุ่ม | reports | การ migrate |
|-------|---------|-------------|
| A — single aggregate | 11 | auto-compile + test run |
| B — batch `.toArray()` | WWL Monthly report | auto-compile + test run |
| C — `insert()` | Rolling Commission P1 | **`enabled: false`** + ticket rewrite แยก |

**สคริปต์ `migrate-report-scripts.mjs`**

1. อ่าน reports จาก DB
2. Validate + compile แต่ละตัว
3. Test run (`--test-run`) หรือข้าม DB (`--dry-run`)
4. อัปเดต `compiledScript` + validation fields
5. `--fail-on-error` → exit 1 ถ้ามี report ล้ม (ยกเว้น P1 ที่ disable ไว้แล้ว)

**หลัง deploy:** report ใหม่ทุกตัวใช้ Validate + Test Run ใน UI (ไม่ผ่าน migrate script)

---

## Code Style

- ESM (`import`/`export`), ฟังก์ชันแยก service ชัดเจน (compiler / validator / token / runner)
- ชื่อ sandbox helper: **`withReport`** (ไม่ใช่ `runReport` — ชนกับ `scheduler.runReport`)
- API response ใช้ `successEnvelope` + error codes มาตรฐานเดิม
- Frontend: เรียก API ผ่าน `smartReportApiClient`, feedback ผ่าน `useAppFeedback`

**ตัวอย่าง compiled output**

```js
withReport(async () => {
  const targetDB = db.getSiblingDB("gpp_777ww");
  const startDate = ISODate(params.startDate);
  const endDate = ISODate(params.endDate);
  return await targetDB.dm_dm_tn_deposit.aggregate([
    { $match: { created_at: { $gte: startDate, $lte: endDate } } },
    { $project: { /* ... */ } },
  ]);
});
```

---

## Testing Strategy

| ระดับ | ครอบคลุม |
|-------|----------|
| Unit | `script-compiler` — ทุก pattern + prod golden fixtures |
| Unit | `script-validator` — AST reject write ops + `ALREADY_COMPILED` |
| Unit | `test-run-token` — issue, verify, expiry, hash mismatch |
| Unit | `sandbox-runner` — `withReport` + await aggregate/find/findOne |
| Integration | `POST /validate`, `POST /test-run`, save gate + token |
| Integration | Scheduler skip เมื่อไม่มี `compiledScript` |
| Manual | UI flow Validate → Test Run → Save; manual run ตรงกับ test run |

```bash
cd backend/service/smart-report && npm test
cd frontend/backoffice && npm test -- smartReport
```

---

## Boundaries

### Always

- Validate ไม่เชื่อมต่อ read DB
- Test Run / manual run / scheduler ใช้ read-only connection เท่านั้น
- Timeout เดียวกัน: `REPORT_SCRIPT_TIMEOUT_MS` ทุก path
- รัน `compiledScript` เป็นหลัก; transitional compile-on-read ใช้ AST compiler เดียวกัน
- Save ต้อง verify `testRunToken` เมื่อ `script` เปลี่ยน
- Unit test ทุก compiler rule ก่อน merge

### Ask first

- เพิ่ม dependency นอก `acorn` / `acorn-walk`
- เปลี่ยน save gate เป็น "Test Run optional"
- เพิ่ม async job queue
- Date picker สำหรับ Test Run

### Never

- รัน `script` ดิบโดยไม่ compile บน production path (ยกเว้น transitional ชั่วคราว)
- อนุญาต write ops ใน sandbox
- ใช้ regex เป็น primary compiler
- เชื่อ client timestamp อย่างเดียวสำหรับ save gate

---

## Success Criteria

1. User วาง Booster query → Validate → เห็น compiled script ไม่มี error
2. Test Run แสดง `recordCount` + sample 5 แถวสำหรับ Staff Login History
3. Save ถูก block จนกว่า Validate + Test Run + valid `testRunToken`
4. Manual run ใช้ `compiledScript` — ผลลัพธ์ตรงกับ Test Run (params เดียวกัน)
5. migrate ≥12 reports สำเร็จ; P1 disabled + ticket แยก
6. ลบ `prepareBoosterStyleScript` ใน release cleanup
7. Gateway test-run timeout 130s; `npm test` ผ่าน

---

## Out of Scope (รอบนี้)

- Async job queue สำหรับ report ช้า > 120s
- Timeout แยกต่อ report
- UI diff script vs compiled
- Auto-validate on keystroke
- Test Run date picker (ช่วงวันที่กำหนดเอง)
- Tenant isolation / role-based report access
- P1 rewrite (ticket แยก)

---

## Decisions (resolved)

| หัวข้อ | การตัดสินใจ |
|--------|-------------|
| Timeout | `REPORT_SCRIPT_TIMEOUT_MS=120000` ทุก path; gateway test-run 130s |
| Save gate proof | `testRunToken` HMAC, TTL 15 นาที |
| Deploy | Big-bang + migrate script ก่อนเปิด traffic + transitional compile-on-read |
| Sandbox helper | `withReport` (ไม่ใช่ `runReport`) |
| P1 | `enabled: false` + ticket rewrite แยก |
| Prod migrate | `migrate-report-scripts.mjs --test-run --fail-on-error` ตอน deploy |
| Scheduler ไม่มี compiledScript | skip + failed history record (ไม่ auto-disable) |
| Test Run params | เหมือน manual run (yesterday) |

---

## Related Coding Standards

- `coding-standard/backend/1-tech-stack.md`
- `coding-standard/backend/2-folder-structure.md`
- `coding-standard/backend/3-api-routing.md`
- `coding-standard/backend/6-api-response-codes.md`
- `coding-standard/backend/12-data-management.md`
- `coding-standard/frontend/backoffice/1-tech-stack.md`
- `coding-standard/frontend/backoffice/2-folder-structure.md`
- `coding-standard/frontend/backoffice/3-routing-and-pages.md`
- `coding-standard/frontend/backoffice/5-api-integration.md`
- `coding-standard/gateway/3-api-routing.md`
