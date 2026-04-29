# Backend standard (SoT)

มาตรฐาน backend internal API สำหรับทุก service ใน organization — **prose ทุกไฟล์ในโฟลเดอร์นี้ + `codes.yaml` = Source of Truth**

ดัชนีชุดมาตรฐาน (`_coding-standards`): [`../README.md`](../README.md)

**Implementation ใน monorepo `access-platform`:** ตัวอย่าง internal API หลัง gateway — [`access/reference`](../../access/reference/README.md) · บริการอื่นใน workspace (เช่น [`smart-report`](../../../smart-report/README.md)) ยึดสัญญาเดียวกันตามเอกสารนี้

มาตรฐานขอบระบบ (แยก SoT): [**`../auth/README.md`**](../auth/README.md) (identity/token), [**`../gateway/README.md`**](../gateway/README.md) (reverse proxy / JWT / upstream)

## เริ่มที่ไหน

| ถ้าคุณ... | อ่านไฟล์ |
| :--- | :--- |
| **เพิ่ง onboard** หรืออยาก scaffold service ใหม่ | [`runtime.md`](./runtime.md) → [`api.md`](./api.md) → [`observability.md`](./observability.md) |
| **จัดโครงสร้างเอกสารใน repo service** (OpenAPI, `docs/architecture.md`, ADR) | [`docs-layout.md`](./docs-layout.md) |
| **ออกแบบ endpoint ใหม่** | [`api.md`](./api.md) (entry) + [`codes.yaml`](./codes.yaml) |
| **QA / ต้องการรายการ `code` ทั้งหมดฉบับอ่านง่าย** | [`api.md` → Response and error code catalog](./api.md#32-response-and-error-code-catalog) (สอดคล้อง [`codes.yaml`](./codes.yaml)) |
| **เขียน Mongo repository** | [`mongodb.md`](./mongodb.md) + [`tenant-audit.md`](./tenant-audit.md) |
| **เพิ่ม dependency / ตั้ง CI** | [`supply-chain.md`](./supply-chain.md) |
| **ขอ deploy / ตั้ง SLO / index** | [`ops.md`](./ops.md) |
| **ดู code reference** | [`examples/`](./examples/) |

## Layout

```
backend/
├── README.md                       (เอกสารนี้ — index)
├── docs-layout.md          (tree มาตรฐาน: `openapi.yaml`, `docs/architecture.md`, `docs/adrs/`, `openapi-via-gateway`)
├── api.md                  (core API contract: header, envelope, routing, validation, OpenAPI)
├── runtime.md              (Node version, env, structure, scripts)
├── mongodb.md              (driver, connection, transaction, health)
├── observability.md        (logging, request id, metrics)
├── tenant-audit.md         (ou_id, branch_id, cr_*/upd_*, ETag, If-Match)
├── supply-chain.md         (deps, lockfile, lint, format, CI)
├── ops.md                  (SLO, security SLA, license, coverage, index rollout)
├── codes.yaml                      (central code registry — HTTP ↔ code mapping)
└── examples/                       (reference snippets — ตัดจาก prose; ไม่ใช่ binding)
```

## ลำดับความสำคัญของ SoT

1. **ADR / การตัดสินใจเป็นทางการ** ของทีม (เมื่อมี)
2. **เนื้อหา prose ในโฟลเดอร์นี้** และ `codes.yaml`
3. **กฎเครื่องมือที่ทีมประกาศเป็นลายลักษณ์อักษร** (เช่น editor rules, CI policy) — ต้องไม่ขัดกับ (2)
4. Best practice / RFC / OWASP — อ้างอิงเมื่อ (2) ไม่ได้กำหนด

## เปลี่ยนเนื้อหามาตรฐาน

- แก้ไฟล์ `.md` และ `codes.yaml` ใน `backend/` แล้วเปิด PR ตามกระบวนการของทีมใน repo **coding-standards**
- รายละเอียดรวมถึงลิงก์ไปไฟล์ workflow **นอก repo นี้** (ถ้ามี): [`../README.md`](../README.md) ส่วน **การเปลี่ยนมาตรฐาน**

## Tag legend

ใช้ร่วมกันทุกไฟล์มาตรฐาน `api.md`, `runtime.md`, `mongodb.md`, … (ดู [Layout](#layout)) — **ไม่ซ้ำตารางนี้ในแต่ละไฟล์**

| Tag | ความหมาย |
| :--- | :--- |
| **[Required]** | ต้องทำ; deviation ต้อง ADR |
| **[Recommended]** | แนะนำ default; เปลี่ยนได้ตามบริบท |
| **[Forbidden]** | ห้าม; ละเมิด = block merge |
| **[Reference]** | ตัวอย่าง / ภาคผนวก ไม่บังคับ |
| **[ADR-gated]** | ต้องเขียน ADR + sign-off ก่อนทำ |

## Last updated

2026-04-27 — `api.md` §3.2 Response and error code catalog: เพิ่ม **`INVALID_JSON_BODY`** (HTTP 400, คู่ [`codes.yaml`](./codes.yaml)) ในตาราง human-readable + ตารางกรณีสับสน + `data` shape + note เรื่องไม่ reuse `INVALID_PARAM`
2026-04-24 — README: ดัชนีชุดมาตรฐาน (`_coding-standards`) + ลิงก์ monorepo [`access/reference`](../../access/reference/README.md) / [`smart-report`](../../../smart-report/README.md); บรรทัดประวัติ Spectral สอด `access/reference/openapi.yaml` แทน path เดิม `authorization-gateway/internal-api`
2026-04-24 — `../spectral/org-api.yaml`: กฎ **`org-trusted-header-parameter-order`** (ฟังก์ชัน `functions/trustedHeaderParameterOrder.js`) + `.spectral.yaml` ฝั่งบริการขยาย org ruleset; sync ลำดับ `parameters` ใน `smart-report/openapi.yaml`, `access/reference/openapi.yaml` (monorepo `access-platform`), `examples/openapi-components.fragment.yaml`
2026-04-24 — `api.md` §2.1: **[Required]** ลำดับมาตรฐาน trusted header หลัง gateway (`x-gateway-secret` → `x-user-ou` → `x-user-branch` → `x-user-id` → `x-user-role` → `If-Match`) สำหรับ OpenAPI `parameters` / ตัวอย่าง HTTP / เอกสาร; §1.1 Header parameters อ้างลำดับเดียวกัน; `gateway/api.md` ตาราง trusted headers สอดคล้อง
2026-04-24 — `api.md` §1.1: **[Required]** `summary` สั้น + ตาราง canonical (`Liveness`, `Readiness`, `Login`, …) + Forbidden เมื่อ path มีใน spec แต่ชื่อไม่ตรง (ยกเว้น ADR); `auth/api.md` อ้างกฎเดียวกันสำหรับ health และ `/auth/*`
2026-04-23 — `api.md` §1.1: **[Required]** `servers` แรกชื่อ `Local`, `GatewaySecret.description`, placeholder `example` บน gateway context header parameters + Forbidden ที่สอดคล้อง (client import / Bruno)
2026-04-24 — `codes.yaml`: หัวไฟล์ชี้ SoT แยกร่วมกับ [`../auth/codes.yaml`](../auth/codes.yaml) + [`../gateway/codes.yaml`](../gateway/codes.yaml) และกฎ uniqueness ข้ามสามไฟล์
2026-04-23 — Spectral: แชร์ ruleset เดียวชื่อ [`../spectral/org-api.yaml`](../spectral/org-api.yaml) (แทน `backend-std-min.yaml`)
2026-04-23 — README: ลิงก์ไป [`../auth/`](../auth/README.md) และ [`../gateway/`](../gateway/README.md) สำหรับขอบ identity/gateway (registry แยก)
2026-04-22 — api.md: เพิ่มหัวข้อ **Response and error code catalog** (ฉบับมนุษย์สำหรับ QA — สอดคล้อง `codes.yaml`)
2026-04-22 — api.md + codes.yaml: default บังคับ `x-gateway-secret` + `x-user-id` + `x-user-ou` + `x-user-branch` บน business API; ยกเว้นเมื่อ OpenAPI/ADR หรือ exempt path ระบุ; ลงทะเบียน `INVALID_USER_CONTEXT`
2026-04-21 — เปลี่ยนชื่อไฟล์มาตรฐานจาก `std.min.*.md` เป็น `api.md`, `runtime.md`, … และอัปเดตลิงก์ภายใน repo
