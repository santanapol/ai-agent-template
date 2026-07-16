# ตัวอย่างขั้นตอนการทำงาน (Workflows)

ตัวอย่าง step-by-step สำหรับ **ai-agent-template** — ใช้คู่กับ [README.md](./README.md) และ [core-beliefs.md](./core-beliefs.md)

สารบัญ:

1. [การเตรียมตัวครั้งแรก](#1-การเตรียมตัวครั้งแรก-onboarding)
2. [การ sync agent-skills](#2-การ-sync-agent-skills)
3. [เพิ่มโค้ดและเอกสาร](#3-เพิ่มโค้ดและเอกสาร)
4. [พัฒนาแบบเต็ม SDLC](#4-พัฒนาแบบเต็ม-sdlc)
5. [Garbage collection](#5-garbage-collection)

---

## 1. การเตรียมตัวครั้งแรก (onboarding)

ทำครั้งเดียวหลัง clone repo:

```bash
# 1. Sync agent-skills → .cursor/ + references/
./scripts/agent/sync-agent-skills.sh

# 2. ตรวจ skeleton
node scripts/ci/docs-lint.mjs
```

ลำดับการอ่านเอกสาร:

1. [AGENTS.md](../../AGENTS.md) — แผนที่ repo
2. [knowledge/harness/README.md](./README.md) — วิธีทำงาน
3. `coding-standard/` — placeholder สำหรับ org rules (vendor หลัง fork)

---

## 2. การ sync agent-skills

รันเมื่อ: clone ใหม่, upstream agent-skills อัปเดต, หรือแก้ `scripts/agent/agent-skills-standards/`

```bash
./scripts/agent/sync-agent-skills.sh
# หรือ
./scripts/agent/sync-agent-skills.sh /path/to/agent-skills
```

สิ่งที่เกิดขึ้น:

| ขั้น | ผลลัพธ์ |
|------|---------|
| Sync skills/agents/references | `.cursor/skills/`, `.cursor/agents/`, `references/` ถูกทับ |
| แปลง commands | upstream → `.cursor/commands/` + Related Coding Standards |
| Copy local commands | `scripts/agent/local-commands/*.md` → `.cursor/commands/` |
| Regenerate meta | `.cursor/rules/agent-skills.mdc`, `VENDOR.md`, `USAGE.md` |

**ต้องการแก้พฤติกรรม command?** แก้ที่ `scripts/agent/agent-skills-standards/<cmd>.md` แล้ว sync ใหม่ — **อย่าแก้** `.cursor/commands/` ตรง ๆ

---

## 3. เพิ่มโค้ดและเอกสาร

Template เริ่มต้นว่าง — เติมตามโปรเจกต์:

| สิ่งที่เพิ่ม | Path |
|-------------|------|
| Backend services | `code-base/backend/` |
| Frontend apps | `code-base/frontend/` |
| Product specs | `docs/specs/` |
| Exec plans | `docs/exec-plans/active/` |
| Release notes | `docs/releases/` |

เมื่อมีแอปแล้ว เพิ่ม harness ของโปรเจกต์เอง (dev scripts, CI, smoke) และ vendor `coding-standard/` ตาม org

---

## 4. พัฒนาแบบเต็ม SDLC

### Phase 1 — Define (`/spec`)

```
/spec <feature description>
```

Agent อ่าน `docs/specs/` (+ `coding-standard/` เมื่อ vendor แล้ว) แล้วเขียน/อัปเดต spec

### Phase 2 — Plan (`/plan`)

```
/plan จาก spec ที่เพิ่งอัปเดต
```

สร้าง plan ใน `docs/exec-plans/active/<slug>.md`

### Phase 3 — Build (`/build`)

```
/build ทำตาม plan ทีละ task
```

Implement ใน `code-base/` ตาม spec และ coding-standard (เมื่อมี)

### Phase 4 — Verify (`/test`)

```
/test
```

รัน package tests ใน services ที่แก้

### Phase 5 — Review + Simplify

```
/review
/code-simplify
```

### Phase 6 — Ship (`/ship`)

```
/ship
```

Fan-out subagents → GO/NO-GO

### Phase 7 — Release (`/release`)

```
/release
```

หลัง GO — เขียน `docs/releases/`, optional `CHANGELOG.md`, docs-lint, PR

---

## 5. Garbage collection

```
/gc
```

1. `node scripts/ci/docs-lint.mjs`
2. Scan drift ใน docs/exec-plans
3. แก้เป็น fix เล็ก ๆ

---

## อ่านต่อ

| หัวข้อ | ลิงก์ |
|--------|-------|
| แนวคิด | [README.md](./README.md) |
| หลักการ | [core-beliefs.md](./core-beliefs.md) |
| Slash commands | [.cursor/USAGE.md](../../.cursor/USAGE.md) |
| Agent ops | [RUNBOOK.md](../../RUNBOOK.md) |
