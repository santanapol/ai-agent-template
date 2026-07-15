# คู่มือ QA Code Audit — Backend

> **สถานะ:** คู่มือ (draft) — ยังไม่ได้สร้าง agent skill หรือ slash command
> **อ่านคู่กับ:** [Common (SoT, workflow, playbook, report)](./qa-code-audit-common.md) · [Frontend checklist](./qa-code-audit-frontend.md)

อ้างอิง **spec/OpenAPI** เป็นหลัก

**เครื่องมือ:** `node --test`, `fastify.inject()`, Bruno (`backend/_bruno`), `smoke.sh`

อ่านเพิ่ม: `knowledge/software-testing/01-unit-testing/`, `02-integration-testing/`, `04-sit-testing/`, `09-security-testing/`

---

## 1. Unit testing

**เป้าหมาย:** logic ผิดใน isolation

| ตรวจ | ตัวอย่าง |
|------|----------|
| Happy path ตรง spec | ค่าจาก spec หรือ business-domain.md |
| Empty / null / undefined | |
| Boundary | min, max, zero, negative |
| Error codes | ตรง `CODES` / OpenAPI enum |
| Date/time | timezone, end-of-day |
| Pagination math | offset, limit, total |

**Bug-hunt:** test assert แค่ `statusCode === 200`; mock มากเกินไป; test name ไม่สะท้อน requirement

```bash
cd backend/service/<service>
npm test
```

## 2. Integration testing

**เป้าหมาย:** handler → service → repo → DB

| ตรวจ | หมายเหตุ |
|------|----------|
| `fastify.inject()` | route หลัก + error paths |
| Validation ที่ boundary | reject ก่อนเข้า service |
| Response envelope | `success`, `code`, `data` |
| DB side effects | ตรงกับ API response |
| Mesh guards | missing/wrong `x-gateway-secret` → 401 |
| Concurrency ที่ repo layer | 2 requests read-modify-write ทับกันโดยไม่มี lock/version → final state เพี้ยนไหม |

**Bug-hunt:** env mock ไม่ตรง prod; test ข้าม validation; skip เมื่อไม่มี `MONGODB_URI` = coverage gap

## 3. API / SIT testing

**เป้าหมาย:** ระบบรันจริง ผ่าน gateway

| ตรวจ | |
|------|--|
| `smoke.sh` ผ่าน | ทุก service ที่เกี่ยวข้อง |
| Login → gateway → internal | |
| Method, path, query | ตรง OpenAPI |
| Status codes | ตรง api-response-codes |
| Pagination edge | empty, last page, limit เกิน max |
| Cross-service flow | เช่น staff → auth revoke |
| Idempotent retry | ยิง request เดิมซ้ำ (network flaky / gateway retry) ต้องไม่สร้าง resource ซ้ำ |

**Bug-hunt:** ยิง internal port ข้ามgateway; 200 แต่ `success: false`; error leak stack/connection string

## 4. Adversarial / security probes

สิ่งที่ระบบ **ต้องปฏิเสธ:**

- Write ใน read-only sandbox
- Injection strings (NoSQL, script)
- Oversized body (`bodyLimit`)
- AuthZ: user A เข้า resource ของ B
- Privilege escalation
- Replay / expired token
- Partial failure ข้าม service (mesh call สำเร็จครึ่งเดียว) — ต้องไม่ปล่อย orphaned state

Security เชิงลึก → `knowledge/software-testing/09-security-testing/`

## 5. Regression

- `npm run ci` ใน service ที่แตะ
- `./scripts/ci/ci-all.sh` ก่อนปิด audit
- OpenAPI diff เมื่อมี API change
- `node scripts/ci/generate-db-schema.mjs` เมื่อเกี่ยวกับ DB

---

## Coverage gap ที่ต้องเพิ่ม

จาก gap analysis 2026-07-09 — รายการนี้ **ไม่เคยถูกตรวจ** โดย checklist เดิม (1–5 ด้านบน)
ต้อง probe เพิ่มก่อนปิด audit ที่แตะ area เสี่ยง

| หมวด | ทำไมสำคัญ | วิธี probe |
|------|-----------|------------|
| **Idempotency** | retry จาก gateway/mesh หรือ client double-click ทำให้เกิด side-effect ซ้ำ (เช่น invite-link ซ้ำ — area เสี่ยงจริงจาก branch-report invite-links) | ยิง request เดิมซ้ำ (มี/ไม่มี idempotency key) เช็คว่าไม่สร้าง record ซ้ำ |
| **Concurrency ที่ repo layer** | race condition ระหว่าง 2 requests read-modify-write ทับกันโดยไม่มี lock/version field | ยิง concurrent PATCH ไปที่ resource เดียวกันพร้อมกัน (`Promise.all`) เช็ค final state ไม่เพี้ยน |
| **Partial failure ข้าม service** | mesh call เช่น staff → auth revoke สำเร็จครึ่งเดียว ทำให้เกิด orphaned state ไม่มี compensating action | จำลอง service ปลายทางล้มเหลว (mock/kill) เช็คว่ามี compensating action หรือ error ที่ปลอดภัย ไม่ปล่อย state ค้าง |
| **Audit/compliance log เนื้อหา** | golden principle #4 เช็คแค่ format (structured, ไม่ใช้ `console.log`) ไม่เช็คเนื้อหา — action สำคัญ (เปลี่ยนสิทธิ์, ลบข้อมูล) ต้องถูกบันทึกจริง | ทำ action แล้วตรวจ log entry มี actor/action/target/timestamp ครบ |
| **ข้อมูลปริมาณ/รูปแบบสมจริง** | fixture สะอาดไม่เจอ bug pagination/sort/unicode ที่เกิดกับข้อมูล production จริง | seed ข้อมูล messy (unicode, null field, legacy schema, ปริมาณมาก) แล้ว rerun integration/API test |
| **Migration/deploy compatibility** | rolling deploy ทำให้ version เก่า/ใหม่รันพร้อมกันชั่วคราว — request ที่ค้างระหว่าง schema เปลี่ยนอาจพัง | ตรวจว่า schema change เป็น backward-compatible อย่างน้อย 1 deploy cycle (additive ก่อน, breaking แยก phase) |

---

## Backend severity

| Severity | ตัวอย่าง |
|----------|----------|
| **Critical** | Data loss, auth bypass, write ใน read-only path, duplicate side-effect จาก idempotency gap ที่กระทบเงิน/สิทธิ์ |
| **High** | Business rule ผิด, wrong status/code, missing validation, partial failure ทิ้ง orphaned state |
| **Medium** | Edge case, pagination off-by-one, race condition ที่ผลกระทบจำกัด |
| **Low** | Message wording, cosmetic response field |

---

## ต้นแบบ test ใน repo

| เอกสาร/ไฟล์ | ใช้เป็นแนว |
|--------------|------------|
| `backend/service/staff/src/tests/integration-test/mesh.guard.test.js` | mesh guard pattern |
| `backend/service/smart-report/src/modules/reports/tests/integration-test/reports.sandbox-adversarial.integration.test.js` | adversarial pattern |
