# Service documentation layout (normative for internal APIs & gateway-related services)

เอกสารนี้กำหนด **โครงสร้างไฟล์เอกสาร** มาตรฐานสำหรับ service ที่ยึด [`backend/`](./README.md) หรือทำงานคู่กับ gateway / auth (ดู [`../README.md`](../README.md) สำหรับกฎเลือก SoT ตามบทบาท)

## มาตรฐานต่อ service (package หรือ monorepo child)

```text
<service>/
├── README.md
├── openapi.yaml
├── CHANGELOG.md
├── .env.example
└── docs/
    ├── architecture.md              # เอกสาร design หลัก (SoT ฝั่ง service นี้)
    ├── openapi-via-gateway.yaml     # มุมมอง client ผ่าน API gateway (มีเมื่อใช้)
    └── adrs/
        └── NNN-title-kebab.md       # ADR ตามลำดับ
```

## กฎ

1. **Contract กับ implementation** อยู่ที่ **`openapi.yaml` ที่ root ของ service** (หรือตำแหน่งเดียวกันที่ team กำหนดและลิงก์จาก README) — ห้ามให้ `docs/openapi-via-gateway.yaml` ทับ SoT โดยไม่อธิบาย
2. **`docs/architecture.md`** = เอกสาร design / บทบาท / flow ฝั่ง service **หนึ่งไฟล์** ต่อ service (ไม่กระจาย summary เดิมหลายชื่อ)
3. **`docs/openapi-via-gateway.yaml`** = มุมมอง **หลัง gateway** (Bearer, ไม่ใส่ `x-gateway-secret` ให้ client) — อัปเดตคู่กับ `openapi.yaml` เมื่อ path สาธารณะเปลี่ยน
4. **ADR** เก็บใน `docs/adrs/NNN-...md` เท่านั้น
5. **Monorepo ชุด gateway** อาจมีเอกสารรวมที่ root ของ monorepo (เช่น `gateway-architecture.md`, `RUNBOOK.md` รวม checklist deploy JWT/env) — ไม่แทน `*/docs/architecture.md` ของแต่ละ service

## อ่านเพิ่ม

- [`api.md`](./api.md) — สัญญา HTTP, envelope, OpenAPI
- [`../README.md`](../README.md) — ดัชนี `backend` / `auth` / `gateway`
- [`../spectral/org-api.yaml`](../spectral/org-api.yaml) — Spectral org ruleset
