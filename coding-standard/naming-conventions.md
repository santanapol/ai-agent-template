# Naming Conventions

กติกาการตั้งชื่อไฟล์และโฟลเดอร์ที่ใช้ร่วมกันทุกโซน (backend, frontend, docs, scripts) — เมื่อโค้ดกับกติกาขัดกัน ให้แก้โค้ดหรืออัปเดตกติกานี้ อย่าปล่อยให้ drift

## หลักการทั่วไป

| กติกา | รายละเอียด |
| :--- | :--- |
| **Default = kebab-case** | โฟลเดอร์และไฟล์ทั่วไปใช้ `kebab-case` เว้นแต่มีข้อยกเว้นตามประเภทด้านล่าง |
| **ชื่อ feature ตรงกันทั้ง stack** | feature เดียวกันต้องสะกดเหมือนกันทุกที่ เช่น `branch-report` ใน `backend/service/`, `docs/specs/`, และโฟลเดอร์ feature ฝั่ง frontend |
| **ห้าม snake_case และ space** | ยกเว้นไฟล์ที่เครื่องมือภายนอก generate และบังคับชื่อ |
| **ไฟล์ generate ครั้งเดียว / log** | ห้าม commit (เช่น `test-output.log`) — เพิ่มใน `.gitignore` |

## Backend

| ประเภท | กติกา | ตัวอย่าง |
| :--- | :--- | :--- |
| โฟลเดอร์ service | `kebab-case` | `agent-invoice/`, `branch-report/`, `smart-report/` |
| ไฟล์ใน module | `<feature>.<layer>.js` | `profiles.controller.js`, `profiles.repository.js`, `profiles.route.js`, `profiles.schema.js`, `profiles.service.js` |
| โฟลเดอร์ module | `kebab-case` (พหูพจน์ตาม resource) | `modules/profiles/` |
| Test | ชื่อไฟล์ที่ test + `.test.js` ใน `tests/` ของ module | `tests/profiles.service.test.js` |
| Shared packages | `kebab-case` | `shared/fastify-metrics/`, `shared/platform-roles/` |

รูปแบบ `<feature>.<layer>.js` เป็นข้อบังคับ เพราะทำให้ค้นหาทั้ง layer ได้ด้วย glob เดียว (`*.repository.js`) — ดูรายละเอียด layer ที่ [backend/02-folder-structure.md](backend/202-folder-structure.md)

## Frontend (backoffice)

| ประเภท | กติกา | ตัวอย่าง |
| :--- | :--- | :--- |
| ไฟล์ React component / page | `PascalCase.tsx` | `StaffDrawer.tsx`, `MyProfile.tsx`, `Error403.tsx` |
| โฟลเดอร์ feature ใน `components/`, `views/` | `kebab-case` | `components/branch-report/`, `views/agent-fees/` |
| Hooks | `useXxx.ts` (camelCase ตามชื่อ hook) | `usePermission.ts`, `useAppFeedback.ts` |
| Utilities ใน `lib/`, `types/` | `camelCase.ts` | `adminApiUtils.ts`, `types/auth.ts` |
| Test | ชื่อเดียวกับไฟล์ที่ test + `.test` | `StaffTable.test.tsx`, `usePermission.test.ts` |
| **ข้อยกเว้น:** `components/ui/` (shadcn) | `kebab-case.tsx` ตามที่ CLI generate — ห้าม rename | `data-table.tsx`, `loading-button.tsx` |

ห้ามตั้งชื่อไฟล์ view ว่า `index.tsx` (ยกเว้น Next.js App Router `page.tsx`/`layout.tsx` ซึ่งเป็นชื่อบังคับของ framework) — ดู [frontend/backoffice/03-routing-and-pages.md](frontend/backoffice/03-routing-and-pages.md)

## เอกสาร (docs, specs)

| ประเภท | กติกา | ตัวอย่าง |
| :--- | :--- | :--- |
| เอกสารทั่วไป | `kebab-case.md` | `golden-principles.md`, `tech-debt-tracker.md` |
| ไฟล์ประตูทางเข้า (entry point) ระดับ root / service / spec | `UPPERCASE.md` — จำกัดเฉพาะชุดนี้: `README`, `RUNBOOK`, `ARCHITECTURE`, `AGENTS`, `CHANGELOG`, `TESTING`, `WORKFLOW` | `backend/RUNBOOK.md`, `docs/specs/backend/staff/TESTING.md` |
| Spec หลักของ service | `<service>-spec.md` | `auth-spec.md`, `staff-spec.md` |
| เอกสารที่ผูกกับวันที่ (audit, plan ที่จบแล้ว) | ต่อท้ายด้วย `-YYYY-MM-DD` | `SPEC-CODE-AUDIT-2026-07-03.md` |
| ชุดเอกสารเรียงลำดับ (numbered series) | prefix เลข zero-pad สองหลัก `NN-` | `01-tech-stack.md` … `13-code-quality.md` |

## Scripts

| ประเภท | กติกา | ตัวอย่าง |
| :--- | :--- | :--- |
| Shell / Node scripts | `kebab-case` + prefix ตามกลุ่ม | `dev-up.sh`, `dev-obs-down.sh`, `docs-lint.mjs`, `generate-db-schema.mjs` |
| Script ใช้ครั้งเดียว | ห้าม commit ไว้ในโฟลเดอร์ service — ถ้าจำเป็นต้องเก็บ ให้ย้ายเข้า `scripts/` พร้อมคำอธิบายใน `scripts/README.md` | — |
