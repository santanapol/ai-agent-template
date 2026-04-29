# _coding-standards

**Upstream (GitHub):** [`santanapol/coding-standards`](https://github.com/santanapol/coding-standards)

สำเนาใน monorepo นี้วางที่ **root ของ `access-platform`** คู่กับบริการใน [`access/`](../access/) — ดัชนีและ flow ระดับ repo: [`README.md`](../README.md)

มาตรฐานการเขียนโค้ดและสัญญา API ภายในองค์กร — เก็บเป็น **เอกสาร (prose) + registry** เป็น Source of Truth (SoT)

## กฎเลือก SoT (สองขอบหลัก)

ใช้กฎสั้น ๆ นี้เลือกโฟลเดอร์มาตรฐานก่อนลงมือออกแบบหรือ review โค้ด:

- **HTTP ที่รับหลัง API gateway แล้ว** (มีสัญญา `x-gateway-secret`, envelope, tenant headers ฯลฯ) → **`backend/`** ([`backend/README.md`](./backend/README.md), [`backend/api.md`](./backend/api.md) เป็นจุดเข้า)
- **บริการ identity / token ที่ client หรือ mesh เรียกโดยตรง** (login, refresh, JWKS ฯลฯ — ไม่ใช่สัญญา internal envelope หลัง gateway) → **`auth/`** ([`auth/README.md`](./auth/README.md))
- **ตัว gateway (reverse proxy, JWT ที่ขอบ, ตาราง route upstream)** → **`gateway/`** ([`gateway/README.md`](./gateway/README.md))

รายละเอียดความสัมพันธ์ backend ↔ auth มีในตารางที่ [`auth/README.md`](./auth/README.md) — หลีกเลี่ยงคัดลอกตารางยาวซ้ำที่นี่

## เริ่มที่ไหน

| บทบาท | ไปที่ |
| :--- | :--- |
| Backend / internal API (รวมถ้ายังไม่รู้ว่าอ่านอะไรก่อน) | [**`backend/README.md`**](./backend/README.md) — ตาราง “เริ่มที่ไหน”, layout, และลิงก์ไป [`backend/examples/`](./backend/examples/) |
| **Auth / identity / token (ขอบ client หรือ mesh)** | [**`auth/README.md`**](./auth/README.md) + [`auth/codes.yaml`](./auth/codes.yaml) — ESM เป็น default ที่อนุมัติสำหรับโฟลเดอร์นี้ (ดู `auth/runtime.md`) |
| **API Gateway (JWT, proxy, trusted headers)** | [**`gateway/README.md`**](./gateway/README.md) + [`gateway/codes.yaml`](./gateway/codes.yaml) — ESM เป็น default ที่อนุมัติสำหรับโฟลเดอร์นี้ (ดู `gateway/runtime.md`) |

โฟลเดอร์ domain อื่นเพิ่มได้ตามอนาคต (เช่น frontend, infra) โดยใช้รูปแบบเดียวกัน: README ระดับโฟลเดอร์เป็น index

### Registry หลายไฟล์ (`code` ไม่ให้ชนกัน)

- [`backend/codes.yaml`](./backend/codes.yaml) — SoT รหัสของ **internal API** + สัญญา **gateway → service** (`MISSING_GATEWAY_SECRET`, …)
- [`auth/codes.yaml`](./auth/codes.yaml) — SoT รหัสที่ **client/mesh เห็นจาก auth** (login, refresh, …)
- [`gateway/codes.yaml`](./gateway/codes.yaml) — SoT รหัสที่ **client/hop เห็นจาก gateway** (JWT ขอบ, upstream, …)

ก่อนเพิ่ม `code` ใหม่: ค้นซ้ำทั้งสามไฟล์; ห้ามใช้ key เดียวกันเมื่อคู่ HTTP ↔ ความหมายขัดกัน — รายละเอียดกฎดูหัว [`backend/codes.yaml`](./backend/codes.yaml)