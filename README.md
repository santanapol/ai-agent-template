# access-platform

เอกสารในโฟลเดอร์นี้เป็นชุดอ้างอิงสำหรับ **บริการที่เกี่ยวข้องกันในระดับ repo** (`access/gateway`, `access/auth`, และ **`access/reference`** — upstream อ้างอิงหลัง gateway: **`GET /api/v1/me`** + CRUD **`/api/v1/items`**)

> **TL;DR:** Client รับ JWT จาก **auth** แล้วเรียก **gateway** ด้วย Bearer token; **gateway** verify JWT, inject headers และ proxy ไป upstream (**[`reference`](./access/reference/README.md)**, [`smart-report`](../smart-report/) ตาม `ROUTES_JSON`)

---

## 🗺️ โครงสร้างเอกสาร (Document Map)

คำแนะนำ: ควรอ่าน **ARCHITECTURE.md** ก่อน เพื่อให้เข้าใจภาพรวม จากนั้นจึงเลือกอ่าน Source of Truth (SoT) ตามบทบาทที่เกี่ยวข้อง

| ลำดับ / เอกสาร | บทบาทและรายละเอียด (Role & Outcome) |
|---|---|
| **1. ภาพรวมระบบ**<br/>[ARCHITECTURE.md](./ARCHITECTURE.md) | Architecture, ADR, trust boundary, system flow และ diagrams |
| **2. Gateway SoT**<br/>[`access/gateway/docs/architecture.md`](./access/gateway/docs/architecture.md) | Contract, env, runtime, lifecycle และ deployment ของ Gateway (Production SoT) |
| **3. Login / Auth SoT**<br/>[`access/auth/docs/architecture.md`](./access/auth/docs/architecture.md) | JWT issuance, login, refresh token, token storage และ security |
| **4. Reference upstream (`reference`)**<br/>[`access/reference/README.md`](./access/reference/README.md) | ตัวอย่าง Express + Mongo หลัง gateway — **`/api/v1/me`**, **`/api/v1/items`**, และ catch-all **`/api`** → upstream `:3003` (ดู [`access/gateway/.env.example`](./access/gateway/.env.example) `ROUTES_JSON`) |
| **5. คู่มือปฏิบัติการ**<br/>[RUNBOOK.md](./RUNBOOK.md) | การปฏิบัติงานระดับ Monorepo: ตั้งค่า E2E, รันบริการ, Troubleshooting และ [ChecklistDeploy JWT/Env](./RUNBOOK.md#deploy-jwt-env) |
| **6. บันทึกการอัปเดต**<br/>[CHANGELOG.md](./CHANGELOG.md) | Release notes ระดับ Repository |

---

## 🔗 การเชื่อมโยงกับโปรเจกต์อื่นใน Workspace

- **Internal Mesh:** บริการอื่นๆ ที่ทำงานอยู่หลัง Gateway เช่น [`smart-report`](../smart-report/) ให้ยึดมาตรฐานตาม [`_coding-standards/backend/`](./_coding-standards/backend/README.md)
- **กฎการอ้างอิงมาตรฐาน:** ดูกฎการเลือก SoT (Source of Truth) สั้นๆ ได้ที่ [`_coding-standards/README.md`](./_coding-standards/README.md)
