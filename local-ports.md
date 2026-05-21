# Local dev ports (zero-platform)

เอกสารนี้เป็น **ดัชนีกลาง** สำหรับพอร์ต HTTP ที่ใช้บนเครื่องพัฒนา (local) เท่านั้น — production อาจใช้ reverse proxy, service mesh หรือ port mapping อื่น

**SoT ของค่า `PORT` จริง:** ยังอยู่ที่ **`*/.env.example`** (และ `.env` บนเครื่อง) ของแต่ละแพ็กเกจ — ถ้าเปลี่ยนพอร์ตใน env ให้อัปเดต **ไฟล์นี้** และ **`gateway`** `ROUTES_JSON` / `routes.json` ให้สอดคล้องกัน

เมื่อเพิ่ม service ใหม่: เพิ่มแถวในตารางด้านล่าง + อัปเดต `.env.example` ของแพ็กเกจนั้น + ถ้าเป็น upstream ของ gateway ให้แก้ `gateway/.env.example` / `gateway/routes.json` ตามนโยบายทีม

---

## HTTP services (defaults in repo)

| Service / role | Default `PORT` | Package / path | Notes |
|----------------|----------------|----------------|-------|
| **auth** | **3001** | [`auth/`](./auth/) | JWKS: `http://127.0.0.1:3001/.well-known/jwks.json` — `gateway` ตั้ง `JWT_JWKS_URL` ให้ตรง |
| **gateway** | **3002** | [`gateway/`](./gateway/) | Entry สำหรับ client ที่ยิง API ผ่าน proxy |
| **crud-service** (demo upstream) | **3003** | [`services/.demo/crud-service/`](./services/.demo/crud-service/) | ตัวอย่างใน [`gateway/.env.example`](./gateway/.env.example) `ROUTES_JSON` / [`gateway/routes.json`](./gateway/routes.json) |
| **staff** | **3004** | [`services/staff/`](./services/staff/) | [`gateway/routes.json`](./gateway/routes.json) — `/api/v1/staff` → `:3004` |

## Dependencies (not repo HTTP services)

| Name | Default port | Notes |
|------|--------------|-------|
| **MongoDB** | **27017** | ใช้ร่วมกันโดย `auth`, upstream ตัวอย่าง ฯลฯ — connection string อยู่ใน `.env.example` ของแต่ละแพ็กเกจ |
| **Redis** | **6379** | `token_gen` publish (auth) + verify (gateway) — รัน local ด้วย [`docker-compose.yml`](./docker-compose.yml); **`REDIS_URL`** ใน `auth` + `gateway` `.env` ต้องตรงกัน (`redis://127.0.0.1:6379/0`) |

---

## Related

- [RUNBOOK.md](./RUNBOOK.md) — ลำดับรัน terminal และ smoke `curl`
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — ภาพรวม monorepo · package layout: [`service-tree.md`](../../_coding-standards/backend/service-tree.md) (workspace SoT)
