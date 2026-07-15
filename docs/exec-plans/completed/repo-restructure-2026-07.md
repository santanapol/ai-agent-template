---
status: completed
created: 2026-07-08
updated: 2026-07-08
services: []
---

# Plan: Repository restructure

> เดิมอยู่ root เป็น `RESTRUCTURE_PLAN.md` → ย้ายเข้า `docs/exec-plans/active/` → ตอนนี้ทำครบทุก phase แล้ว ย้ายมา `completed/`. ไม่มี PR แยก — ทุกการเปลี่ยนแปลงยังไม่ได้ commit ณ ตอนที่เขียนบรรทัดนี้ (working tree เท่านั้น)
> รีวิวสถานะจริงรอบ 2026-07-08 (เย็น): Phase 0 + Phase 4 เสร็จสมบูรณ์ · Phase 1 กับ Phase 3 เสร็จบางส่วน · Phase 2 ยังไม่เริ่ม — ดูเครื่องหมาย [x]/[ ] ต่อรายการด้านล่าง (ตรวจกับสถานะไฟล์จริงแล้ว ไม่ใช่แค่บันทึกความจำ)

## บริบท (สิ่งที่พบจากการสำรวจ 2026-07-08)

โครงสร้าง zone โดยรวมดีอยู่แล้ว ปัญหาหลักคือ**เศษค้างจาก backoffice-next migration** และ**ของวางผิดที่**:

1. `coding-standard/frontend/backoffice/reference/studio-admin` — clone เต็มของ template upstream **2.4GB** (node_modules 716MB + `.next` 1.7GB) ยัง untracked; **ยังต้องใช้เป็น design reference** — เก็บ source ไว้ แต่ต้องไม่ให้เข้า git และตัดส่วน build ทิ้งได้
2. งาน migration **ยังไม่มี commit เลย**: `frontend/backoffice-next` (~324 ไฟล์ untracked) + 19 ไฟล์ modified (scripts/CI/PM2) + exec-plan + DEPRECATED.md
3. เศษ template ใน `backoffice-next`: `repo.md`, `CONTRIBUTING.md`, `media/`, README/AGENTS.md ของ upstream
4. `scripts/` 27 รายการปน 5 หน้าที่ (dev harness / staging ops / CI-docs tooling / release / agent-skills)
5. root มี `DEPLOY_DIGITALOCEAN.md` ปน; RUNBOOK มี 4 ชั้นทับซ้อนบางส่วน
6. "plans" กระจาย 3 ที่: `docs/exec-plans/` (ดี, docs-lint บังคับ) · `docs/specs/backend/<service>/plans/` (ข้างในเป็น `confidence-map.md` = audit artifact ไม่ใช่ plan) · `docs/specs/backend/plans/` (ว่าง, ผิดชั้น)
7. legacy `frontend/backoffice` deprecated แล้วแต่ยังกิน 643MB บนดิสก์ (node_modules)
8. `knowledge/harness/openai-com-index-harness-engineering.md` เป็น scraped reference ไม่ใช่ philosophy doc

หมายเหตุ: `dev-ops/**/credential.md` ถูก gitignore แล้ว ✓

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

## Phase 0 — เซฟงานค้าง (ทำก่อนขยับอะไรทั้งนั้น) — ✅ เสร็จสมบูรณ์

- [x] เพิ่ม gitignore กัน `studio-admin` เข้า git — ใช้ path เฉพาะเจาะจง `coding-standard/frontend/backoffice/reference/studio-admin/` แทน wildcard กว้าง (ผลลัพธ์เดียวกัน)
- [x] Commit งาน migration ครบแล้ว — `git status` สะอาด, migration ผ่าน v0.5.0 ship แล้ว (tag `v0.5.0`, ดู `CHANGELOG.md`)

## Phase 1 — ตัดไขมัน (คืนดิสก์ ~3GB+) — ✅ เสร็จสมบูรณ์

- [x] slim `studio-admin` แล้ว — ลบ `node_modules/` (716MB) + `.next/` (1.7GB) เหลือ **3.9MB** (rebuild ได้ด้วย `npm ci && npm run dev` ถ้าต้องใช้ต่อ) ยัง gitignored ไม่กระทบ git
- [x] บันทึก provenance แล้ว — `coding-standard/frontend/backoffice/reference/REFERENCE-PINS.md`
- [x] ลบเศษ template ใน `backoffice-next` แล้ว — `repo.md`, `CONTRIBUTING.md`, `media/dashboard.png` ลบทิ้ง (README.md เป็น project-specific อยู่แล้วจากงานก่อนหน้า ไม่ต้องเขียนใหม่); เก็บ `LICENSE` ไว้ตามเดิม; แก้ลิงก์ท้าย README ให้ชี้ไป `completed/` + spec ใหม่
- [x] ลบ `frontend/backoffice/node_modules` บนเครื่อง — เป็นส่วนหนึ่งของการลบทั้งโฟลเดอร์ (ดูอัปเดตรอบสองด้านบน)

## Phase 2 — จัด `scripts/` เป็นหมวด — ✅ เสร็จสมบูรณ์

```
scripts/
├── dev/        dev-up, dev-down, dev-lib, dev-generate-env, dev-obs-*, seed-all, smoke
├── staging/    deploy-staging, setup-staging, staging-*, smoke-staging, ensure-staging-swap
├── ci/         ci-all, docs-lint, env-status, generate-db-schema, check-coding-standard-sync
├── release/    release-tag
└── agent/      sync-agent-skills*, agent-skills-standards/, local-commands/, local-skills/
```

- [x] ย้ายทุกไฟล์แล้ว (`git mv`) รวม `ensure-staging-swap.sh`/`smoke-staging.sh`/`staging-verify-*.sh` ที่เพิ่มมาใหม่ — ครบทุกหมวดตามแผน
- [x] **บั๊ก path-depth ที่กังวลไว้เกิดขึ้นจริงกับสคริปต์เกือบทุกตัว ไม่ใช่แค่ 2 ตัว agent-skills** — ทุกสคริปต์ที่คำนวณ `ROOT`/`__dirname` แบบ "ขึ้นไป 1 ชั้น" ต้องแก้เป็น "ขึ้นไป 2 ชั้น" หลังย้ายลึกขึ้น 1 ระดับ: แก้แล้วทั้งหมด — `dev-lib.sh` (จุดเดียว fix ให้ `dev-up/dev-down/seed-all/smoke/dev-obs-up/dev-obs-down` เพราะ source ไฟล์นี้), `deploy-staging.sh`, `setup-staging.sh`, `staging-seed-all.sh`, `staging-verify-seed.sh`, `staging-verify-env.sh`, `staging-init-env.sh`, `check-coding-standard-sync.sh`, `release-tag.sh`, `sync-agent-skills.sh`, `sync-local-agent-skills.sh`, และ `.mjs` ทั้ง 4 ตัว (`docs-lint`, `env-status`, `generate-db-schema`, `dev-generate-env`) — เปลี่ยน `path.resolve(__dirname, '..')` → `'..','..'`
- [x] **เจอ cross-folder dependency ที่แผนไม่ได้คาดไว้:** `ci-all.sh` ย้ายไป `ci/` แต่ต้อง `source` ตัว `dev-lib.sh` ที่อยู่ `dev/` — แก้เป็น `source "$SCRIPT_DIR/../dev/dev-lib.sh"` พร้อมแก้ 3 จุดที่ `ci-all.sh` เรียก `dev-up.sh`/`smoke.sh`/`dev-down.sh` ข้ามโฟลเดอร์เดียวกัน
- [x] วาง shim ส่งต่อที่ path เดิมครบทั้ง 23 ไฟล์ (`.sh` ใช้ `exec`, `.mjs` ใช้ dynamic `import()`) แล้วทดสอบ — **แต่ถอดออกทั้งหมดในรอบรีวิวถัดมา (2026-07-08 คืน)**: user สังเกตว่า `scripts/` ดูรกแปลก ๆ จาก shim ที่ปนกับโฟลเดอร์ใหม่ ตรวจพบว่าไม่จำเป็นจริง — งาน reorg นี้ยังไม่เคย ship (ไม่มี commit เก่าที่คนอื่นอ้าง path แบนอยู่) จึงลบ shim ทิ้งได้ปลอดภัย เหลือแค่ `scripts/<category>/<name>` เท่านั้น
- [x] แก้ generated content ที่ hard-code path เก่าครบ: `.cursor/`+`.claude/` VENDOR.md, USAGE.md, COMMANDS.md/commands/README.md, root `CLAUDE.md`, `.cursor/rules/agent-skills.mdc` — แก้ที่ source (`scripts/agent/sync-agent-skills.sh` heredocs) แล้ว sync ใหม่ให้ propagate แทนแก้ไฟล์ generated ตรงๆ
- [x] แก้ `.github/workflows/ci-check.yml` (`docs-lint.mjs` path) และ `deploy.yml` (`staging-verify-env.sh`, `deploy-staging.sh`) — validate YAML แล้วผ่าน
- [x] แก้ทุก reference ใน README/AGENTS.md/RUNBOOK ทุกชั้น/harness-engineering ทั้ง 3 ไฟล์/`docs/golden-principles.md`/`docs/observability.md`/`docs/README.md`/`docs/releases/README.md`/`tech-debt-tracker.md`/`scripts/README.md` (เขียนใหม่ทั้งหมดให้ตรงหมวดใหม่) — เจอและแก้เพิ่ม 2 จุดที่หลุด sed รอบแรก (`docs/README.md`, `docs/releases/README.md`) ด้วย docs-lint
- [x] แก้ source ของ local-commands/local-skills ที่ generated content copy มาจาก (`scripts/agent/local-commands/gc.md`, `release.md`, `scripts/agent/local-skills/release-notes-and-handoff/SKILL.md`) แล้ว sync ใหม่ให้ propagate เข้า `.cursor/`+`.claude/`
- [x] **ตั้งใจไม่แก้** dated release/handoff/UAT docs (`docs/releases/2026-07-0X-deploy.md`, `frontend/backoffice-next/docs/STAGING-UAT-2026-07-08.md`, `UI-UX-REVIEW-2026-07-07.md`) — เป็น historical record ของคำสั่งที่รันจริงตอนนั้น เหมือน CHANGELOG
- [x] Verify: syntax check ผ่านทุกไฟล์ (`bash -n` + `node --check`), `docs-lint` ผ่าน, `ci-all.sh --skip-install --only docs` รันจริงผ่าน (เรียก `docs-lint.mjs` ข้ามโฟลเดอร์ถูกต้อง), sync script dry-run 3 รอบผ่าน (รอบแรกพบ `sync-local-agent-skills.sh` หา `local-skills/` ผิดที่, รอบสองพบ `ship.md`/`test.md` standards fragment ยังมี path เก่า — แก้ทั้งคู่แล้ว sync ซ้ำจน propagate สะอาด), grep sweep ทั้ง repo รอบสุดท้ายไม่เจอ path เก่าที่ยังใช้งานจริงเหลือเลย (เหลือแค่ประโยคอธิบาย shim ใน `scripts/README.md` ที่ตั้งใจพูดถึง path เก่า)

## Phase 3 — จัดชั้นเอกสาร + ยุบ plans เหลือที่เดียว — ✅ เสร็จสมบูรณ์

- [x] ย้าย `DEPLOY_DIGITALOCEAN.md` → `docs/deploy/digitalocean.md` แล้ว — แก้ทุกลิงก์ (README, RUNBOOK, dev-ops/staging/RUNBOOK, knowledge/harness/workflows.md ×2, coding-standard operations doc) เหลือ CHANGELOG.md ตั้งใจไม่แก้ (historical) — root ตอนนี้เหลือ `README`, `AGENTS.md`, `CLAUDE.md` (generated), `CHANGELOG`, `RUNBOOK`
- [x] นิยามลำดับชั้น RUNBOOK ใน `docs/README.md` แล้ว (root = local dev start here / `backend/` = manual + deploy checklist / `dev-ops/staging/` = server จริง) — ตัด Troubleshooting ที่ซ้ำใน `backend/RUNBOOK.md` §5 ออก เหลือ pointer ไป root (เช็คแล้ว: ส่วนอื่นของ 3 ไฟล์ RUNBOOK ไม่ทับซ้อนจริง — คนละ scope กัน); เจอ + แก้ stale `5175`/Vite ที่หลงเหลือใน `RUNBOOK.md` และ `knowledge/harness/workflows.md` ไปด้วยระหว่างตรวจ
- [x] **Plans อยู่ใน `docs/` ต่อ (ตัดสินใจแล้ว — ไม่แยกเป็น top-level):** `docs/exec-plans/README.md` แก้แล้ว — plan ทุกระดับ (รวม service-scoped) อยู่ที่นี่ ใช้ `services: [...]` front-matter แยก scope แทนโฟลเดอร์ต่อ service
- [x] ย้าย `confidence-map.md` จาก `docs/specs/backend/<service>/plans/` → `docs/specs/backend/<service>/confidence-map.md` แล้วทั้ง 6 service (agent-invoice, staff, auth, gateway, branch-report, smart-report) — ลบโฟลเดอร์ `plans/` ทิ้งหมด, แก้ `WORKFLOW.md` ทั้ง 5 ไฟล์ที่อ้างถึง (smart-report ไม่มีการอ้างอิงเดิม) ให้ชี้ไป `docs/exec-plans/active/` แทน
- [x] ลบ `docs/specs/backend/plans/` (ว่างเปล่า) แล้ว
- [x] เปิด `docs/specs/frontend/` สำหรับ backoffice-next — `docs/specs/frontend/backoffice-next/backoffice-next-spec.md`
- [x] ย้าย `knowledge/harness/openai-com-index-harness-engineering.md` → `knowledge/harness/sources/openai-com-index-harness-engineering.md` แล้ว — แก้ลิงก์ใน `core-beliefs.md` + `README.md` (×3 จุด รวม repo-structure tree) ครบ
- [x] อัปเดต README/AGENTS.md ที่ยังพูดถึง `frontend/backoffice` (Vite) เป็นแอปหลัก — รวมถึง RUNBOOK.md, backend/README.md, backend/ENV.md, `.github/workflows/ci-check.yml` (ลบ job `frontend-checks` legacy), `docs/QUALITY_SCORE.md`, `docs/exec-plans/tech-debt-tracker.md` (TD-002 closed)

## Phase 4 — cutover — ✅ เสร็จสมบูรณ์ (ยืนยันจาก git log 2026-07-08 เย็น)

- [x] `git rm frontend/backoffice` ทั้งก้อน — ทำแล้วตามคำสั่ง user (ไม่รอ staging UAT)
- [x] ย้าย `backoffice-next-migration.md` ไป `completed/` แล้ว — staging nginx applied + manual UAT ปิดครบ, ship เป็น **v0.5.0** (tag + `CHANGELOG.md` + `docs/releases/2026-07-08-*.md`)

## ตัดสินใจแล้ว — ไม่ทำ

- **ไม่ rename `frontend/backoffice-next` → `frontend/backoffice`** (ตัดสินใจ 2026-07-08 หลังลบ legacy แล้ว) — user สั่งให้ใช้ชื่อ `backoffice-next` ต่อไปก่อน แม้ตัวเก่าจะถูกลบแล้วก็ตาม
- **ไม่รวม `backend/` + `frontend/` เข้าโฟลเดอร์ `code-base/`** — blast radius ใหญ่สุด (scripts, CI, PM2, เอกสารทุกชั้น), zone table ใน README/AGENTS.md จัดกลุ่มเชิง logic ให้อยู่แล้ว, path ยาวขึ้นถาวร ถ้าอยากจัดกลุ่มจริง ๆ ให้ทำหลัง Phase 4 ด้วย convention `apps/` (turborepo/nx) ไม่ใช่ชื่อ custom
- **ไม่ทำ npm workspaces ที่ backend root** — โครง per-package standalone ตั้งใจไว้ สอดคล้อง coding-standard และ CI ต่อ package
- **ไม่แตะโครง `backend/`** — สะอาดดีอยู่แล้ว
- ถ้า root ยังรู้สึกรก ให้ลดฝั่ง meta ไม่ใช่ฝั่ง code — candidate คือ `knowledge/harness/` → ใต้ `docs/`; ส่วน `references/` เป็น sync target ของ agent-skills ถ้าจะย้ายต้องแก้ `REFS` ใน `sync-agent-skills.sh` ด้วย (ทำได้แต่ไม่จำเป็น)
