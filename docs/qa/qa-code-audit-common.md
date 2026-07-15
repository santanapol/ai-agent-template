# คู่มือ QA Code Audit — ส่วนรวม (Common)

> **สถานะ:** คู่มือ (draft) — ยังไม่ได้สร้าง agent skill หรือ slash command
> **จุดประสงค์:** อ่าน [docs/intent/qa-code-audit-skill.md](../intent/qa-code-audit-skill.md)
> **อ่านคู่กับ:** [Backend checklist](./qa-code-audit-backend.md) · [Frontend checklist](./qa-code-audit-frontend.md)
>
> เอกสารนี้แยกออกมาจาก `qa-code-audit-manual.md` (เดิม) เพื่อให้ Backend/Frontend
> implement เป็น **agent skill คนละตัว** ได้ — ส่วนที่ใช้ร่วมกันอยู่ที่นี่
> ส่วนที่เฉพาะชั้นอยู่ในเอกสารแยก

---

## หลักคิดหลัก: Code ไม่ใช่ Source of Truth

การตรวจ QA ตามคู่มือนี้ถือว่า **implementation code เป็นสมมติฐานที่ต้องพิสูจน์** — ไม่ใช่ oracle สุดท้าย

Test ที่ผ่านหมายความว่า "ตรงกับที่ test เขียน" ไม่ได้แปลว่า "ถูกต้องตาม requirement"

### SoT hierarchy (สูง → ต่ำ)

1. `docs/specs/` + OpenAPI contract
2. `docs/golden-principles.md` + `coding-standard/`
3. User intent / `docs/exec-plans/` / `docs/intent/` / UAT scenarios
4. Automated tests ที่มีอยู่ (พิสูจน์ claim — ไม่ใช่ความจริงสุดท้าย)
5. **Implementation code** — เปรียบเทียบกับ 1–3 เท่านั้น

### QA mindset

- **Spec-first** — อ่าน spec ก่อนอ่าน code; code กับ spec ไม่ตรง = defect
- **Negative testing** — ทดสอบสิ่งที่ระบบ *ไม่ควร* ทำ มากกว่าแค่ happy path
- **Cross-layer oracles** — UI ↔ API ↔ DB ต้องสอดคล้องเมื่อเกี่ยวกับ data integrity
- **Checklist ไม่ใช่เพดาน** — checklist (Backend/Frontend) คือ floor ขั้นต่ำ ต้องมี exploratory session (Phase F ด้านล่าง) เพื่อหา bug นอกกรอบด้วย

---

## Test pyramid (ภาพรวม)

```
                    E2E (Playwright / browser MCP)
                 API / SIT (Bruno, smoke.sh, curl)
              Integration (fastify.inject, DB, mesh)
           Unit (node:test backend, Vitest frontend)
```

ทดสอบที่ **ชั้นต่ำสุดที่เปิด defect ได้** — แต่ยังรันชั้นสูงสำหรับ user-visible flows

---

## Workflow (7 ขั้น)

1. **Load SoT** — specs, OpenAPI, golden principles (ไม่ใช่ implementation)
2. **Map surface** — routes, handlers, UI pages, API clients, test files
3. **Static drift scan** — spec ↔ code ↔ tests (ยังไม่รัน)
4. **Run automated gates** — `ci-all`, `smoke`, `npm run ci` ต่อ package
5. **Layer audit** — [Backend checklist](./qa-code-audit-backend.md) หรือ [Frontend checklist](./qa-code-audit-frontend.md) ตาม scope
6. **Bug hunt / adversarial + exploratory** — playbook ด้านล่าง (Phase A–F)
7. **Report** — ใช้ template ด้านล่าง; handoff Prove-It test ไป dev เมื่อจำเป็น

### คำสั่ง harness มาตรฐาน

```bash
# Full platform
./scripts/ci/ci-all.sh
./scripts/ci/ci-all.sh --skip-install

# Per package
cd backend/service/<service> && npm run ci

# Harness + smoke
./scripts/dev/dev-up.sh
./scripts/dev/smoke.sh
./scripts/dev/dev-up.sh --with-frontend   # รวม frontend
./scripts/dev/dev-down.sh
```

### Zero-platform invariants (ต้อง probe เสมอ — ทั้ง Backend และ Frontend)

จาก `docs/golden-principles.md`:

- Internal APIs **reject** ถ้าไม่มี `x-gateway-secret` ที่ถูกต้อง
- Internal APIs **ไม่** verify JWT — gateway เท่านั้น
- Gateway **ไม่** forward `Authorization` ไป internal
- Client `x-user-*` **ถูก strip/overwrite** ที่ gateway
- Response envelope ตรง `coding-standard/*/6-api-response-codes.md`
- `spec:consistency` ใน CI จำเป็นแต่ไม่เพียงพอ — ต้อง manual probe edge cases

ต้นแบบ test: `staff/.../mesh.guard.test.js`, `smart-report/.../sandbox-adversarial.integration.test.js`

---

## Bug hunt playbook (ส่วนรวม)

### Phase A — Triage & SoT load

1. อ่าน `docs/specs/<service>/` + OpenAPI
2. อ่าน `docs/exec-plans/active/` — งานค้างอาจอธิบาย gap
3. ระบุ oracles ที่ใช้ตัดสิน pass/fail

### Phase B — Static suspicion (ไม่รัน code)

- Code กับ spec ขัดกันไหม
- Test ครอบแค่ happy path ไหม
- มี `TODO` / bypass validation ไหม
- Frontend เรียก endpoint ที่ spec ไม่มี หรือส่ง field นอก schema

### Phase C — Dynamic probe

```bash
./scripts/dev/dev-up.sh
./scripts/dev/smoke.sh
npm run ci    # ในservice ที่เกี่ยวข้อง
# Bruno: backend/_bruno
./scripts/dev/dev-down.sh
```

### Phase D — Adversarial matrix (cross-cutting)

รายการนี้เป็น **จุดร่วม** ที่ต้อง probe ทั้งสองชั้น — รายการที่เฉพาะชั้นอยู่ใน
"Coverage gap" ของ [Backend](./qa-code-audit-backend.md#coverage-gap-ที่ต้องเพิ่ม) และ
[Frontend](./qa-code-audit-frontend.md#coverage-gap-ที่ต้องเพิ่ม)

| หมวด | ตัวอย่าง probe |
|------|----------------|
| AuthZ | user A → resource ของ B |
| Input | empty body, oversized, unicode, injection strings |
| State | double submit, concurrent PATCH, delete ที่ถูก reference |
| Time | expired token, date boundary |
| Mesh | ยิง internal โดยตรงไม่ผ่าน gateway |
| UI | กดซ้ำเร็ว, back หลัง save, tab stale |

### Phase E — Prove & document

ทุก finding ต้องมี: **Expected** (spec), **Actual**, **Repro**, **Severity**, **Suggested guard test**

### Phase F — Exploratory session (ใหม่ — 2026-07-09)

**ทำไมต้องมี:** checklist ที่ตายตัวสอนให้มองเห็นแค่ bug ประเภทที่รู้จักอยู่แล้ว
(checklist blindness) — ต้องมีช่วงที่ตั้งใจ explore นอกกรอบด้วย

1. **Time-box** — 30–60 นาทีต่อ session, session-based test management (SBTM) style
2. **Charter** — ตั้งเป้าสั้น ๆ ก่อนเริ่ม เช่น "explore branch-switching + invite-link ร่วมกันหา edge case ที่ matrix ไม่ครอบ"
3. **ข้อมูลจริง/สมจริง** — ใช้ data ที่มี shape ใกล้ production (unicode, null field, ปริมาณมาก) ไม่ใช่ fixture สะอาด
4. **บันทึกทุกอย่างที่แปลกใจ** แม้ยังไม่แน่ใจว่าเป็น bug — ใส่ใน report เป็น "Observation" แยกจาก "Finding" ที่ยืนยันแล้ว
5. **Verify-after-fix** — finding ที่ dev แก้แล้วต้องปิด loop: rerun repro step เดิม + guard test ต้องผ่านก่อนปิด severity

---

## Report template

```markdown
# QA Audit Report — [scope]

**Date:** YYYY-MM-DD
**Auditor:** [name/agent]
**Layer:** Backend | Frontend | Cross-layer
**SoT used:** [spec paths, OpenAPI, intent docs]

## Scope

- Services / screens: ...
- Assumption: code may be wrong; verified against SoT above

## Coverage map

| Layer | Backend | Frontend | Gap |
|-------|---------|----------|-----|
| Unit | ✓/✗ | ✓/✗ | ... |
| Integration | ... | ... | ... |
| API/SIT | ... | N/A | ... |
| E2E | N/A | ... | ... |
| Adversarial | ... | ... | ... |
| Exploratory (Phase F) | ... | ... | ... |

## Findings

### [SEV-1] Title

- **Expected (spec):** ...
- **Actual:** ...
- **Repro:** ...
- **Severity:** Critical | High | Medium | Low
- **Suggested guard test:** ...
- **Verified after fix:** ✓/✗ (Phase F rule — ปิดได้เมื่อ rerun repro ผ่านเท่านั้น)

## Observations (ยังไม่ยืนยันเป็น defect)

- ...

## Spec ↔ Code drift

| Requirement | Spec says | Code does | Test covers? |
|-------------|-----------|-----------|--------------|

## Automated gates

| Gate | Result |
|------|--------|
| ci-all | pass/fail |
| smoke | pass/fail |
| npm run ci (packages) | ... |

## Recommended next steps

1. Prove-It tests for critical findings → `/test` or test-engineer
2. Security findings → security-auditor
3. ...
```

---

## ความสัมพันธ์กับ skill / workflow อื่น (ปัจจุบัน)

| ของที่มี | บทบาท | ต่างจากคู่มือนี้อย่างไร |
|----------|--------|-------------------------|
| `/test` + TDD | เขียน code ให้ test ผ่าน | คู่มือนี้ **หา** defect ไม่แก้ |
| `test-engineer` subagent | ออกแบบ/เขียน test suite | ใช้หลัง audit เมื่อต้องการ guard test |
| `browser-testing-with-devtools` | runtime UI/network | ชั้น browser audit (frontend) |
| `fixing-accessibility` | a11y audit/fix เฉพาะทาง | frontend checklist ชี้ไปใช้ตรงนี้เมื่อเจอ a11y gap |
| `debugging-and-error-recovery` | root cause หลังรู้ bug | หลัง finding ยืนยันแล้ว |
| `code-review-and-quality` | PR review หลายแกน | คู่มือนี้เน้น behavior vs spec + adversarial |
| `knowledge/software-testing/` | ทฤษฎี testing 00–12 | คู่มือนี้เป็น workflow ปฏิบัติสำหรับ zero-platform |

### ต้นแบบ audit ใน repo

| เอกสาร | ใช้เป็นแนว |
|--------|------------|
| `docs/intent/backoffice-feature-parity-audit.md` | parity + CRUD + DB verify |
| `frontend/backoffice-next/docs/NETWORK-VERIFY-CHECKLIST.md` | duplicate API, payload threshold |
| `docs/audit/prod-repo-drift-*.md` | schema/repo drift |
| `docs/ops/prod-schema-handoff-*.md` | ops handoff pattern |

---

## ขั้นตอนถัดไป (ยังไม่ทำ)

เมื่อพร้อมจะยกเป็น agent skill — **แยก 2 skill** (backend / frontend) ที่ต่างอ้างเอกสารนี้ร่วมกัน:

1. สร้าง `scripts/agent/local-skills/qa-code-audit-backend/` จาก [qa-code-audit-backend.md](./qa-code-audit-backend.md) + เอกสารนี้
2. สร้าง `scripts/agent/local-skills/qa-code-audit-frontend/` จาก [qa-code-audit-frontend.md](./qa-code-audit-frontend.md) + เอกสารนี้
3. รัน `./scripts/agent/sync-local-agent-skills.sh`
4. (Optional) slash command `/qa-backend`, `/qa-frontend` ใน `scripts/agent/local-commands/`
5. (Optional) รวมใน `/ship` fan-out คู่ `test-engineer`
