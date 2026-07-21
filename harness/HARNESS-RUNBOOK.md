# Harness runbook — ai-agent-template operations

คู่มือปฏิบัติการสำหรับ **ai-agent-template** — repo skeleton สำหรับ agent workflows (ไม่มี application stack ในตัว)

สารบัญ agent: [AGENTS.md](../AGENTS.md) · ภาพรวม repo: [README.md](../README.md)

---

## First-time setup

หลัง clone หรือ fork template เปิดใน Cursor แล้วรัน:

```text
/setup
```

Agent จะถามทีละข้อ (layout, ชื่อโปรเจกต์, path โค้ด, sync skills) แล้ว setup ให้พร้อม `/spec`

หรือทำมือ:

```bash
# 1. Sync agent-skills → .cursor/ + harness/references/
./harness/scripts/agent/sync-agent-skills.sh

# 2. ตรวจโครงสร้าง skeleton
node harness/scripts/ci/docs-lint.mjs
```

จากนั้นเลือก layout และเติมโค้ดตาม [`harness.config.yaml`](../harness.config.yaml) — ดู [knowledge/harness/adopt.md](knowledge/harness/adopt.md)

Skill: `harness-bootstrap` · Command: `/setup`

Optional during setup: Vercel [React/Next.js](https://vercel.com/docs/agent-resources/skills#react-and-next.js) + [Design/UI](https://vercel.com/docs/agent-resources/skills#design-and-ui) skills → sets `optional_skills.vercel_react_ui: true` and runs `./harness/scripts/agent/install-optional-skills.sh`

---

## Code layout

```bash
# Greenfield (default) — code under code-base/
./harness/scripts/agent/set-code-layout.sh code-base

# Brownfield — existing backend/, frontend/ at repo root
./harness/scripts/agent/set-code-layout.sh root
```

| `layout` | Application code |
|----------|------------------|
| `code-base` | `code-base/backend/`, `code-base/frontend/` |
| `root` | `backend/`, `frontend/` (หรือแก้ path ใน config) |

Workflow docs (`docs/specs/`, `docs/exec-plans/`) เหมือนกันทั้งสองแบบ

---

## Layout

| Path | Role |
|------|------|
| [`harness.config.yaml`](../harness.config.yaml) | code layout profile (`code-base` \| `root`) |
| [`code-base/`](../code-base/README.md) | โค้ดแอปเมื่อ `layout: code-base` |
| [`docs/`](../docs/README.md) | product specs, exec-plans, releases (SDLC) |
| [`harness/`](../harness/README.md) | harness runbook, knowledge, references, scripts |
| `.cursor/` | skills, commands, agents, rules (generated + local) |
| `coding-standard/` | org coding rules — see [coding-standard/README.md](../coding-standard/README.md) |
| [knowledge/harness/adopt.md](knowledge/harness/adopt.md) | code layout greenfield vs brownfield |

Orchestration rule (Cursor): [.cursor/rules/agent-skills.mdc](../.cursor/rules/agent-skills.mdc)

---

## Sync agent skills

```bash
./harness/scripts/agent/sync-agent-skills.sh

# หรือใช้ local clone ของ upstream (เร็วกว่า ตอน dev standards)
./harness/scripts/agent/sync-agent-skills.sh /path/to/agent-skills
```

รันหลัง clone, เมื่อ [agent-skills](https://github.com/addyosmani/agent-skills) อัปเดต, หรือหลังแก้ `harness/scripts/agent/agent-skills-standards/`

**Sync ทับ:** `.cursor/skills/`, `.cursor/commands/`, `.cursor/agents/`, `.cursor/rules/`, `harness/references/`

**ไม่ทับ (แก้ใน repo นี้):**

| Path | เนื้อหา |
|------|---------|
| `harness/scripts/agent/local-skills/` | skills เฉพาะ template |
| `harness/scripts/agent/local-commands/` | `/setup`, `/spec`, `/gc`, `/release`, `/plan`, `/build` |
| `harness/scripts/agent/agent-skills-standards/` | Related Coding Standards ต่อ slash command |

แก้ local skill แล้ว restore อย่างเดียว:

```bash
./harness/scripts/agent/sync-local-agent-skills.sh
```

รายละเอียดสคริปต์: [harness/README.md](README.md)

---

## Add application code and docs

Template เริ่มว่าง — bootstrap ตาม [`harness.config.yaml`](../harness.config.yaml):

1. **Backend** → `code.backend` (default `code-base/backend/` or `backend/`)
2. **Frontend** → `code.frontend` (default `code-base/frontend/` or `frontend/`)
3. **Specs** → `docs/specs/<slug>.md` (ห้าม root `SPEC.md`, `docs/SPEC.md`, `spec/`)
4. **Exec plan** → `docs/exec-plans/active/<slug>.md` ก่อน `/build`
5. **Optional** → `docs/golden-principles.md`, `docs/releases/` เมื่อโปรเจกต์โตขึ้น

เมื่อมี packages แล้ว เพิ่ม harness ของโปรเจกต์เอง (dev scripts, smoke, `npm run ci`) — template ไม่ ship stack runner ให้

---

## Verify

```bash
node harness/scripts/ci/docs-lint.mjs
```

GitHub Actions: [.github/workflows/ci-check.yml](../.github/workflows/ci-check.yml) — รัน `docs-lint` บน PR/push

---

## SDLC (Cursor)

```
/spec → /plan → /build → /test → /review → /code-simplify → /ship → /release
                                                          ↘ /gc
```

| Phase | เริ่มที่ |
|-------|----------|
| คำขอคลุมเครือ | skill `interview-me` หรือ `idea-refine` |
| Feature ใหม่ | `/spec` → `/plan` → `/build` |
| งานเล็กใน service เดิม | อ่าน spec + `npm run ci` ใน package ที่แก้ |
| ก่อน merge | `/ship` (GO/NO-GO) |
| หลัง ship GO | `/release` → `docs/releases/` + docs-lint |
| รอบทำความสะอาด | `/gc` |

อ่าน workflow ละเอียด: [knowledge/harness/workflows.md](knowledge/harness/workflows.md)

Slash commands: [.cursor/USAGE.md](../.cursor/USAGE.md)

**กฎ:** มี skill ตรง → อ่าน `.cursor/skills/<name>/SKILL.md` ให้ครบ ห้าม improvise workflow

---

## อ่านต่อ

| หัวข้อ | ลิงก์ |
|--------|-------|
| Agent map | [AGENTS.md](../AGENTS.md) |
| Harness แนวคิด | [knowledge/harness/README.md](knowledge/harness/README.md) |
