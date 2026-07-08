# ตัวอย่างขั้นตอนการทำงาน (Workflows)

ตัวอย่าง step-by-step ของงานที่พบบ่อยใน zero-platform — ใช้คู่กับ [README.md](./README.md) (แนวคิด) และ [core-beliefs.md](./core-beliefs.md) (หลักการ)

สารบัญ:

1. [การเตรียมตัวครั้งแรก](#1-การเตรียมตัวครั้งแรก-onboarding)
2. [การ sync agent-skills](#2-การ-sync-agent-skills)
3. [การใช้ scripts ประจำวัน](#3-การใช้-scripts-ประจำวัน)
4. [พัฒนาแบบเต็ม SDLC](#4-พัฒนาแบบเต็ม-sdlc-feature-ใหญ่)
5. [เพิ่ม function เล็กใน service เดิม](#5-เพิ่ม-function-เล็กใน-service-เดิม)
6. [การทดสอบ](#6-การทดสอบ)
7. [การหาบัค (debugging)](#7-การหาบัค-debugging)
8. [การ deploy](#8-การ-deploy)
9. [Garbage collection](#9-garbage-collection-รอบทำความสะอาด)
10. [ทำงานหลาย worktree พร้อมกัน](#10-ทำงานหลาย-worktree-พร้อมกัน)
11. [Frontend feedback loop](#11-frontend-feedback-loop)

---

## 1. การเตรียมตัวครั้งแรก (onboarding)

ทำครั้งเดียวหลัง clone repo:

```bash
# 1. Sync agent-skills → .claude/ + .cursor/ + references/
./scripts/agent/sync-agent-skills.sh

# 2. Boot stack ครั้งแรก (จะ npm ci + init DB ให้อัตโนมัติ)
./scripts/dev/dev-up.sh

# 3. ยืนยันว่าทุกอย่างทำงาน
./scripts/dev/smoke.sh

# 4. ปิดเมื่อเสร็จ
./scripts/dev/dev-down.sh
```

ลำดับการอ่านเอกสาร:

1. [AGENTS.md](../AGENTS.md) — แผนที่ repo
2. [harness-engineering/README.md](./README.md) — วิธีทำงาน
3. [docs/golden-principles.md](../docs/golden-principles.md) — กฎที่ห้ามฝ่าฝืน
4. spec ของ service ที่จะแก้ — `docs/specs/backend/<service>/`

**Prerequisites:** Node.js `>=24 <25`, Docker + docker compose

---

## 2. การ sync agent-skills

รันเมื่อ: clone ใหม่, upstream agent-skills อัปเดต, หรือแก้ `scripts/agent/agent-skills-standards/`

```bash
# ดึงจาก GitHub upstream
./scripts/agent/sync-agent-skills.sh

# หรือใช้ local clone (เร็วกว่า ตอน dev standards)
./scripts/agent/sync-agent-skills.sh /path/to/agent-skills
```

สิ่งที่เกิดขึ้น:

| ขั้น | ผลลัพธ์ |
|------|---------|
| Sync skills/agents/references | `.claude/skills/`, `.claude/agents/`, `.cursor/skills/`, `.cursor/agents/`, `references/` ถูกทับ |
| แปลง commands | upstream `.claude/commands/` (ต้นทาง) → `.claude/commands/` (native, strip prefix `agent-skills:`) + `.cursor/commands/` (Cursor format) — ทั้งคู่ต่อท้าย Related Coding Standards จาก `scripts/agent/agent-skills-standards/<cmd>.md` |
| Copy local commands | `scripts/agent/local-commands/*.md` (เช่น `/gc`) → `.claude/commands/` และ `.cursor/commands/` |
| Regenerate meta | root `CLAUDE.md`, `.cursor/rules/agent-skills.mdc`, `VENDOR.md`, `USAGE.md` (ทั้งสอง target) |

**ต้องการแก้พฤติกรรม command?** แก้ที่ `scripts/agent/agent-skills-standards/<cmd>.md` (source) แล้ว sync ใหม่ — **อย่าแก้** `.claude/commands/` หรือ `.cursor/commands/` ตรง ๆ เพราะถูกทับ

รายละเอียดว่าทำไม vendor เข้า repo แทนที่จะติดตั้งผ่าน Claude Code plugin marketplace: [`.claude/VENDOR.md`](../.claude/VENDOR.md)

---

## 3. การใช้ scripts ประจำวัน

```bash
./scripts/dev/dev-up.sh                  # boot: Mongo/Redis + auth/gateway/demo/staff/agent-invoice/smart-report/branch-report (+ seed-all)
./scripts/dev/dev-up.sh --skip-seed      # boot without re-seeding (faster restart)
./scripts/dev/dev-up.sh --with-frontend  # + backoffice-next ที่ :3005+offset
./scripts/dev/dev-up.sh --no-obs         # boot โดยไม่เอา observability
./scripts/dev/seed-all.sh                # re-seed example data (uses backend/*/.env.harness)
./scripts/dev/smoke.sh                   # login + proxy ผ่าน gateway (+ frontend ถ้ารันอยู่)
./scripts/dev/dev-obs-up.sh              # VictoriaLogs :9428 + VictoriaMetrics :8428
./scripts/dev/dev-down.sh                # teardown ทั้งหมด (รวม obs + frontend)
node scripts/ci/docs-lint.mjs           # ตรวจ knowledge base (ลิงก์, spec ครบ, front-matter)
node scripts/ci/generate-db-schema.mjs   # dump schema จาก Mongo จริง (อ่าน backend/auth/.env.harness)
```

ไฟล์ runtime ต่อ instance อยู่ที่ `.dev-run/<offset>/`:

```
.dev-run/0/
├── logs/         # stdout ต่อ service (Vector tail จากตรงนี้)
└── pids/         # PID files
```

พอร์ต + smoke creds คำนวณใน `scripts/dev/dev-lib.sh` (`dev_load_ports`) จาก `PORT_OFFSET`

ดู log สด: `tail -f .dev-run/0/logs/gateway.log`

---

## 4. พัฒนาแบบเต็ม SDLC (feature ใหญ่)

ตัวอย่าง: "เพิ่ม endpoint ยกเลิก invoice ใน agent-invoice"

### Phase 1 — Define (`/spec`)

```
/spec เพิ่ม endpoint POST /api/v1/invoices/:id/cancel — ยกเลิกได้เฉพาะ status PENDING,
role ที่ทำได้: platform_admin, support_admin
```

Agent จะอ่าน `docs/specs/backend/agent-invoice/` + `coding-standard/backend/` แล้วอัปเดต:

- `agent-invoice-spec.md` — behavior + acceptance criteria
- `business-domain.md` — status transition
- `openapi.yaml` — contract

### Phase 2 — Plan (`/plan`)

```
/plan จาก spec ที่เพิ่งอัปเดต
```

งานข้าม PR / ข้าม service → agent สร้าง plan ใน `docs/exec-plans/active/` พร้อม front-matter (`status`, `created`, `updated`, `services`)

### Phase 3 — Build (`/build`)

```
/build ทำตาม plan ทีละ task
```

Agent implement แบบ incremental: schema → repository → service → route → tests — ตาม layer pattern ของ `staff` (golden reference)

### Phase 4 — Verify (`/test`)

```
/test
```

Command นี้มี Harness verification ฝังอยู่:

```bash
./scripts/dev/dev-up.sh
./scripts/dev/smoke.sh
cd backend/service/agent-invoice && npm run ci
./scripts/dev/dev-down.sh
```

### Phase 5 — Review + Simplify

```
/review          # 5 แกน: correctness, readability, architecture, security, performance
/code-simplify   # ลด complexity ที่ review เจอ
```

### Phase 6 — Ship (`/ship`)

```
/ship
```

Fan-out 3 subagents คู่ขนาน (code-reviewer, security-auditor, test-engineer) → merge รายงาน → GO/NO-GO + rollback plan — Critical finding = default NO-GO

### Phase 7 — Release (`/release`)

```
/release
```

หลัง **GO** เท่านั้น — skill `release-notes-and-handoff` (source: `scripts/agent/local-skills/`):

1. เขียน `docs/releases/YYYY-MM-DD-user.md` + `*-deploy.md`
2. คนยืนยัน
3. `node scripts/ci/docs-lint.mjs` เท่านั้น — **ไม่รัน ci-all ซ้ำ** (`/ship` รันแล้ว)
4. commit → เปิด PR ใหม่ หรืออัปเดต PR ที่มีอยู่
5. ย้าย exec plan → `docs/exec-plans/completed/` ถ้ามี

งานเล็ก (≤2 ไฟล์, ไม่แตะ auth/env/deploy) ข้ามได้ — PR description พอ

### Phase 8 — ปิดงาน (อื่น ๆ)

- เพิ่ม debt ที่เหลือลง `tech-debt-tracker.md`

---

## 5. เพิ่ม function เล็กใน service เดิม

งานเล็ก (ไฟล์เดียว-สองไฟล์, ไม่แตะ contract) ไม่ต้องเต็ม SDLC:

```
เพิ่ม validation: username ต้องไม่มี whitespace ใน POST /auth/login
```

ขั้นตอนที่ agent ควรทำ:

1. อ่าน spec เดิม — `docs/specs/backend/auth/auth-spec.md`
2. เขียน test ที่ fail ก่อน (Prove-It) → implement → test เขียว
3. `cd backend/auth && npm run ci`
4. ถ้าแตะ behavior ที่ spec ระบุ → อัปเดต spec ใน PR เดียวกัน (spec กับ code ห้าม drift)

**เกณฑ์ข้าม `/ship` fan-out:** ≤2 ไฟล์, diff <50 บรรทัด, ไม่แตะ auth/payments/data access/config — ไม่เข้าเกณฑ์ให้รัน `/ship` ตามปกติ

---

## 6. การทดสอบ

### ระดับ package (unit + integration)

```bash
cd backend/auth
npm test          # node --test
npm run ci        # lint + format + spec gates + test + audit
```

### ระดับ stack (smoke / E2E)

```bash
./scripts/dev/dev-up.sh && ./scripts/dev/smoke.sh
```

### ทดสอบทุก service (CI + Smoke)

รัน baseline ก่อนเริ่มงานหรือก่อน PR — mirror GitHub Actions + smoke stack ในคำสั่งเดียว:

```bash
./scripts/ci/ci-all.sh                  # ครบ: backend CI ×7 + frontend + docs + smoke
./scripts/ci/ci-all.sh --skip-install   # ข้าม npm ci (deps พร้อมแล้ว)
./scripts/ci/ci-all.sh --skip-smoke     # package CI + docs เท่านั้น
./scripts/ci/ci-all.sh --with-frontend  # smoke รวม backoffice-next
./scripts/ci/ci-all.sh --only backend   # รันเฉพาะ phase ที่ต้องการ
```

สคริปต์ stash `.env` dev ของทุก service ก่อนรัน (mirror CI) และ restore อัตโนมัติเมื่อจบ — service ที่มี `.env.test` (agent-invoice, smart-report, branch-report) ใช้ test env ระหว่างรัน

**Seed data (harness):** `dev-up` เรียก `seed-all.sh` โดย default — users, menus, staff profiles, demo items, smart reports, agent-invoice sample, branch-report `gpp_777ww` minimal docs

### ทดสอบ API เฉพาะจุด

Bruno collections อยู่ที่ `backend/_bruno/` (auth, gateway, staff-service-proxied, agent-invoice-service) — เปิดด้วย Bruno app หรือ `bru` CLI

### ตรวจด้วย observability

```bash
./scripts/dev/dev-obs-up.sh

# ยิง request แล้วดู log
curl -sG 'http://127.0.0.1:9428/select/logsql/query' \
  --data-urlencode 'query=service:auth AND statusCode:401' \
  --data-urlencode 'limit=10'
```

มาตรฐานการทดสอบ: `coding-standard/software-testing/`

---

## 7. การหาบัค (debugging)

ใช้ skill `debugging-and-error-recovery` — flow แบบ Prove-It:

```
มีรายงานว่า login แล้วได้ 500 เมื่อ username มีตัวอักษรไทย
```

1. **Reproduce บน stack จริง**

```bash
./scripts/dev/dev-up.sh
curl -s -X POST http://127.0.0.1:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ไทย","password":"x","client_kind":"native"}'
```

2. **ดู log หา root cause**

```bash
tail -50 .dev-run/0/logs/auth.log
# หรือ query ผ่าน VictoriaLogs ถ้าเปิด obs ไว้
```

3. **เขียน test ที่ reproduce บัค** — ต้อง FAIL ก่อน
4. **แก้** → test เขียว → รัน full suite กัน regression

```bash
cd backend/auth && npm test
```

5. **Verify บน stack** — ยิง curl เดิมซ้ำ ต้องไม่ 500 แล้ว
6. บัคจาก pattern ที่ agent ทำซ้ำได้ → encode กัน (lint / golden principle / doc)

บัคฝั่ง UI: ใช้ skill `browser-testing-with-devtools` ขับ browser ตรวจเอง

---

## 8. การ deploy

Deploy อัตโนมัติผ่าน GitHub Actions → DigitalOcean เมื่อ push `main`:

```
merge PR → main
  → .github/workflows/ci-check.yml   (backend matrix + frontend + docs-checks)
  → .github/workflows/deploy.yml     (SSH → git pull → pm2 restart)
```

ขั้นตอนฝั่งคน:

1. ก่อน merge: `/ship` ต้อง GO → `/release` (notes + CI + PR) หรือ PR พอสำหรับงานเล็ก
2. Merge PR เข้า `main` — deploy รันเอง
3. ตรวจหลัง deploy: ดู Actions log + smoke test production ตาม [backend/RUNBOOK.md](../backend/RUNBOOK.md)

Setup เซิร์ฟเวอร์ครั้งแรก (Nginx, PM2, `.env.prod`, deploy keys): [docs/deploy/digitalocean.md](../docs/deploy/digitalocean.md)

> `.env.prod` ไม่อยู่ใน Git — สร้างบนเซิร์ฟเวอร์จาก `.env.example` แล้วใส่ secret จริง

---

## 9. Garbage collection (รอบทำความสะอาด)

รันเมื่อ: จบ session agent ใหญ่, ก่อน sprint review, หรือรู้สึกว่า drift สะสม

```
/gc
```

สิ่งที่เกิดขึ้น (ดู [scripts/agent/local-commands/gc.md](../scripts/agent/local-commands/gc.md)):

1. โหลด context: golden-principles, QUALITY_SCORE, tech-debt-tracker, plans ค้าง
2. `node scripts/ci/docs-lint.mjs` — แก้ error ก่อน
3. Scan drift: ESLint warnings (`no-console`, `max-lines`), docs stale เทียบโค้ด, plan ใน `active/` เกิน 30 วัน
4. แก้เป็น fix เล็ก ๆ — ห้าม refactor ใหญ่ใน `/gc`
5. อัปเดตเกรดใน QUALITY_SCORE + ปิด/เพิ่มแถว tech-debt-tracker
6. รายงานสรุป: Fixed / Deferred / Grade changes

---

## 10. ทำงานหลาย worktree พร้อมกัน

ทุก instance แยก port + MongoDB database + Redis DB index — ไม่ชนกัน:

```bash
# Worktree A (main) — offset 0
./scripts/dev/dev-up.sh

# Worktree B (feature branch) — offset 100
cd ../zero-platform-feature-x
PORT_OFFSET=100 ./scripts/dev/dev-up.sh
PORT_OFFSET=100 ./scripts/dev/smoke.sh     # gateway :3100, auth :3101
PORT_OFFSET=100 ./scripts/dev/dev-down.sh
```

| ทรัพยากร | offset 0 | offset 100 |
|----------|----------|------------|
| gateway | :3000 | :3100 |
| auth | :3001 | :3101 |
| Mongo DB | `zero-platform_0` | `zero-platform_100` |
| Redis DB | 0 | 4 (100 % 16) |
| backoffice-next | :3005 | :3105 |
| Runtime dir | `.dev-run/0/` | `.dev-run/100/` |

---

## 11. Frontend feedback loop

Agent ตรวจงาน UI ได้เองโดยไม่ต้องพึ่งมนุษย์ screenshot ให้ — boot frontend ผ่าน harness แล้วขับ browser ด้วย skill

**Production app คือ `frontend/backoffice-next` (Next.js)** — legacy `frontend/backoffice` (Vite) ถูกลบออกจาก repo แล้ว (2026-07-08) งานใหม่ทั้งหมดทำที่ `backoffice-next`

### Boot frontend พร้อม backend

```bash
./scripts/dev/dev-up.sh --with-frontend
# backoffice-next → http://127.0.0.1:3005 (+ PORT_OFFSET)
./scripts/dev/smoke.sh   # เพิ่ม check: app shell + login ผ่าน Next.js rewrite
```

Next.js `rewrites()` (`frontend/backoffice-next/next.config.mjs`) proxy ตาม `AUTH_PROXY_TARGET`/`GATEWAY_PROXY_TARGET` ต่อ offset:

- `/auth/*` → auth instance ของ offset นั้น
- `/api/*` → gateway instance ของ offset นั้น

ดังนั้น browser คุยกับ frontend origin เดียว — เหมือน production topology (ไม่มี dev-server proxy แบบ Vite เดิมแล้ว)

### ขับ UI ตรวจงานด้วย browser

ใช้ skill `browser-testing-with-devtools` — ตัวอย่างงานที่ agent ทำเองได้:

1. เปิด `http://127.0.0.1:3005` → snapshot DOM
2. Login ผ่านฟอร์มจริง (`platform_admin`) → ตรวจ redirect (route guard อยู่ที่ `src/app/(main)/main-layout-client.tsx`)
3. ทำ user journey ที่ feature แตะ → screenshot ก่อน/หลังแก้
4. ดู console error + network request ผ่าน DevTools Protocol
5. Fail → อ่าน log backend คู่กัน (`.dev-run/0/logs/*.log`) หา root cause ข้ามสแตก

### Verify ระดับ package

```bash
cd frontend/backoffice-next
npm run lint && npm test && npm run build   # biome + vitest + next build
```

Coding standard ของ frontend (stack, folder structure, state, auth, styling) อยู่ที่ [`coding-standard/frontend/backoffice/`](../coding-standard/frontend/backoffice/) — อัปเดตให้ตรงกับ `backoffice-next` แล้ว

**ยังเป็น gap:** ยังไม่มี E2E suite สำหรับ `backoffice-next` — `frontend-checks` (legacy Vite) ถูกถอดออกจาก `.github/workflows/ci-check.yml` แล้ว (2026-07-08) เหลือแค่ `frontend-next-checks`

---

## อ่านต่อ

| หัวข้อ | ลิงก์ |
|--------|-------|
| แนวคิด + skills ↔ harness | [README.md](./README.md) |
| หลักการ | [core-beliefs.md](./core-beliefs.md) |
| กฎเชิงกลไก | [golden-principles.md](../docs/golden-principles.md) |
| Slash commands ทั้งหมด | [.claude/USAGE.md](../.claude/USAGE.md) (Cursor: [.cursor/USAGE.md](../.cursor/USAGE.md)) |
| Deploy ละเอียด | [docs/deploy/digitalocean.md](../docs/deploy/digitalocean.md) |

---

*อัปเดต: 2026-07-08 — §11 ย้ายไปอ้างอิง `backoffice-next` (Next.js), เพิ่ม `.claude/` คู่กับ `.cursor/`*
