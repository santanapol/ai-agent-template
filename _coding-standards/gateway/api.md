# Gateway API contract (edge)

สัญญาสำหรับ **gateway** ระหว่าง client → gateway → upstream internal services

> **Tag legend:** [`README.md` → Tag legend](./README.md#tag-legend)

## Trusted headers ไปยัง upstream

เมื่อ gateway ส่งต่อไปยัง internal API ต้องสอดคล้อง SoT ที่ [`../backend/api.md` → Headers & Authentication](../backend/api.md#21-headers--authentication) รวม **[Required]** ลำดับ header ใน [`../backend/api.md` → Canonical trusted header order](../backend/api.md#canonical-trusted-header-order-openapi-docs-http-examples-required)

| Header | บทบาท |
| :--- | :--- |
| **`x-gateway-secret`** | **[Required]** shared secret ตาม env ขององค์กร; เปรียบเทียบ constant-time ที่ upstream — **ลำดับที่ 1** ในบล็อกมาตรฐาน |
| **`x-user-ou`** | **[Required]** default บน business route ตาม backend api.md (ยกเว้นเมื่อ OpenAPI/ADR ของ upstream ระบุ) — **ลำดับที่ 2** |
| **`x-user-branch`** | **[Required]** default บน business route — **ลำดับที่ 3** |
| **`x-user-id`** | **[Required]** default บน business route — **ลำดับที่ 4** |
| **`x-user-role`** | **[Recommended]** สตริง role (หรือหลายค่าคั่นด้วย comma ตาม ADR ขององค์กร) สำหรับ **RBAC ที่ internal** — ต้องไม่ forward จาก client; gateway ตั้งจาก JWT claim ที่กำหนดใน config — **ลำดับที่ 5** (เมื่อส่ง) |
| **`If-Match`** | forward จาก client เมื่อ upstream ใช้ conditional request — **ลำดับที่ 6** ในบล็อกมาตรฐาน (เมื่อมี) |
| **`x-request-id`** | **[Required]** forward หรือสร้าง UUID — ดู [`../backend/api.md`](../backend/api.md) หัวข้อ **Idempotency, timeouts, tracing** (correlation / `x-request-id`); **[Recommended]** วาง **หลัง** บล็อกหกรายการด้านบน |

Gateway **ห้าม** forward `x-gateway-secret` จาก client; ค่าต้องมาจาก config ของ gateway เท่านั้น

## Health ของ gateway

| Path | บทบาท |
| :--- | :--- |
| **`GET /healthz`** | **[Recommended]** liveness ของ process gateway — สอดคล้องชื่อกับ [`../backend/api.md` → Health and readiness](../backend/api.md#health-and-readiness-endpoints); ถ้ามีใน OpenAPI ของ gateway **`summary` [Required]** = `Liveness` ตาม [`../backend/api.md` → Operation summary](../backend/api.md#operation-summary-client-list-titles-required) |
| **`GET /readyz`** | **[Recommended]** readiness (upstream config โหลดได้, JWKS reachable ฯลฯ); ถ้ามีใน OpenAPI **`summary` [Required]** = `Readiness` ตามลิงก์ด้านบน |

ถ้า gateway ไม่ expose body มาตรฐาน ให้ระบุใน OpenAPI ของ gateway + ADR

## JWT verification (ขอบ)

| Item | Rule |
| :--- | :--- |
| **JWKS / issuer / audience** | **[Required]** validate ตาม policy ขององค์กร; clock skew จำกัด; ระบุใน ADR + config |
| **ข้อผิดพลาดที่ client เห็น** | map เป็น HTTP + รหัสใน [`codes.yaml`](./codes.yaml) เมื่อมี body; ถ้าไม่มี body ให้ระบุใน OpenAPI |

## Upstream errors

| Item | Rule |
| :--- | :--- |
| **Timeout / connection refused** | ใช้รหัสใน [`codes.yaml`](./codes.yaml) เช่น `GATEWAY_UPSTREAM_TIMEOUT` — หลีกเลี่ยง leak รายละเอียด upstream ใน message |
| **502 / 504** | สอดคล้อง HTTP semantics; ไม่ส่ง stack หรือ host ภายในให้ client |

## Routing: ไม่พบ path vs routing ผิด (แนว Approach A)

| สถานการณ์ | HTTP | `code` (ถ้ามี problem body) |
| :--- | :--- | :--- |
| Client ยิง path ที่ **ไม่ match** prefix ใดใน route table ที่ gateway โหลด (ถือเป็น “ไม่มีทรัพยากร / URL ผิด”) | **`404`** | ไม่บังคับ — **ห้าม** ใช้ **`GATEWAY_ROUTE_NOT_CONFIGURED`** เพื่อลดการสื่อว่า topology ภายในเป็นอย่างไร |
| **Operator / deploy misconfiguration** — path หรือ upstream ที่ **ควร** ถูกตั้งใน config แต่ผิดเงื่อนไข SoT (เช่น upstream ว่างหลัง validate, ชุด route ไม่สมบูรณ์ตาม ADR) และ **ไม่ใช่** แค่ client พิมพ์ผิด | **`502`** | **`GATEWAY_ROUTE_NOT_CONFIGURED`** ใน [`codes.yaml`](./codes.yaml) |

## Cross-reference

- Internal API envelope + OpenAPI — [`../backend/api.md`](../backend/api.md)
- Auth edge (login/token) — [`../auth/api.md`](../auth/api.md)
