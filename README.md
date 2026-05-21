# zero-platform

API platform monorepo (auth, gateway, internal services) — identity and traffic enter through a single mesh boundary.

**GitHub:** [Chiang-Rai-Technology/zero-platform](https://github.com/Chiang-Rai-Technology/zero-platform) · `git@github-berlin:Chiang-Rai-Technology/zero-platform.git`

เอกสารในโฟลเดอร์นี้เป็นชุดอ้างอิงสำหรับ **บริการที่เกี่ยวข้องกันในระดับ repo** (`gateway`, `auth`, และ **`crud-service`** ใต้ **`services/.demo/`** — upstream ตัวอย่าง CRUD หลัง gateway: **`GET /api/v1/me`** + CRUD **`/api/v1/items`**)

> **TL;DR:** Client รับ JWT จาก **auth** แล้วเรียก **gateway** ด้วย Bearer token; **gateway** verify JWT, inject headers และ proxy ไป upstream (เช่น **[`crud-service`](./services/.demo/crud-service/README.md)**, **`staff`**) ตาม [`gateway/routes.json`](./gateway/routes.json)

---

## 🗺️ โครงสร้างเอกสาร (Document Map)

คำแนะนำ: ควรอ่าน **ARCHITECTURE.md** ก่อน เพื่อให้เข้าใจภาพรวม จากนั้นจึงเลือกอ่าน Source of Truth (SoT) ตามบทบาทที่เกี่ยวข้อง

| ลำดับ / เอกสาร | บทบาทและรายละเอียด (Role & Outcome) |
|---|---|
| **1. โครงสร้างโฟลเดอร์ (SoT)**<br/>[`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`service-tree.md`](../../_coding-standards/backend/service-tree.md) | ภาพรวม monorepo + layout package ตาม org std (gateway, auth, `services/.demo/crud-service`, services) |
| **1b. พอร์ต local (ดัชนีกลาง)**<br/>[`local-ports.md`](./local-ports.md) | ตาราง **default PORT** ต่อ service (`auth` :3001, `gateway` :3002, upstream ตัวอย่าง ฯลฯ) — อัปเดตเมื่อเพิ่มบริการ |
| **1c. Redis (local dev)**<br/>[`docker-compose.yml`](./docker-compose.yml) | Redis สำหรับ **`token_gen`** (auth publish + gateway verify) — ดู [RUNBOOK §2.5](./RUNBOOK.md#25--redis-local--token_gen--immediate-revoke) |
| **2. ภาพรวมระบบ**<br/>[ARCHITECTURE.md](./ARCHITECTURE.md) | Architecture, ADR, trust boundary, system flow และ diagrams |
| **3. Gateway SoT**<br/>[`gateway/docs/architecture.md`](./gateway/docs/architecture.md) | Contract, env, runtime, lifecycle และ deployment ของ Gateway (Production SoT) |
| **4. Login / Auth SoT**<br/>[`auth/docs/architecture.md`](./auth/docs/architecture.md) | JWT issuance, login, refresh token, token storage และ security |
| **5. CRUD sample (`services/.demo/crud-service`)**<br/>[`crud-service/README.md`](./services/.demo/crud-service/README.md) | ตัวอย่าง Express + Mongo หลัง gateway — **`/api/v1/me`**, **`/api/v1/items`** → `:3003` (ดู [`gateway/routes.json`](./gateway/routes.json)) |
| **6. คู่มือปฏิบัติการ**<br/>[RUNBOOK.md](./RUNBOOK.md) | การปฏิบัติงานระดับ Monorepo: ตั้งค่า E2E, รันบริการ, Troubleshooting และ [ChecklistDeploy JWT/Env](./RUNBOOK.md#deploy-jwt-env) |
| **7. บันทึกการอัปเดต**<br/>[CHANGELOG.md](./CHANGELOG.md) | Release notes ระดับ Repository |

---

## 🔗 การเชื่อมโยงกับโปรเจกต์อื่นใน Workspace

- **Internal Mesh:** บริการอื่นๆ ที่ทำงานอยู่หลัง Gateway (เช่น **`staff`**) ให้ยึดมาตรฐานตาม [`_coding-standards/backend/`](../../_coding-standards/backend/README.md)
- **กฎการอ้างอิงมาตรฐาน:** ดูกฎการเลือก SoT (Source of Truth) สั้นๆ ได้ที่ [`_coding-standards/README.md`](../../_coding-standards/README.md)
