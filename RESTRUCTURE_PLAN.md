# Plan: Repository restructure

> **Status:** parked — รอ งานค้างอื่นเสร็จก่อน แล้วค่อยเริ่ม Phase 0
> **Created:** 2026-07-08 · จาก session สำรวจโครงสร้าง repo ทั้งหมด
> เมื่อเริ่มลงมือจริง ย้ายไฟล์นี้ไป `docs/exec-plans/active/` พร้อมเติม front matter ตาม [exec-plans/README.md](docs/exec-plans/README.md)

## บริบท (สิ่งที่พบจากการสำรวจ 2026-07-08)

โครงสร้าง zone โดยรวมดีอยู่แล้ว ปัญหาหลักคือ**เศษค้างจาก backoffice-next migration** และ**ของวางผิดที่**:

1. `coding-standard/frontend/backoffice/reference/studio-admin` — clone เต็มของ template upstream **2.4GB** (node_modules 716MB + `.next` 1.7GB) ยัง untracked; **ยังต้องใช้เป็น design reference** — เก็บ source ไว้ แต่ต้องไม่ให้เข้า git และตัดส่วน build ทิ้งได้
2. งาน migration **ยังไม่มี commit เลย**: `frontend/backoffice-next` (~324 ไฟล์ untracked) + 19 ไฟล์ modified (scripts/CI/PM2) + exec-plan + DEPRECATED.md
3. เศษ template ใน `backoffice-next`: `repo.md`, `CONTRIBUTING.md`, `media/`, README/AGENTS.md ของ upstream
4. `scripts/` 27 รายการปน 5 หน้าที่ (dev harness / staging ops / CI-docs tooling / release / agent-skills)
5. root มี `DEPLOY_DIGITALOCEAN.md` ปน; RUNBOOK มี 4 ชั้นทับซ้อนบางส่วน
6. "plans" กระจาย 3 ที่: `docs/exec-plans/` (ดี, docs-lint บังคับ) · `docs/specs/backend/<service>/plans/` (ข้างในเป็น `confidence-map.md` = audit artifact ไม่ใช่ plan) · `docs/specs/backend/plans/` (ว่าง, ผิดชั้น)
7. legacy `frontend/backoffice` deprecated แล้วแต่ยังกิน 643MB บนดิสก์ (node_modules)
8. `harness-engineering/openai-com-index-harness-engineering.md` เป็น scraped reference ไม่ใช่ philosophy doc

หมายเหตุ: `server-environment/**/credential.md` ถูก gitignore แล้ว ✓

**อัปเดต 2026-07-08 (หลังบันทึกแผนนี้):** เพิ่ม Claude Code support เข้า `sync-agent-skills.sh` — ตอนนี้ script สร้าง `.claude/` (skills/agents/commands, คู่ขนานกับ `.cursor/`) และ root `CLAUDE.md` (generated, auto-load ทุก session — เทียบเท่า `.cursor/rules/agent-skills.mdc`) ผลกระทบต่อแผนนี้:
- Phase 2 (จัด `scripts/`) ต้องระวังเพิ่ม — ดู sub-note ใน Phase 2
- Phase 3 บรรทัด "root เหลือ..." ต้องรวม `CLAUDE.md` ด้วย (เป็นไฟล์ตั้งใจ ไม่ใช่ของค้าง)
- Zone table "Agent tooling" ใน README.md/AGENTS.md ได้อัปเดตให้รวม `.claude/` แล้ว (ทำนอกแผนนี้ ระหว่าง session เดียวกัน) — ไม่ต้องทำซ้ำใน Phase 3

**อัปเดต 2026-07-08 (รอบสอง — คำสั่งชัดเจน "ลบ backoffice เดิมได้เลย, ใช้ชื่อ backoffice-next ไปก่อน"):** ทำ Phase 4 บางส่วนไปแล้วนอกลำดับเดิม (ไม่รอ staging UAT) เพราะ user สั่งลบ legacy ตรง ๆ:
- ลบ `frontend/backoffice` ทั้งก้อนแล้ว (304 ไฟล์ tracked, ไม่มีงานค้างข้างใน) — Phase 4 บรรทัดแรกเสร็จแล้ว
- **ตัดสินใจ: ไม่ rename `backoffice-next` → `backoffice`** — ใช้ชื่อ `backoffice-next` ต่อไปตามที่ user สั่งชัดเจน (ย้าย Phase 4 บรรทัดที่สองไปอยู่ใน "ตัดสินใจแล้ว — ไม่ทำ" แทน)
- แก้ README/AGENTS/RUNBOOK/backend docs/.github/workflows/ci-check.yml/coding-standard App paths ให้ตรง `backoffice-next` แล้ว (Phase 3 บรรทัด "อัปเดต README/AGENTS.md" เสร็จแล้ว)
- เปิด `docs/specs/frontend/backoffice-next/` แล้ว (Phase 3 บรรทัด "เปิด docs/specs/frontend/" เสร็จแล้ว)
- **`docs/exec-plans/active/backoffice-next-migration.md` ยังไม่ย้ายไป `completed/`** — เหลือ 2 gate ที่เป็น human action จริง (staging nginx applied on server, manual UAT) ยังปิดไม่ได้จนกว่าจะมีคนยืนยัน — ห้าม mark เสร็จเองแทนคน

## Phase 0 — เซฟงานค้าง (ทำก่อนขยับอะไรทั้งนั้น)

- [ ] เพิ่ม `.next/` และ `coding-standard/**/reference/` ลง root `.gitignore`
- [ ] Commit งาน migration: source `backoffice-next` + 19 ไฟล์ modified + `docs/exec-plans/active/backoffice-next-migration.md` + `frontend/backoffice/DEPRECATED.md` — **ยกเว้น** `reference/studio-admin`

## Phase 1 — ตัดไขมัน (คืนดิสก์ ~3GB+)

- [ ] **เก็บ `studio-admin` ไว้เป็น design reference** (ตัดสินใจ 2026-07-08) แต่ slim ลง: ลบเฉพาะ `node_modules/` (716MB) + `.next/` (1.7GB) ซึ่ง rebuild ได้ — เหลือ source ไม่กี่ MB; คง gitignore ไว้ (local-only, ไม่ commit เข้า repo) — เลิกใช้เมื่อไหร่ค่อยลบทั้งก้อน
- [ ] บันทึก provenance ใน `coding-standard/frontend/backoffice/README.md` (ไฟล์ tracked ที่ลิงก์ไป `reference/studio-admin/` อยู่แล้ว บรรทัด 10): ระบุว่า dir นี้ **local-only (gitignored)** + upstream URL + v2.2.0 + คำสั่ง re-clone สำหรับเครื่องใหม่ — กันลิงก์เสียสำหรับคนที่ clone repo ใหม่
- [ ] ลบเศษ template ใน `backoffice-next`: `repo.md`, `CONTRIBUTING.md`, `media/`; เขียน README ของโปรเจกต์เอง (**เก็บ `LICENSE`** — derive จาก MIT upstream)
- [x] ลบ `frontend/backoffice/node_modules` บนเครื่อง — เป็นส่วนหนึ่งของการลบทั้งโฟลเดอร์ (ดูอัปเดตรอบสองด้านบน)

## Phase 2 — จัด `scripts/` เป็นหมวด

```
scripts/
├── dev/        dev-up, dev-down, dev-lib, dev-generate-env, dev-obs-*, seed-all, smoke
├── staging/    deploy-staging, setup-staging, staging-*, smoke-staging
├── ci/         ci-all, docs-lint, env-status, generate-db-schema, check-coding-standard-sync
├── release/    release-tag
└── agent/      sync-agent-skills*, agent-skills-standards/, local-commands/, local-skills/
```

- [ ] ย้าย + grep แก้ทุกจุดอ้างอิงใน commit เดียว: `.github/workflows/ci-check.yml`, README, RUNBOOK ทุกชั้น, AGENTS.md, `docs-lint.mjs`, และ generated content ทั้ง `.cursor/` (VENDOR.md, USAGE.md, commands/README.md) และ `.claude/` (VENDOR.md, USAGE.md, COMMANDS.md, root `CLAUDE.md`) ที่ hard-code path `scripts/agent-skills-standards/`, `scripts/local-skills/`, `scripts/local-commands/`
- [ ] วาง shim ส่งต่อที่ path เดิม (`scripts/dev-up.sh` → `exec scripts/dev/dev-up.sh`) ไว้ 1 release แล้วค่อยถอน
- [ ] **ระวัง path depth ของ `sync-agent-skills.sh` + `sync-local-agent-skills.sh`:** ทั้งสองไฟล์คำนวณ `ROOT="$(cd "$(dirname "$0")/.." && pwd)"` — สมมติว่าตัวเองอยู่ลึกจาก repo root แค่ 1 ชั้น (`scripts/<file>.sh`) ถ้าย้ายลงไปอยู่ใต้ `scripts/agent/` (ลึกขึ้นอีก 1 ชั้น) ต้องแก้เป็น `.. /..` ไม่งั้น `ROOT` จะเพี้ยนเป็น `scripts/` แทน repo root แล้วเขียนทับผิดที่แบบเงียบ ๆ (กระทบทั้ง `.cursor/` และ `.claude/` เพราะ script เดียวดูแลทั้งคู่แล้ว) — ทดสอบด้วย `./scripts/agent/sync-agent-skills.sh --help` หรือ dry-run หลังย้ายทุกครั้ง

## Phase 3 — จัดชั้นเอกสาร + ยุบ plans เหลือที่เดียว

- [ ] ย้าย `DEPLOY_DIGITALOCEAN.md` → `docs/deploy/digitalocean.md` — root เหลือ `README`, `AGENTS.md`, `CLAUDE.md` (generated, ต้องอยู่ root — Claude Code auto-load เฉพาะตำแหน่งนี้), `CHANGELOG`, `RUNBOOK`
- [ ] นิยามลำดับชั้น RUNBOOK ใน `docs/README.md` (root = local dev รวม / `backend/` = deep ops / `server-environment/staging/` = server จริง) แล้วตัดเนื้อหาซ้ำ
- [ ] **Plans อยู่ใน `docs/` ต่อ (ตัดสินใจแล้ว — ไม่แยกเป็น top-level):** ให้ `docs/exec-plans/` เป็นบ้านเดียวของ plan ทุกระดับ ใช้ front-matter `services: [...]` แยก scope แทนโฟลเดอร์ต่อ service
- [ ] ย้าย `confidence-map.md` จาก `docs/specs/backend/<service>/plans/` → ไปอยู่ข้าง spec (`docs/specs/backend/<service>/confidence-map.md`) แล้วลบโฟลเดอร์ `plans/` ต่อ service — แก้ `WORKFLOW.md` แต่ละ service + `docs/exec-plans/README.md` บรรทัดที่อ้างถึง
- [ ] ลบ `docs/specs/backend/plans/` (ว่างเปล่า)
- [x] เปิด `docs/specs/frontend/` สำหรับ backoffice-next — `docs/specs/frontend/backoffice-next/backoffice-next-spec.md`
- [ ] จัด `harness-engineering/openai-com-index-harness-engineering.md` ให้ชัดว่าเป็น source material — ย้ายเข้า `harness-engineering/sources/` (**ห้ามย้ายเข้า `references/`** — โฟลเดอร์นั้นเป็น sync target ของ `sync-agent-skills.sh` ถูก rsync ทับจาก upstream, do not edit by hand)
- [x] อัปเดต README/AGENTS.md ที่ยังพูดถึง `frontend/backoffice` (Vite) เป็นแอปหลัก — รวมถึง RUNBOOK.md, backend/README.md, backend/ENV.md, `.github/workflows/ci-check.yml` (ลบ job `frontend-checks` legacy), `docs/QUALITY_SCORE.md`, `docs/exec-plans/tech-debt-tracker.md` (TD-002 closed)

## Phase 4 — cutover เสร็จบางส่วน (2026-07-08, ก่อนกำหนดเดิม)

- [x] `git rm frontend/backoffice` ทั้งก้อน — ทำแล้วตามคำสั่ง user (ไม่รอ staging UAT)
- [ ] ย้าย `backoffice-next-migration.md` ไป `completed/` — **ยังทำไม่ได้** เหลือ 2 gate ที่ต้องให้คนยืนยันจริง: staging nginx applied on server, manual UAT — plan ยังอยู่ที่ `active/` จนกว่าจะปิดครบ

## ตัดสินใจแล้ว — ไม่ทำ

- **ไม่ rename `frontend/backoffice-next` → `frontend/backoffice`** (ตัดสินใจ 2026-07-08 หลังลบ legacy แล้ว) — user สั่งให้ใช้ชื่อ `backoffice-next` ต่อไปก่อน แม้ตัวเก่าจะถูกลบแล้วก็ตาม
- **ไม่รวม `backend/` + `frontend/` เข้าโฟลเดอร์ `code-base/`** — blast radius ใหญ่สุด (scripts, CI, PM2, เอกสารทุกชั้น), zone table ใน README/AGENTS.md จัดกลุ่มเชิง logic ให้อยู่แล้ว, path ยาวขึ้นถาวร ถ้าอยากจัดกลุ่มจริง ๆ ให้ทำหลัง Phase 4 ด้วย convention `apps/` (turborepo/nx) ไม่ใช่ชื่อ custom
- **ไม่ทำ npm workspaces ที่ backend root** — โครง per-package standalone ตั้งใจไว้ สอดคล้อง coding-standard และ CI ต่อ package
- **ไม่แตะโครง `backend/`** — สะอาดดีอยู่แล้ว
- ถ้า root ยังรู้สึกรก ให้ลดฝั่ง meta ไม่ใช่ฝั่ง code — candidate คือ `harness-engineering/` → ใต้ `docs/`; ส่วน `references/` เป็น sync target ของ agent-skills ถ้าจะย้ายต้องแก้ `REFS` ใน `sync-agent-skills.sh` ด้วย (ทำได้แต่ไม่จำเป็น)
