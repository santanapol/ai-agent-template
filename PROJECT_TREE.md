# PROJECT_TREE.md — Source of Truth (access-platform layout)

เอกสารนี้เป็น Source of Truth สำหรับโครงสร้างโฟลเดอร์หลักของ repository **access-platform** (monorepo สำหรับ access stack)

ไฟล์นี้อยู่ที่ **root ของ repo `access-platform`** (track ใน Git ของ repo นี้)

อัปเดต: **2026-05-14** — [`local-ports.md`](./local-ports.md) อยู่ที่ root (ดัชนี PORT local dev) · บันทึก **legacy `access/`** (§1.2); layout รากยังเป็น **`auth/`**, **`gateway/`**, **`.demo/crud-service/`**, **`www/`** เหมือนเดิม · **2026-05-12** — โฟลเดอร์ **`services/`** อยู่ใน workspace แต่ **ไม่ถูก track** โดย Git ของ repo นี้ (ดู [`.gitignore`](./.gitignore))

เอกสารอื่นใน repo เดียวกัน: [`README.md`](./README.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`RUNBOOK.md`](./RUNBOOK.md) · [`local-ports.md`](./local-ports.md) (ดัชนี **PORT** สำหรับ local dev)

## 1. Layout (relative to repo root)

```text
.
├── README.md              # ภาพรวม repo, document map, ลิงก์ SoT ต่อบทบาท
├── PROJECT_TREE.md        # เอกสารนี้ — SoT โครงสร้างโฟลเดอร์หลัก
├── local-ports.md         # ดัชนี default PORT (local dev) — อัปเดตเมื่อเพิ่มบริการ
├── ARCHITECTURE.md        # ภาพรวมระบบ, ADR, trust boundary, diagrams
├── RUNBOOK.md             # ปฏิบัติการ monorepo, E2E, deploy checklist
├── CHANGELOG.md           # release notes ระดับ repo
├── .gitignore             # รวม ignore ของ monorepo (เช่น services/, node_modules)
├── gateway/               # API gateway (Fastify) — SoT ใน gateway/docs/
│   ├── routes.json        # ตาราง prefix → upstream (ค่า default ใน repo)
│   ├── docs/              # OpenAPI + architecture
│   ├── src/
│   └── scripts/           # เช่น try-proxy
├── auth/                  # login / JWT (Fastify) — SoT ใน auth/docs/
├── .demo/                 # ตัวอย่าง / teaching — ไม่ถือเป็น production tier
│   └── crud-service/      # upstream CRUD หลัง gateway (Express + Mongo, :3003) — เอกสารแพ็กเกจ: README.md ในโฟลเดอร์นี้
├── services/              # บริการเสริมหลัง gateway (เช่น members) — **gitignored ใน repo นี้**
│   └── (local only)       # ดู [.gitignore](./.gitignore) — clone/bootstrap ตามทีม
└── www/                   # web / app / docs
    ├── app/               # frontend (Vite/React)
    └── docs/              # เอกสารเว็บ / release notes ฝั่ง frontend
```

ตัวอย่าง upstream CRUD: [`.demo/crud-service/README.md`](./.demo/crud-service/README.md)

### 1.1 `.demo/crud-service` — โครง `src/` (domain vs observability)

- **Domain / HTTP modules:** เฉพาะ **`src/modules/items/`** และ **`src/modules/me/`** (ไม่มี modules อื่นในแพ็กเกจนี้)
- **Observability:** **`src/observability/`** — เช่น Prometheus registry, HTTP metrics middleware, ตัวช่วยรายงาน latency (เทสอยู่ใต้ `src/observability/tests/`)

### 1.2 Legacy `access/` tree (**ห้ามใช้เป็น canonical**)

**ที่มา:** ในอดีต Git ของ repo นี้ track แพ็กเกจภายใต้ prefix เดียว เช่น `access/auth/`, `access/gateway/`, `access/reference/`, `access/www/` (monorepo แบบซ้อนโฟลเดอร์) — ก่อนยกระดับมาเป็นแพ็กเกจที่ **root** ตามแผนภูมิใน §1

**สถานะปัจจุบัน:** โฟลเดอร์ **`access/`** ถูกลบออกจากการ version control แล้ว (layout มาตรฐานคือ `auth/`, `gateway/`, `www/` ที่ root เท่านั้น)

**คำเตือน:** อย่าเปิด PR ที่สร้าง `access/...` กลับมาแทน root packages — ถ้าเห็นโฟลเดอร์ `access/` โผล่บนเครื่องหลัง `git checkout` แบบเจาะ path หรือ sparse checkout ของ commit เก่า ให้ถือว่าเป็น **artifact** แล้วลบทิ้ง แล้วใช้ **`auth/src/...`** (ไม่ใช่ `access/auth/src/...`)

## 2. โฟลเดอร์ที่ไม่ใช่ SoT (สร้างจาก tooling)

รายการต่อไปนี้มักถูกสร้างโดย `npm install`, build, หรือ test — **ไม่**ต้องถือเป็น canonical layout:

- `**/node_modules/`, `**/coverage/`, `**/dist/`, `**/playwright-report/`, `**/test-results/`

อ้างอิง ignore ตาม `.gitignore` ของแต่ละ package และของ root monorepo

## 3. ความสัมพันธ์กับ workspace แม่ (`ai-agent`)

เมื่อ clone ไว้ภายใต้ workspace แม่แบบ `project-active/access-platform/` (โฟลเดอร์ `project-active/` ถูก ignore ใน repo แม่):

- โครงสร้าง workspace รวม: [`WORKSPACE_TREE.md`](../../WORKSPACE_TREE.md)
- การตั้งค่า clone: [`.gitignore`](../../.gitignore) · [`scripts/bootstrap-active-repo.sh`](../../scripts/bootstrap-active-repo.sh)

ถ้า clone **เฉพาะ** repo `access-platform` แยกต่างหาก ให้ใช้เอกสารนี้และ [`README.md`](./README.md) เป็นหลัก — ลิงก์ในหัวข้อนี้ใช้ได้เมื่อ path บนเครื่องตรงกับ layout ด้านบน

## 4. คำสั่งอ้างอิง (สร้าง tree จริงบนเครื่อง)

จาก root ของ repo `access-platform`:

```bash
cd "$(git rev-parse --show-toplevel)" 2>/dev/null || exit 1
find . -maxdepth 4 \
  \( -path './.git' -o -path './.git/*' -o -path '*/node_modules' -o -path '*/node_modules/*' \) -prune -o -type d -print
```

ปรับ `-maxdepth` หรือ `-path` ตามที่ต้องการ drill ลึกขึ้น — **`maxdepth` 4** ช่วยให้เห็น `.demo/crud-service/` โดยไม่ต้องเดา path
