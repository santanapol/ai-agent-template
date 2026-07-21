# Core beliefs — ai-agent-template harness

หลักการที่กำหนด **วิธีทำงาน** ของ repo นี้ — อ่านก่อน implement หรือออกแบบ workflow ใหม่

อ้างอิงแนวคิดจาก [openai-com-index-harness-engineering.md](./sources/openai-com-index-harness-engineering.md)

---

## 1. Humans steer. Agents execute.

- มนุษย์: กำหนด intent, acceptance criteria, trade-off, GO/NO-GO
- Agent: อ่าน context ใน repo → implement → verify → iterate → เปิด PR
- เมื่อ agent ติด **ไม่ใช่** "ลองใหม่" — ถามว่า **capability อะไรขาด** แล้ว encode เป็น doc, lint, หรือ script

## 2. Repository คือ system of record

- Slack, Google Docs, ความรู้ในหัว = **illegible** ต่อ agent
- สิ่งที่ agent ใช้ได้: markdown, spec, OpenAPI, exec plans, lint, scripts ใน repo
- การตัดสินใจสำคัญ → เขียนลง `docs/` หรือ `harness/knowledge/harness/` ก่อนลงมือ

## 3. Progressive disclosure — แผนที่ ไม่ใช่สารานุกรม

- [AGENTS.md](../../../AGENTS.md) = สารบัญ
- ลึกตามงาน: spec → coding-standard (เมื่อ vendor) → skill → runbook
- ห้ามยัด rule ทั้ง repo ลง prompt เดียว

## 4. Harness + Agent Skills = สองชั้นที่ต้องใช้คู่กัน

| ชั้น | คืออะไร | อยู่ที่ไหน |
|------|---------|-----------|
| **Harness** | สภาพแวดล้อม, feedback loop, guardrails, tooling | `code-base/`, `docs/`, `scripts/`, CI |
| **Agent Skills** | กระบวนการ SDLC, วิธีคิดต่อ phase | `.cursor/skills/`, slash commands, subagents |

- Skill บอก **ทำอย่างไร** — harness ทำให้ **ทำได้จริงและตรวจได้**
- ไม่มี skill ที่ตรง → อย่า improvise workflow ยาว ๆ — ใช้ `interview-me` / `idea-refine` หรือถามมนุษย์

## 5. Enforce invariants, not implementations

- บังคับ boundary, trust model, response envelope, logging — ไม่บังคับ style ละเอียด
- กฎเชิงกลไก: `docs/golden-principles.md` (สร้างเมื่อเริ่มโปรเจกต์)
- เมื่อ doc ไม่พอ → promote เป็น lint / CI (error message มี remediation ให้ agent)

## 6. Feedback loop ต้องปิดวงจร

Agent ต้อง **เห็นผล** ของงานตัวเองโดยไม่พึ่ง copy-paste จากมนุษย์:

- Package CI: `npm run ci` ใน `code-base/`
- Docs gate: `node harness/scripts/ci/docs-lint.mjs`
- เพิ่ม dev/smoke scripts ตามโปรเจกต์เมื่อมีแอปจริง

## 7. Throughput เปลี่ยนปรัชญา merge

- PR สั้น, แก้ follow-up ได้ — ใน harness ที่ agent throughput สูง การรอ gate ที่แก้ทีหลังได้แพงกว่าการ merge แล้วแก้
- ยังมี gate ที่ห้ามข้าม: security, trust boundary, spec alignment

## 8. Garbage collection ต่อเนื่อง

- Agent replicate pattern ใน repo — รวม pattern ที่ไม่ดี → drift
- `/gc` เป็นรอบ: scan drift, อัปเดต `docs/QUALITY_SCORE.md`, แก้เล็ก ๆ
- Tech debt บันทึกใน `docs/exec-plans/tech-debt-tracker.md`

## 9. Agent legibility เป็นเป้าหมายออกแบบ

- โครงสร้าง repo, ชื่อไฟล์, layer architecture — ออกแบบให้ agent อ่านแล้ว reason ได้
- Vendor `coding-standard/` หลัง fork เป็น reference สำหรับ layout และ patterns

---

*เมื่อ belief ขัดกับโค้ดจริง — แก้โค้ดหรืออัปเดต belief แล้ว encode ใน lint*
