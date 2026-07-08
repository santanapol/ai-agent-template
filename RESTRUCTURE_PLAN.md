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

## Phase 0 — เซฟงานค้าง (ทำก่อนขยับอะไรทั้งนั้น)

- [ ] เพิ่ม `.next/` และ `coding-standard/**/reference/` ลง root `.gitignore`
- [ ] Commit งาน migration: source `backoffice-next` + 19 ไฟล์ modified + `docs/exec-plans/active/backoffice-next-migration.md` + `frontend/backoffice/DEPRECATED.md` — **ยกเว้น** `reference/studio-admin`

## Phase 1 — ตัดไขมัน (คืนดิสก์ ~3GB+)

- [ ] **เก็บ `studio-admin` ไว้เป็น design reference** (ตัดสินใจ 2026-07-08) แต่ slim ลง: ลบเฉพาะ `node_modules/` (716MB) + `.next/` (1.7GB) ซึ่ง rebuild ได้ — เหลือ source ไม่กี่ MB; คง gitignore ไว้ (local-only, ไม่ commit เข้า repo) — เลิกใช้เมื่อไหร่ค่อยลบทั้งก้อน
- [ ] บันทึก provenance ใน `coding-standard/frontend/backoffice/README.md` (ไฟล์ tracked ที่ลิงก์ไป `reference/studio-admin/` อยู่แล้ว บรรทัด 10): ระบุว่า dir นี้ **local-only (gitignored)** + upstream URL + v2.2.0 + คำสั่ง re-clone สำหรับเครื่องใหม่ — กันลิงก์เสียสำหรับคนที่ clone repo ใหม่
- [ ] ลบเศษ template ใน `backoffice-next`: `repo.md`, `CONTRIBUTING.md`, `media/`; เขียน README ของโปรเจกต์เอง (**เก็บ `LICENSE`** — derive จาก MIT upstream)
- [ ] ลบ `frontend/backoffice/node_modules` บนเครื่อง (ไม่กระทบ git)

## Phase 2 — จัด `scripts/` เป็นหมวด

```
scripts/
├── dev/        dev-up, dev-down, dev-lib, dev-generate-env, dev-obs-*, seed-all, smoke
├── staging/    deploy-staging, setup-staging, staging-*, smoke-staging
├── ci/         ci-all, docs-lint, env-status, generate-db-schema, check-coding-standard-sync
├── release/    release-tag
└── agent/      sync-agent-skills*, agent-skills-standards/, local-commands/, local-skills/
```

- [ ] ย้าย + grep แก้ทุกจุดอ้างอิงใน commit เดียว: `.github/workflows/ci-check.yml`, README, RUNBOOK ทุกชั้น, AGENTS.md, `.cursor/skills`, `docs-lint.mjs`
- [ ] วาง shim ส่งต่อที่ path เดิม (`scripts/dev-up.sh` → `exec scripts/dev/dev-up.sh`) ไว้ 1 release แล้วค่อยถอน

## Phase 3 — จัดชั้นเอกสาร + ยุบ plans เหลือที่เดียว

- [ ] ย้าย `DEPLOY_DIGITALOCEAN.md` → `docs/deploy/digitalocean.md` — root เหลือ `README`, `AGENTS.md`, `CHANGELOG`, `RUNBOOK`
- [ ] นิยามลำดับชั้น RUNBOOK ใน `docs/README.md` (root = local dev รวม / `backend/` = deep ops / `server-environment/staging/` = server จริง) แล้วตัดเนื้อหาซ้ำ
- [ ] **Plans อยู่ใน `docs/` ต่อ (ตัดสินใจแล้ว — ไม่แยกเป็น top-level):** ให้ `docs/exec-plans/` เป็นบ้านเดียวของ plan ทุกระดับ ใช้ front-matter `services: [...]` แยก scope แทนโฟลเดอร์ต่อ service
- [ ] ย้าย `confidence-map.md` จาก `docs/specs/backend/<service>/plans/` → ไปอยู่ข้าง spec (`docs/specs/backend/<service>/confidence-map.md`) แล้วลบโฟลเดอร์ `plans/` ต่อ service — แก้ `WORKFLOW.md` แต่ละ service + `docs/exec-plans/README.md` บรรทัดที่อ้างถึง
- [ ] ลบ `docs/specs/backend/plans/` (ว่างเปล่า)
- [ ] เปิด `docs/specs/frontend/` สำหรับ backoffice-next
- [ ] จัด `harness-engineering/openai-com-index-harness-engineering.md` ให้ชัดว่าเป็น source material — ย้ายเข้า `harness-engineering/sources/` (**ห้ามย้ายเข้า `references/`** — โฟลเดอร์นั้นเป็น sync target ของ `sync-agent-skills.sh` ถูก rsync ทับจาก upstream, do not edit by hand)
- [ ] อัปเดต README/AGENTS.md ที่ยังพูดถึง `frontend/backoffice` (Vite) เป็นแอปหลัก (README บรรทัด 6, 43, layout diagram)

## Phase 4 — หลังผ่าน staging UAT (gate สุดท้ายของ migration)

- [ ] `git rm frontend/backoffice` ทั้งก้อน + ย้าย `backoffice-next-migration.md` ไป `completed/`
- [ ] ค่อยพิจารณา rename `backoffice-next` → `backoffice` (หลังลบตัวเก่าเท่านั้น)

## ตัดสินใจแล้ว — ไม่ทำ

- **ไม่รวม `backend/` + `frontend/` เข้าโฟลเดอร์ `code-base/`** — blast radius ใหญ่สุด (scripts, CI, PM2, เอกสารทุกชั้น), zone table ใน README/AGENTS.md จัดกลุ่มเชิง logic ให้อยู่แล้ว, path ยาวขึ้นถาวร ถ้าอยากจัดกลุ่มจริง ๆ ให้ทำหลัง Phase 4 ด้วย convention `apps/` (turborepo/nx) ไม่ใช่ชื่อ custom
- **ไม่ทำ npm workspaces ที่ backend root** — โครง per-package standalone ตั้งใจไว้ สอดคล้อง coding-standard และ CI ต่อ package
- **ไม่แตะโครง `backend/`** — สะอาดดีอยู่แล้ว
- ถ้า root ยังรู้สึกรก ให้ลดฝั่ง meta ไม่ใช่ฝั่ง code — candidate คือ `harness-engineering/` → ใต้ `docs/`; ส่วน `references/` เป็น sync target ของ agent-skills ถ้าจะย้ายต้องแก้ `REFS` ใน `sync-agent-skills.sh` ด้วย (ทำได้แต่ไม่จำเป็น)
