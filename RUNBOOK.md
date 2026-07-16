# RUNBOOK — Agent template operations

คู่มือปฏิบัติการสำหรับ **ai-agent-template** — repo skeleton สำหรับ agent workflows (ไม่มี application stack ในตัว)

สารบัญ agent: [AGENTS.md](AGENTS.md) · ภาพรวม repo: [README.md](README.md)

---

## First-time setup

หลัง clone หรือ fork template:

```bash
# 1. Sync agent-skills → .cursor/ + references/
./scripts/agent/sync-agent-skills.sh

# 2. ตรวจโครงสร้าง skeleton
node scripts/ci/docs-lint.mjs
```

จากนั้นเติมโค้ดใน `code-base/` และเอกสารใน `docs/` ตามโปรเจกต์ (ดูด้านล่าง)

---

## Layout

| Path | Role |
|------|------|
| [`code-base/`](code-base/README.md) | โค้ดแอป — `backend/`, `frontend/` (ว่างใน template) |
| `docs/` | specs, exec-plans, releases, golden principles (ว่างใน template) |
| `.cursor/` | skills, commands, agents, rules (generated + local) |
| `scripts/agent/` | sync upstream + local overrides |
| `references/` | agent checklists (sync จาก upstream) |
| `coding-standard/` | org coding rules (empty — vendor after fork) |
| `knowledge/` | harness philosophy + testing standards |

Orchestration rule (Cursor): [.cursor/rules/agent-skills.mdc](.cursor/rules/agent-skills.mdc)

---

## Sync agent skills

```bash
./scripts/agent/sync-agent-skills.sh

# หรือใช้ local clone ของ upstream (เร็วกว่า ตอน dev standards)
./scripts/agent/sync-agent-skills.sh /path/to/agent-skills
```

รันหลัง clone, เมื่อ [agent-skills](https://github.com/addyosmani/agent-skills) อัปเดต, หรือหลังแก้ `scripts/agent/agent-skills-standards/`

**Sync ทับ:** `.cursor/skills/`, `.cursor/commands/`, `.cursor/agents/`, `.cursor/rules/`, `references/`

**ไม่ทับ (แก้ใน repo นี้):**

| Path | เนื้อหา |
|------|---------|
| `scripts/agent/local-skills/` | skills เฉพาะ template (`release-notes-and-handoff`, `harness-planning-conventions`) |
| `scripts/agent/local-commands/` | `/gc`, `/release`, `/plan`, `/build` |
| `scripts/agent/agent-skills-standards/` | Related Coding Standards ต่อ slash command |

แก้ local skill แล้ว restore อย่างเดียว:

```bash
./scripts/agent/sync-local-agent-skills.sh
```

รายละเอียดสคริปต์: [scripts/README.md](scripts/README.md)

---

## Add application code and docs

Template เริ่มว่าง — bootstrap ตามลำดับนี้:

1. **Backend** → `code-base/backend/`
2. **Frontend** → `code-base/frontend/`
3. **Specs** → `docs/specs/` (what to build)
4. **Exec plan** → `docs/exec-plans/active/<slug>.md` ก่อน `/build`
5. **Optional** → `docs/golden-principles.md`, `docs/releases/` เมื่อโปรเจกต์โตขึ้น

เมื่อมี packages แล้ว เพิ่ม harness ของโปรเจกต์เอง (dev scripts, smoke, `npm run ci`) — template ไม่ ship stack runner ให้

---

## Verify

```bash
node scripts/ci/docs-lint.mjs
```

GitHub Actions: [.github/workflows/ci-check.yml](.github/workflows/ci-check.yml) — รัน `docs-lint` บน PR/push

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

Slash commands: [.cursor/USAGE.md](.cursor/USAGE.md)

**กฎ:** มี skill ตรง → อ่าน `.cursor/skills/<name>/SKILL.md` ให้ครบ ห้าม improvise workflow

---

## อ่านต่อ

| หัวข้อ | ลิงก์ |
|--------|-------|
| Agent map | [AGENTS.md](AGENTS.md) |
| Harness แนวคิด | [knowledge/harness/README.md](knowledge/harness/README.md) |
| Testing standards | [knowledge/README.md](knowledge/README.md) |
