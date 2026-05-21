# ADR 001 — `auth`: ESM + Fastify + Node:test

| Field                    | Value                                                                                         |
| :----------------------- | :-------------------------------------------------------------------------------------------- |
| **Status**               | Accepted                                                                                      |
| **Scope**                | `zero-platform/auth`                                                                        |
| **Normative SoT**        | [`docs/architecture.md`](./architecture.md) — production contract, headers, errors, lifecycle |
| **Architecture context** | [`ARCHITECTURE.md`](../../ARCHITECTURE.md)                                                    |

## Context

ตามมาตรฐาน `_coding-standards/auth/runtime.md` กำหนดว่า Auth Service ต้องใช้ **ESM** (`"type": "module"`) เป็นข้อยกเว้นจากมาตรฐาน Backend ทั่วไป (Express + CommonJS) และต้องมี **ADR** บันทึกการตัดสินใจไว้ใน repository ของบริการ

## Decision

1.  **Runtime:** ใช้ **Fastify** บน **Node.js ESM** เป็นหลัก เนื่องจากมีประสิทธิภาพสูง (Low overhead) และรองรับการทำงานแบบ Asynchronous ได้ดีเยี่ยม สอดคล้องกับความต้องการของ Edge Service
2.  **Module System:** ใช้ **ESM** (`import`/`export`) เพื่อความทันสมัยและสอดคล้องกับ ecosystem ของ Node.js รุ่นใหม่ (Node 24+)
3.  **Tests:** ใช้ **`node:test`** (Native Test Runner) แทน Jest เพื่อลด dependency และใช้ประโยชน์จากความสามารถของ Node.js โดยตรง โดยไม่ต้องใช้ flag `--experimental-vm-modules` เหมือนใน Gateway

## Consequences

- ทีมพัฒนาต้องใช้ความคุ้นเคยกับ Fastify และ ESM ในการบำรุงรักษา
- ต้องรักษาความสอดคล้องระหว่าง [`docs/architecture.md`](./architecture.md) และ ADR นี้เมื่อมีการเปลี่ยนแปลงโครงสร้างหลัก
- การใช้ `node:test` ช่วยให้รันเทสต์ได้เร็วขึ้นและลดความซับซ้อนของ configuration
