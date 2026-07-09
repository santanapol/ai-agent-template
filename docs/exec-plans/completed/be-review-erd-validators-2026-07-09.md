---
status: completed
created: 2026-07-09
updated: 2026-07-09
completed: 2026-07-09
services: [auth, staff, agent-invoice, smart-report]
---

# BE review packet — ERD + collection validators (2026-07-09)

> ส่งต่อ Backend รีวิว schema validation rollout — prod / staging / harness **done**  
> Rollout status: [`collection-validators-handoff-2026-07-09.md`](../../ops/collection-validators-handoff-2026-07-09.md)  
> Policy: [ADR 005](../../adrs/005-mongodb-collection-validators-policy.md)  
> **Audit report (Part A):** [`be-review-erd-validators-report-2026-07-09.md`](./be-review-erd-validators-report-2026-07-09.md)

## SoT hierarchy (รีวิวตามลำดับนี้)

1. **`backend/*/scripts/collection-validators.mjs`** — `$jsonSchema` canonical
2. **`docs/specs/backend/*/database-erd.md`** — § Schema validation (ลิงก์ module, ไม่ paste JSON เต็ม)
3. **`backend/*/scripts/init-db.mjs`** — apply indexes + validators (`validationLevel: moderate`)
4. **`docs/audit/prod-schema-baseline-2026-07-09.json`** — prod baseline รวม validators

---

## Services ที่มี validator (11 collections)

### auth

| ชนิด | Path |
|------|------|
| ERD (normative) | [`docs/specs/backend/auth/database-erd.md`](../../specs/backend/auth/database-erd.md) |
| Validator SoT | [`backend/auth/scripts/collection-validators.mjs`](../../../backend/auth/scripts/collection-validators.mjs) |
| init-db | [`backend/auth/scripts/init-db.mjs`](../../../backend/auth/scripts/init-db.mjs) |

**DB:** `zero-platform` (prod/staging) · `zero-platform_0` (harness)  
**Collections:** `auth_users`, `platform_branches`, `auth_menus`, `auth_role_permissions`

---

### staff

| ชนิด | Path |
|------|------|
| ERD (normative) | [`docs/specs/backend/staff/database-erd.md`](../../specs/backend/staff/database-erd.md) |
| ERD (package copy) | [`backend/service/staff/docs/database-erd.md`](../../../backend/service/staff/docs/database-erd.md) |
| Validator SoT | [`backend/service/staff/scripts/collection-validators.mjs`](../../../backend/service/staff/scripts/collection-validators.mjs) |
| init-db | [`backend/service/staff/scripts/init-db.mjs`](../../../backend/service/staff/scripts/init-db.mjs) |

**DB:** `zero-platform` (แชร์กับ auth)  
**Collections:** `staff_profiles`

---

### agent-invoice

| ชนิด | Path |
|------|------|
| ERD (normative) | [`docs/specs/backend/agent-invoice/database-erd.md`](../../specs/backend/agent-invoice/database-erd.md) |
| ERD (package legacy) | [`backend/service/agent-invoice/docs/database/erd.md`](../../../backend/service/agent-invoice/docs/database/erd.md) — banner ชี้ normative |
| Validator SoT | [`backend/service/agent-invoice/scripts/collection-validators.mjs`](../../../backend/service/agent-invoice/scripts/collection-validators.mjs) |
| init-db | [`backend/service/agent-invoice/scripts/init-db.mjs`](../../../backend/service/agent-invoice/scripts/init-db.mjs) |

**DB:** `zero-agent-invoice` · harness: `zero-agent-invoice_0`  
**Collections:** `agents`, `agent_fees`, `agent_iv`, `agent_iv_transaction`

---

### smart-report

| ชนิด | Path |
|------|------|
| ERD (normative) | [`docs/specs/backend/smart-report/database-erd.md`](../../specs/backend/smart-report/database-erd.md) |
| Validator SoT | [`backend/service/smart-report/scripts/collection-validators.mjs`](../../../backend/service/smart-report/scripts/collection-validators.mjs) |
| init-db | [`backend/service/smart-report/scripts/init-db.mjs`](../../../backend/service/smart-report/scripts/init-db.mjs) |

**DB:** `zero-smart-report` · harness: `zero-smart-report_0`  
**Collections:** `reports`, `download_history`

---

## Shared / ops scripts

| Path | หน้าที่ |
|------|--------|
| [`scripts/ops/collection-validator-registry.mjs`](../../../scripts/ops/collection-validator-registry.mjs) | รวม module ทุก service (`zero-platform` = auth + staff) |
| [`scripts/ops/apply-collection-validator-lib.mjs`](../../../scripts/ops/apply-collection-validator-lib.mjs) | helper `collMod` / `createCollection` |
| [`scripts/ops/apply-collection-validators.mjs`](../../../scripts/ops/apply-collection-validators.mjs) | apply batch (`--staging`, `--prod-all`, `MONGODB_ADMIN_URI`) |
| [`scripts/ops/schema-verify-targets.mjs`](../../../scripts/ops/schema-verify-targets.mjs) | Shared env targets (harness/staging/prod) |
| [`scripts/ops/verify-validators.mjs`](../../../scripts/ops/verify-validators.mjs) | verify registry + prod baseline (`--harness`, `--staging`, `--baseline`) |
| [`scripts/dev/verify-harness-schema.sh`](../../../scripts/dev/verify-harness-schema.sh) | Harness gate after seed |
| [`scripts/staging/verify-staging-schema.sh`](../../../scripts/staging/verify-staging-schema.sh) | Staging gate after seed |

---

## ไม่มี validator

| Service | ERD | เหตุผล |
|---------|-----|--------|
| gateway | [`docs/specs/backend/gateway/database-erd.md`](../../specs/backend/gateway/database-erd.md) | ไม่มี persistence |
| branch-report | [`docs/specs/backend/branch-report/database-erd.md`](../../specs/backend/branch-report/database-erd.md) | read-only `gpp_777ww` |
| demo-service | — | dev only, out of scope |

**Skip ใน `zero-platform` (ADR 005):** `auth_refresh_tokens`, `auth_credential_throttle`, `auth_audit_events` — operational collections

---

## คำสั่ง verify (BE ลองเอง)

```bash
# harness — all-in-one gate
./scripts/dev/verify-harness-schema.sh

# หรือแยก
node scripts/ops/verify-validators.mjs --harness
node scripts/ops/verify-validators.mjs --baseline=docs/audit/prod-schema-baseline-2026-07-09.json --harness
node scripts/ops/verify-indexes.mjs --baseline docs/audit/prod-schema-baseline-2026-07-09.json --harness

# prod (read-only)
node scripts/ops/verify-validators.mjs --env-file=backend/auth/.env.prod --db=zero-platform
node scripts/ops/verify-validators.mjs --env-file=backend/service/agent-invoice/.env.prod --db=zero-agent-invoice
node scripts/ops/verify-validators.mjs --env-file=backend/service/smart-report/.env.prod --db=zero-smart-report
```

Apply local (ผ่าน init-db — idempotent):

```bash
node --env-file=backend/auth/.env.harness backend/auth/scripts/init-db.mjs
node --env-file=backend/service/staff/.env.harness backend/service/staff/scripts/init-db.mjs
node --env-file=backend/service/agent-invoice/.env.harness backend/service/agent-invoice/scripts/init-db.mjs
node --env-file=backend/service/smart-report/.env.harness backend/service/smart-report/scripts/init-db.mjs
```

---

## สถานะ rollout (2026-07-09)

| Environment | Status |
|-------------|--------|
| Prod | **done** — `verify-validators` ผ่าน 11 collections |
| Staging | **done** |
| Harness / local | **done** — `init-db` + `verify-harness-schema.sh` gate |

Prod baseline (validators in JSON): [`docs/audit/prod-schema-baseline-2026-07-09.json`](../../audit/prod-schema-baseline-2026-07-09.json)

---

## Open decisions (resolved 2026-07-09)

| ID | Decision | Rationale |
|----|----------|-----------|
| BE-001 | **`access_token_gen` → required** in `auth_users` validator | O-16 security path; ERD normative Yes; init-db backfill + all create paths set `0` |
| BE-002 | **`agent_fee` → required** only; `gcomp_cost` / `agent_known_fee` optional | Billing uses `agent_fee`; API POST requires known_fee + agent_fee; `gcomp_cost` optional at API |
| BE-003 | **Confirm skip** 3 operational auth collections | ADR 005 — no validator without fake tenant/audit; change needs new ADR |

Module updates: [`auth/collection-validators.mjs`](../../../backend/auth/scripts/collection-validators.mjs), [`agent-invoice/collection-validators.mjs`](../../../backend/service/agent-invoice/scripts/collection-validators.mjs). Re-apply prod/staging via [`apply-collection-validators.mjs`](../../../scripts/ops/apply-collection-validators.mjs) after merge.

**BE-003 rationale:** `auth_refresh_tokens`, `auth_credential_throttle`, `auth_audit_events` เป็น operational collections — session/TTL/rate-limit/event-log ไม่มี business tenant (`ou_id`) หรือ audit แบบ domain entity; บังคับ `$jsonSchema` จะ block auth flows หรือต้องใส่ค่าปลอม. เปลี่ยนใจต้อง ADR ใหม่ (ADR 005).

---

## Findings summary (Part A audit 2026-07-09)

Overall **YELLOW** — ดูรายละเอียดใน [audit report](./be-review-erd-validators-report-2026-07-09.md).

| ID | Sev | Summary |
|----|-----|---------|
| AUTH-01 | P0 | Staff tests insert `auth_users` without `access_token_gen` |
| AUTH-02 | P1 | Baseline JSON / harness parity ล้าหลัง BE-001 |
| INV-01 | P1 | Baseline JSON ล้าหลัง BE-002 (`agent_fee`) |
| STAFF-03 / INV-05 / SR-03 | P1 | TD-019 validator gates ยังไม่มีใน 3 services |

Prod write paths (auth create, agent-fees POST, invoice generate, smart-report scheduler) **ตรง ERD**.

---

## Implementation vs ERD

- [x] auth — prod paths + seeds OK; test fixtures ต้อง fix (AUTH-01)
- [x] staff — `profiles.repository` OK; cross-service test inserts ต้อง fix
- [x] agent-invoice — 4 collections prod paths OK
- [x] smart-report — reports + download_history insert OK

---

## Sign-off checklist

- [x] BE-001 – BE-003 ตอบแล้ว (2026-07-09)
- [x] Module `required` / `properties` ตรง BE-001/002 decisions
- [x] ERD § Schema validation ลิงก์ module ถูกต้อง — ไม่ duplicate JSON
- [x] `./scripts/dev/verify-harness-schema.sh` pass บนเครื่อง BE (2026-07-09)
- [x] `validationLevel: moderate` เพียงพอสำหรับ prod — insert/update only per ADR 005
- [x] BE-003 operational skip ยืนยันตาม ADR 005
- [x] Integration tests pass under harness validators (staff fixtures fixed AUTH-01)
- [x] TD-019 spec:consistency validator gates (4 services)

---

## ลำดับรีวิวแนะนำ

1. อ่าน ADR 005 + SoT hierarchy ด้านบน
2. เปิด `collection-validators.mjs` ต่อ service ที่รับผิดชอบ
3. เทียบกับ normative ERD § Schema validation
4. รัน `verify-harness-schema.sh` local
5. ตอบ open decisions BE-001–003 — **done 2026-07-09** (see § Open decisions resolved)

---

## Progress log

- 2026-07-09: BE-001/002/003 decided — `access_token_gen` + `agent_fee` required in modules; operational skip confirmed (ADR 005).
- 2026-07-09: Part A audit report published — YELLOW readiness; see [report](./be-review-erd-validators-report-2026-07-09.md).

## จุดที่ BE ควรรีวิว (รายละเอียด)

- [x] `$jsonSchema` `required` / `properties` ตรง business rules แต่ละ service (Part A audit)
- [x] `validationLevel: moderate` เพียงพอ (insert/update only)
- [ ] `agent_fees` audit fields หลัง backfill prod (TD-018 orphan track)
- [x] Package ERD (`staff`, `agent-invoice`) ชี้ normative ชัด
