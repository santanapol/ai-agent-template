# ADR 001 — `gateway`: ESM + Fastify + Jest (experimental VM)

| Field | Value |
| :--- | :--- |
| **Status** | Accepted |
| **Scope** | `project-active/access-platform/access/gateway` |
| **Normative SoT** | [`docs/architecture.md`](../architecture.md) — production contract, headers, errors, lifecycle |
| **Architecture context** | [`ARCHITECTURE.md`](../../ARCHITECTURE.md) |

## Context

`_coding-standards/gateway/runtime.md` กำหนดว่า gateway service ใช้ **ESM** (`"type": "module"`) เป็นข้อยกเว้นจาก default CommonJS ของ backend standard และต้องมี **ADR** ใน repo บริการ

## Decision

1. **ADR ระดับ repo นี้** = เอกสารนี้ + [`docs/architecture.md`](../architecture.md) (production SoT) — ไม่แยก ADR ซ้ำซ้อนคนละเรื่องกับ design doc
2. **Runtime:** Fastify บน **Node.js ESM**; entrypoint `src/server.js` / `src/app.js`
3. **Tests:** Jest บน ESM ใช้ **`NODE_OPTIONS=--experimental-vm-modules`** ใน **dev/CI เท่านั้น** — สอดคล้อง `gateway/runtime.md` §4

## Consequences

- ต้องรักษา [`docs/architecture.md`](../architecture.md) + ADR นี้ให้สอดคล้องกับ implementation เมื่อเปลี่ยน module system หรือ test runner
- หากย้ายไป `node:test` แทน Jest ได้ในอนาคต — อัปเดต ADR + `package.json` scripts
