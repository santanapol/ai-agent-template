# Gateway standard (SoT)

มาตรฐานสำหรับ **API gateway** (verify JWT / session, ฉีด trusted header, proxy ไป upstream, rate limit ขอบ) — **prose ในโฟลเดอร์นี้ + `codes.yaml` = Source of Truth ของขอบ gateway**

ดัชนีชุดมาตรฐาน (`_coding-standards`): [`../README.md`](../README.md)

**Implementation ใน monorepo `access-platform`:** แพ็กเกจ [`access/gateway`](../../access/gateway/README.md) — SoT การ implement: [`docs/architecture.md`](../../access/gateway/docs/architecture.md)

## ความสัมพันธ์กับ `backend/`

| ขอบเขต | SoT |
| :--- | :--- |
| **สัญญา internal service หลัง gateway** (envelope, OpenAPI, `x-gateway-secret`, `x-user-*`) | [`../backend/`](../backend/) — [`../backend/api.md`](../backend/api.md) + [`../backend/codes.yaml`](../backend/codes.yaml) |
| **พฤติกรรม / รหัสผิดพลาดที่ client หรือ hop แรกเห็นจาก gateway** (JWT ไม่ผ่าน, upstream ล่ม, routing) | โฟลเดอร์นี้ + [`codes.yaml`](./codes.yaml) |
| **Observability (request id, redaction, metrics)** | หลักเดียวกับ [`../backend/observability.md`](../backend/observability.md) เว้นแต่ไฟล์นี้ระบุข้อยกเว้น |

## เริ่มที่ไหน

| ถ้าคุณ... | อ่านไฟล์ |
| :--- | :--- |
| **ตั้งค่าโปรเจกต์ / Node / ESM** | [`runtime.md`](./runtime.md) |
| **ออกแบบการ inject header / proxy / health ของ gateway** | [`api.md`](./api.md) + [`codes.yaml`](./codes.yaml) |
| **ลงทะเบียน `code` ใหม่ (edge gateway)** | [`codes.yaml`](./codes.yaml) แล้วอัปเดต [`api.md`](./api.md) |

## Layout

```
gateway/
├── README.md        (เอกสารนี้ — index)
├── runtime.md       (Node, ESM, env, lifecycle)
├── api.md           (JWT, trusted headers, upstream, health ของ gateway)
└── codes.yaml       (registry HTTP ↔ code เฉพาะขอบ gateway ที่ไม่ใช่ SoT ของ backend)
```

## Registry ข้าม repo

- **key ของ `code` ห้ามชนกันระหว่าง** [`../backend/codes.yaml`](../backend/codes.yaml), [`../auth/codes.yaml`](../auth/codes.yaml), และไฟล์นี้ เมื่อคู่ **HTTP ↔ ความหมาย** ขัดกัน — ดูกฎใน [`../backend/codes.yaml`](../backend/codes.yaml) หัวไฟล์ (uniqueness ข้ามสามไฟล์)
- รหัส **`MISSING_GATEWAY_SECRET`**, **`INVALID_GATEWAY_SECRET`**, **`MISSING_GATEWAY_USER_CONTEXT`**, **`INVALID_USER_CONTEXT`** — **เป็น SoT ที่ `backend/codes.yaml`** สำหรับการตอบจาก **internal API** เมื่อตรวจ secret/context; gateway อาจคืน HTTP 401/403 โดยไม่มี envelope เดียวกัน แต่ถ้ามี field `code` ใน body ต้องไม่ชนนิยามซ้ำโดยไม่ตั้งใจ (ปรึกษา `backend/codes.yaml`)

## Tag legend

สอดคล้อง [`../backend/README.md` → Tag legend](../backend/README.md#tag-legend)

## Last updated

2026-04-24 — `api.md` §Trusted headers: ตารางเรียงตาม [`../backend/api.md` → Canonical trusted header order](../backend/api.md#canonical-trusted-header-order-openapi-docs-http-examples-required) + ลิงก์ SoT
2026-04-24 — `api.md` §Health ของ gateway: ถ้า `GET /healthz` / `GET /readyz` อยู่ใน OpenAPI ของ gateway ให้ **`summary` [Required]** = `Liveness` / `Readiness` ตาม [`../backend/api.md` → Operation summary](../backend/api.md#operation-summary-client-list-titles-required)
2026-04-24 — `api.md`: หัวข้อ **Routing Approach A** (404 vs `GATEWAY_ROUTE_NOT_CONFIGURED`); `codes.yaml`: ขยาย notes `GATEWAY_ROUTE_NOT_CONFIGURED`
2026-04-24 — `api.md`: เพิ่ม **`x-user-role`**; `codes.yaml`: **`GATEWAY_NOT_READY`** (readiness / `503`) + bump registry `1.0.1`
2026-04-24 — registry: ชี้ uniqueness ข้ามสามไฟล์; `codes.yaml` ใช้ `category` ชุดเดียวกับ backend (`auth` / `validation` / `system`)
2026-04-23 — สร้างโฟลเดอร์ `gateway/` เป็น SoT ขอบ reverse proxy / JWT / upstream
