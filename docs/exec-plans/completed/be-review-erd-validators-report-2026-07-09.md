---
status: completed
created: 2026-07-09
updated: 2026-07-09
completed: 2026-07-09
services: [auth, staff, agent-invoice, smart-report]
---

# BE ERD Validators — Audit report (2026-07-09)

> Part A read-only audit — ยังไม่แก้โค้ด  
> Review packet: [`be-review-erd-validators-2026-07-09.md`](./be-review-erd-validators-2026-07-09.md)  
> Policy: [ADR 005](../../adrs/005-mongodb-collection-validators-policy.md)

## Executive summary

| Metric | Value |
|--------|-------|
| **Overall readiness** | **YELLOW** |
| **P0 gaps** | 2 |
| **P1 gaps** | 4 |
| **P2 gaps** | 3 |

Production write paths (auth `createUser`, agent-fees POST, invoice generate, smart-report scheduler) **align** with validator `required[]`. Main blockers: **staff integration tests** insert `auth_users` without `access_token_gen` (BE-001), and **prod baseline JSON** / live DB validators lag module SoT until re-apply.

---

## Per-service findings

### auth

| ID | Sev | Area | Finding | Evidence | Recommended fix |
|----|-----|------|---------|----------|-----------------|
| AUTH-01 | P0 | Cross-service tests | Staff tests + mock auth server `insertOne` `auth_users` **without** `access_token_gen` — fails when harness validators enforce BE-001 | `staff/src/lib/test-helpers/mock-auth-internal-server.js:144`; `profiles.create.link.test.js:183` (+ 10 files) | Add `access_token_gen: 0` to all test fixtures (Part B) |
| AUTH-02 | P1 | Baseline parity | `verify-harness-schema.sh` baseline step fails: module has `access_token_gen` required; baseline JSON omits it | harness verify 2026-07-09 | Update baseline JSON + re-apply collMod staging/prod (Part B) |
| AUTH-03 | — | Prod path OK | `auth.repository.js` `createUser` sets `access_token_gen: 0` | `auth.repository.js:43` | None |
| AUTH-04 | — | Seeds OK | `init-db.mjs`, `seed-user.mjs`, `seed-example-data.mjs` set `access_token_gen` | auth scripts | None |
| AUTH-05 | — | BE-003 OK | Operational collections skip documented in normative ERD §5 | `docs/specs/backend/auth/database-erd.md:331` | None |

### staff

| ID | Sev | Area | Finding | Evidence | Recommended fix |
|----|-----|------|---------|----------|-----------------|
| STAFF-01 | — | Prod path OK | `profiles.repository.js` create sets all validator required fields incl. audit | `profiles.repository.js:123-140` | None |
| STAFF-02 | P2 | Validator vs ERD | `user_id` in `required[]` but not in `properties` — provisional profile uses `user_id: null` (field present) | `collection-validators.mjs:4-19` | Optional: add `user_id: { bsonType: ["objectId","null"] }` in Part B |
| STAFF-03 | P1 | TD-019 | `spec:consistency` has no validator↔ERD gate (auth only) | `staff/scripts/validate-spec-consistency.mjs` | Copy `checkAuthValidators` pattern (Part B) |
| STAFF-04 | — | ERD doc OK | Normative ERD § Schema validation links module, summary matches | `docs/specs/backend/staff/database-erd.md:141-146` | None |
| STAFF-05 | — | Package ERD OK | Banner + normative link present | `backend/service/staff/docs/database-erd.md:3-4` | None |

### agent-invoice

| ID | Sev | Area | Finding | Evidence | Recommended fix |
|----|-----|------|---------|----------|-----------------|
| INV-01 | P1 | Baseline parity | Baseline JSON `agent_fees` schema missing `agent_fee` in required (BE-002) | harness verify 2026-07-09 | Update baseline + re-apply collMod (Part B) |
| INV-02 | — | Prod path OK | `createFeeByAgentId` spreads payload; OpenAPI requires `agent_fee` | `agent-fees.service.js:46-60`; `agent-fees.schema.js:103` | None |
| INV-03 | — | Invoice generate OK | `generate.service.js` sets `iv_no`, `ou_id`, `branch_id`, `billing_month` | `generate.service.js:153-163` | None |
| INV-04 | — | Transactions OK | `insertMany` sets `ref_iv_id`, `company_id`, `main_category_id` | `generate.service.js:168-178` | None |
| INV-05 | P1 | TD-019 | No validator↔ERD gate in `spec:consistency` | `agent-invoice/scripts/validate-spec-consistency.mjs` | Part B |
| INV-06 | — | ERD doc OK | Normative ERD lists `agent_fee` required, optional fee fields | `docs/specs/backend/agent-invoice/database-erd.md:47` | None |

### smart-report

| ID | Sev | Area | Finding | Evidence | Recommended fix |
|----|-----|------|---------|----------|-----------------|
| SR-01 | — | Reports create OK | `createReport` sets `name`, `script`, `enabled` (+ audit extras allowed) | `reports.service.js:279-302` | None |
| SR-02 | — | download_history OK | `runReport` / scheduler set `reportId`, `startedAt`, `status` | `scheduler.service.js:140-172` | None |
| SR-03 | P1 | TD-019 | No validator↔ERD gate in `spec:consistency` | `smart-report/scripts/validate-spec-consistency.mjs` | Part B |
| SR-04 | — | ERD doc OK | Normative ERD § Schema validation matches module (2 collections) | `docs/specs/backend/smart-report/database-erd.md:43-50` | None |
| SR-05 | P2 | Doc date | Package `docs/db/erd.md` predates validator rollout (2024 header) | `smart-report/docs/db/erd.md` | Optional normative banner (Part B docs) |

---

## Automated check results

| Check | Result | Notes |
|-------|--------|-------|
| `spec:consistency` auth | **pass** | Includes `checkAuthValidators` + BE-001 gate |
| `spec:consistency` staff | **pass** | No validator gate yet (TD-019) |
| `spec:consistency` agent-invoice | **pass** | No validator gate yet |
| `spec:consistency` smart-report | **pass** | No validator gate yet |
| `verify-validators --harness` (registry) | **pass** | 11 collections match registry |
| `verify-validators --baseline --harness` | **fail** | `auth_users`, `agent_fees` schema mismatch vs baseline JSON |
| `verify-harness-schema.sh` | **fail** | Fails at baseline parity step (expected pre BE-001/002 re-apply) |
| prod pre-check BE-001 | **skip** | No prod URI in local env |
| prod pre-check BE-002 | **skip** | No prod URI in local env |

---

## Doc alignment (ERD vs module)

| Service | ERD § links OK | required summary OK | Package ERD banner |
|---------|----------------|---------------------|-------------------|
| auth | yes | yes (incl. `access_token_gen`) | N/A |
| staff | yes | yes | yes |
| agent-invoice | yes | yes (BE-002) | yes |
| smart-report | yes | yes | partial (package erd dated) |

---

## Recommended fix order (Part B)

1. **P0** — AUTH-01: `access_token_gen: 0` in staff test fixtures + mock auth server
2. **P1** — TD-019: validator↔ERD gates in staff / agent-invoice / smart-report `spec:consistency`
3. **P1** — AUTH-02 + INV-01: refresh `prod-schema-baseline-2026-07-09.json` from module SoT; re-apply validators harness → staging → prod
4. **Docs** — BE-003 rationale, sign-off checklist, archive packet after merge
5. **P2** — STAFF-02 optional `user_id` null type; SR-05 package ERD banner

---

## Sign-off readiness

- [ ] Part B: no P0 gaps remaining
- [ ] `verify-harness-schema.sh` pass locally
- [ ] Staging + prod collMod after BE-001/002
- [ ] Baseline JSON committed after prod apply
- [ ] TD-019 closed in tech-debt-tracker

---

## Progress log

- 2026-07-09: Part A audit complete — YELLOW readiness; 2 P0-class issues (test fixtures + baseline/harness parity).
