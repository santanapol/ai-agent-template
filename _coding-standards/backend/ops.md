# Backend operations standard

SLO baseline, security SLA, license policy, index rollout, coverage threshold

> **Tag legend:** [`README.md` → Tag legend](./README.md#tag-legend)

> **Scope:** หมวดนี้รวม operational policies (SRE / supply-chain governance / DBA runbook) ที่**ไม่ใช่** API contract แต่ยังต้อง enforce ระดับ org. แยกออกจาก API spec เพื่อ reduce blast radius เวลาแก้

## Table of contents
1. **SRE & Reliability** (SLO baseline)
2. **Security & Governance** (Security SLA, License policy)
3. **Quality & Testing** (Coverage threshold)
4. **Database Operations** (Index rollout procedure)

---

## 1. SRE & Reliability

### 1.1 SLO baseline

| Metric | Threshold | Window |
| :--- | :--- | :--- |
| **Latency p95** | **< 1000 ms** | rolling 30 วัน |
| **Error rate** | **< 2%** (5xx / total) | rolling 30 วัน |
| **Availability** | **≥ 99.5%** | rolling 30 วัน |

- **ระดับ baseline [Recommended]:** service ที่ latency/error ไม่ถึงเกณฑ์นี้ควรมี **ADR** อธิบายเหตุผล + action plan
- **เกณฑ์เข้มกว่า baseline:** service ระดับ user-facing / critical กำหนดใน OpenAPI + ADR ได้
- **ไม่บังคับ** alerting/dashboard ใน std.min (อยู่ที่ infra / SRE process)
- **Metrics source:** `prom-client` HTTP histogram (ดู [Observability → Metrics](./observability.md#41-metrics-prom-client))

---

## 2. Security & Governance

### 2.1 Security SLA

แก้ปัญหา vulnerability จาก `npm audit` / Dependabot alert ภายในเวลาที่กำหนด

| Severity | Deploy SLA |
| :--- | :--- |
| **Critical** | **48 ชั่วโมง** |
| **High** | **7 วัน** |
| **Medium** | **30 วัน** |
| Low / Informational | จัดใน regular bump cycle |

- **CI gate [Required]:** **`npm audit --audit-level=high`** ต้อง **block merge** เมื่อพบ high / critical (ดู [Supply chain → CI gate](./supply-chain.md#52-ci-gate-required))
- **Bot cadence [Recommended]:** Renovate หรือ Dependabot weekly; ใช้ **grouping policy** รวม patch ของ package เดียวกันเพื่อลด PR noise
- **SLA override:** เลื่อนได้เฉพาะเมื่อ vendor advisory ยืนยันไม่กระทบ + บันทึกใน **ADR**

### 2.2 License policy

| License | Status |
| :--- | :--- |
| MIT / Apache-2.0 / BSD-2 / BSD-3 / ISC | **allowed** |
| LGPL | allowed (dynamic link เท่านั้น) |
| **GPL / AGPL** | **forbidden** ยกเว้นมี **ADR** + acknowledgement |
| Unknown / proprietary | **forbidden** จนกว่าจะ review |

- **CI [Recommended]:** ใช้ `license-checker --failOn "GPL;AGPL"` ใน pre-merge hook
- **Known exceptions ([ADR-gated]):**
  - `pm2` (AGPL-3.0) — devDependency / global tool เท่านั้น; ห้ามใส่ `dependencies` หรือ bundle เข้า production image (ดู [Supply chain → Dev dependencies](./supply-chain.md#52-ci-gate-required))

---

## 3. Quality & Testing

### 3.1 Coverage threshold

| Scope | Threshold | Enforcement |
| :--- | :--- | :--- |
| **Lines** | **≥ 80%** | **block merge** ถ้าต่ำกว่า |
| **Functions** | ≥ 80% | warn ถ้าต่ำกว่า |
| **Branches** | ≥ 70% | warn ถ้าต่ำกว่า |
| **Reporter** | `text` (console) + `lcov` (CI upload) | — |

- **Service ปรับเลขลง:** ต้อง **ADR** + plan + timeline การเพิ่ม coverage
- **Service ตั้งเลขสูงกว่า:** OK (ไม่ต้อง ADR)
- **Tooling:** Jest `coverageThreshold` หรือ `c8 --check-coverage`; ดู template ใน [`examples/jest.config.js`](./examples/jest.config.js)

---

## 4. Database Operations

### 4.1 Index rollout procedure [Required]

ทุก index change ใน production ต้องผ่านขั้นตอนต่อไปนี้ — application code **ห้าม** สร้าง index ใน bootstrap (ดู [MongoDB → Indexes](./mongodb.md#32-indexes))

1. **PR แก้ `docs/indexes/<collection>.md`** — ระบุ `name`, `keys`, `options` (unique / partial / TTL / collation), `reason` (query pattern), `date`, `PR/ticket`, แนบ `.explain('executionStats')` ของ query ใหม่
2. **DBA สร้าง index บน staging cluster ก่อน** — ตรวจสอบ index size + impact; แนบ `db.<col>.stats().indexSizes` ใน PR
3. **สร้าง index บน production** ด้วย **`{ background: true }`** ในช่วง **low-traffic window**
4. **Build ขนาดใหญ่ (> 500 MB index size)** — ใช้ **rolling build** ทีละ node (secondary ก่อน) หรือประกาศ **maintenance window**
5. **ยืนยันผ่าน `db.<col>.getIndexes()`** + `db.<col>.stats().indexSizes` ใน ทุก environment หลัง deploy

**Risk (manual process):** no automation → drift ระหว่าง env เป็นไปได้; แนะนำ DBA ทำ **reconciliation report รายเดือน** (ประกาศใน ADR ของทีม DB ถ้าจะบังคับ)
