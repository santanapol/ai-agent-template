# Intent: QA Code Audit Skill (Backend + Frontend แยกกัน)

**Status:** Draft — **มีเฉพาะคู่มือ** ยังไม่สร้าง agent skill หรือ slash command

**คู่มือ:** [Common](../qa/qa-code-audit-common.md) · [Backend](../qa/qa-code-audit-backend.md) · [Frontend](../qa/qa-code-audit-frontend.md)

---

## จุดประสงค์

สร้าง **workflow สำหรับ agent/QA** ที่ใช้ตรวจโค้ดและพฤติกรรมระบบแบบ **bug hunt** — โดยถือว่า **implementation code ไม่ใช่ Source of Truth (SoT)**

เป้าหมายไม่ใช่เขียน test ให้ผ่าน (นั่นคือ `/test` + TDD) แต่คือ:

1. **ค้นหาความไม่สอดคล้อง** ระหว่าง spec/contract กับสิ่งที่ code และ test จริงทำ
2. **ตรวจหลายชั้น** — unit → integration → API/SIT → E2E แยก Backend และ Frontend
3. **ทดสอบเชิงลบ (adversarial)** — สิ่งที่ระบบ *ไม่ควร* ทำ มากกว่าแค่ happy path
4. **ยืนยันข้ามชั้น (cross-layer oracles)** — UI ↔ API ↔ DB ต้องสอดคล้องกันเมื่อเกี่ยวข้อง
5. **รายงาน findings** ในรูปแบบมาตรฐาน พร้อม repro และ severity สำหรับ handoff ไป dev

## ทำไมแยกเป็น 2 skill (2026-07-09)

Backend และ Frontend มี tooling, checklist, และ bug class ที่ต่างกันพอที่รวมเป็น skill
เดียวแล้ว agent จะต้อง load context ที่ไม่เกี่ยวข้องเสมอ (เช่น audit backend ไม่ต้องรู้
เรื่อง Playwright/component test) — จึงแยกเป็น:

- **`qa-code-audit-backend`** — unit/integration/API-SIT/adversarial ฝั่ง backend
- **`qa-code-audit-frontend`** — unit/component/API-client/E2E/browser audit ฝั่ง frontend

ทั้งสองอ้าง [qa-code-audit-common.md](../qa/qa-code-audit-common.md) ร่วมกัน (SoT hierarchy,
workflow 7 ขั้น, bug-hunt playbook, report template) เพื่อไม่ให้เนื้อหา drift ระหว่าง 2 skill

## ปัญหาที่ skill นี้จะแก้ (เมื่อ implement)

| ปัญหา | วิธีที่ skill จะช่วย |
|--------|----------------------|
| Test ผ่านแต่ behavior ผิด spec | โหลด `docs/specs/` + OpenAPI ก่อนอ่าน code |
| Dev เขียน test ตาม implementation ไม่ใช่ requirement | Oracle มาจาก spec / golden principles ไม่ใช่จาก function body |
| Integration gap ระหว่าง service | ใช้ smoke, Bruno, mesh guard patterns |
| Frontend แสดงผลถูกแต่ API/DB ผิด | UI round-trip + DB direct verify |
| ไม่มี workflow audit รวมศูนย์ | Checklist แยก BE/FE + bug-hunt playbook + report template |
| **(ใหม่) Backend: idempotency/concurrency/partial-failure ข้าม service ไม่เคยถูกตรวจ** | Coverage gap section ใน [backend checklist](../qa/qa-code-audit-backend.md#coverage-gap-ที่ต้องเพิ่ม) |
| **(ใหม่) Frontend: a11y/i18n/multi-tab/permission-UI ไม่เคยถูกตรวจ** | Coverage gap section ใน [frontend checklist](../qa/qa-code-audit-frontend.md#coverage-gap-ที่ต้องเพิ่ม) |
| **(ใหม่) Static checklist มองไม่เห็น bug นอกกรอบ** | Phase F exploratory session ใน [common playbook](../qa/qa-code-audit-common.md#phase-f--exploratory-session-ใหม่--2026-07-09) |

## SoT hierarchy (สูง → ต่ำ)

รายละเอียดเต็มอยู่ใน [qa-code-audit-common.md](../qa/qa-code-audit-common.md) — สรุปสั้น:

1. `docs/specs/` + OpenAPI contract
2. `docs/golden-principles.md` + `coding-standard/`
3. User intent / `docs/exec-plans/` / UAT scenarios
4. Automated tests ที่มีอยู่ (พิสูจน์ claim — ไม่ใช่ความจริงสุดท้าย)
5. **Implementation code** — สมมติฐานที่ต้องพิสูจน์ ไม่ใช่อ้างอิง

## ขอบเขต (scope)

**ครอบคลุม:**

- **Backend** (`qa-code-audit-backend`): unit (`node --test`), integration (`fastify.inject`),
  API/SIT (Bruno, smoke), adversarial, idempotency/concurrency/partial-failure probes
- **Frontend** (`qa-code-audit-frontend`): unit/component (Vitest + RTL), API client layer,
  E2E (Playwright), browser audit, a11y/i18n/multi-tab/permission-UI probes
- **Cross-cutting** (common doc): smoke, regression (`ci-all`), mesh/authZ probes, parity
  audit pattern, exploratory session (Phase F)

**ไม่ครอบคลุม (ใช้ skill อื่น):**

- เขียน/fix code หรือ TDD cycle → `/test`, `test-driven-development`
- Security audit เชิงลึก → `security-auditor`
- Accessibility fix เชิงลึก (มีแค่ probe ผิวใน frontend checklist) → `fixing-accessibility`
- PR review ทั่วไป → `code-review-and-quality`
- Release handoff → `release-notes-and-handoff`

## ที่เก็บเอกสาร (ปัจจุบัน)

| ไฟล์ | บทบาท |
|------|--------|
| `docs/intent/qa-code-audit-skill.md` | เอกสารนี้ — จุดประสงค์และขอบเขต (ทั้ง 2 skill) |
| `docs/qa/qa-code-audit-common.md` | ส่วนรวม — SoT, workflow, bug-hunt playbook, report template |
| `docs/qa/qa-code-audit-backend.md` | Checklist + coverage gap เฉพาะ backend |
| `docs/qa/qa-code-audit-frontend.md` | Checklist + coverage gap เฉพาะ frontend |

## ที่วางแผนไว้ (ยังไม่สร้าง)

| ไฟล์ | บทบาท |
|------|--------|
| `scripts/agent/local-skills/qa-code-audit-backend/SKILL.md` | Workflow หลักสำหรับ agent — backend |
| `scripts/agent/local-skills/qa-code-audit-frontend/SKILL.md` | Workflow หลักสำหรับ agent — frontend |
| `scripts/agent/local-commands/qa-backend.md` | (Optional) slash command `/qa-backend` |
| `scripts/agent/local-commands/qa-frontend.md` | (Optional) slash command `/qa-frontend` |

## ความสัมพันธ์กับของที่มีอยู่

- **ทฤษฎี testing:** `coding-standard/software-testing/` (00–12)
- **ต้นแบบ adversarial:** `backend/service/smart-report/.../reports.sandbox-adversarial.integration.test.js`
- **ต้นแบบ mesh guard:** `backend/service/staff/src/tests/integration-test/mesh.guard.test.js`
- **ต้นแบบ parity audit:** `docs/intent/backoffice-feature-parity-audit.md`
- **ต้นแบบ network verify:** `frontend/backoffice-next/docs/NETWORK-VERIFY-CHECKLIST.md`
- **a11y เฉพาะทาง:** `fixing-accessibility` skill
- **Harness:** `./scripts/dev/dev-up.sh`, `./scripts/dev/smoke.sh`, `./scripts/ci/ci-all.sh`

## Success criteria (เมื่อ skill พร้อมใช้งานเต็มรูปแบบ)

- [ ] Agent อ่าน SKILL.md (backend หรือ frontend) แล้วทำ audit ตาม workflow ได้โดยไม่ improvise
- [ ] ทั้ง 2 skill อ้าง common doc ร่วมกัน — ไม่ duplicate SoT hierarchy/report template
- [ ] รายงานทุกครั้งใช้ report template เดียวกัน (มี field `Layer: Backend | Frontend`)
- [ ] Critical findings มี repro + expected (จาก spec) + actual + verified-after-fix
- [ ] Coverage gap ที่เพิ่มใหม่ (idempotency/concurrency/partial-failure ฝั่ง BE, a11y/i18n/multi-tab ฝั่ง FE) ถูก probe จริงใน audit อย่างน้อย 1 รอบก่อนปิด draft
- [ ] (Optional) slash command `/qa-backend`, `/qa-frontend`
- [ ] (Optional) เรียกจาก `/ship` fan-out คู่ `test-engineer`

## ผู้ใช้หลัก

ทีม QA, SDET, และ agent ที่ได้รับมอบหมายให้ audit ก่อน release, parity check, หรือ bug hunt หลัง deploy
