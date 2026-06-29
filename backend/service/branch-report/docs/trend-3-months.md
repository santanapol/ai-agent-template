# Trend 3 Months (Matrix 2)

> รายงานแยก — หน้า/API ของตัวเอง (ไม่รวมกับรายงานอื่น)  
> สถานะ: **ยังไม่ทำ — spec ระดับ concept เท่านั้น**  
> ERD: [erd/README.md](../erd/README.md)

## Overview

รายงาน **แนวโน้ม 3 เดือน** — เปรียบเทียบ metrics ย้อนหลังจาก Report Month ที่เลือก

- เดือน M = Report Month ที่เลือก
- เดือน M-1, M-2 = 2 เดือนก่อนหน้า
- ขึ้นกับ [Channel Summary](./channel-summary.md) metrics + Cost* (phase 3) สำหรับ Rev/Cost

## โครงสร้างคอลัมน์

| Column | Notes | Phase |
|---|---|---|
| Month | แสดงช่วงเดือน (M, M-1, M-2) | **3** |
| Cost* | ข้าม | 4 |
| Bill In 1 | Bill In เดือน M | **3** |
| Bill In 2 | Bill In เดือน M-1 | **3** |
| Bill In 3 | Bill In เดือน M-2 | **3** |
| Revenue 1 | Revenue เดือน M | **3** |
| Revenue 2 | Revenue เดือน M-1 | **3** |
| Revenue 3 | Revenue เดือน M-2 | **3** |
| Rev/Cost 1 | `(Rev/Cost × 100) - 100` เดือน M | 4 (ต้องมี Cost*) |
| Rev/Cost 1+2 | cumulative 2 เดือน | 4 |
| Rev/Cost 1+2+3 | cumulative 3 เดือน | 4 |

### ช่วงเวลา

```
Bill In 1 / Revenue 1  = เดือน M   (Report Month)
Bill In 2 / Revenue 2  = เดือน M-1
Bill In 3 / Revenue 3  = เดือน M-2
```

## Search Criteria (draft)

| Criteria | UI | Notes |
|---|---|---|
| Branch (active) | navbar (session) | JWT → `x-user-ou` + `x-user-branch` |
| Report Month | month picker | required — anchor สำหรับ M, M-1, M-2 |
| Channel Type | multi-select | คาดว่าเหมือน Channel Summary — **TBD** |
| Affiliate Link | dropdown | เมื่อเลือก Affiliate Link — **TBD** |

> Search criteria ยังไม่ confirm — คาด derive จาก Channel Summary + Report Month

## Tenant scope

(เหมือน [Royalty 21 Times](./royalty-21-times.md#tenant-scope))

- DB เดียว + filter `{ ou_id, branch_id }`
- Branch จาก navbar — ไม่รับ `branchId` จาก client

## Business rules (implicit)

| Rule | Value |
|---|---|
| Deposit สำเร็จ | `status ∈ ["001","002","004","006","007","008","009","010"]` |
| Withdraw สำเร็จ | `wd_status = "200"` |
| Bill In date | `bill_date` (+7 stored) |
| Withdraw date | `approve_date` (UTC) |
| Revenue | Bill In − Withdraw ต่อเดือน |

## Date & Timezone

ใช้กฎเดียวกับ [Channel Summary](./channel-summary.md#date--timezone) — filter 3 ช่วงเดือนแยก:

```javascript
// M = May/2025
const monthM   = { $gte: ISODate("2025-05-01T00:00:00Z"), $lt: ISODate("2025-06-01T00:00:00Z") };
const monthM1  = { $gte: ISODate("2025-04-01T00:00:00Z"), $lt: ISODate("2025-05-01T00:00:00Z") };
const monthM2  = { $gte: ISODate("2025-03-01T00:00:00Z"), $lt: ISODate("2025-04-01T00:00:00Z") };
```

> `bill_date` ใช้ filter ตรงๆ (+7 stored); `approve_date` ใช้ UTC

## Implementation

> **ยังไม่เริ่ม** — รอ Channel Summary + Cost* metrics

### API (draft)

```
GET /api/v1/branch-report/trend-3-months   ← ชื่อ TBD
```

### Dependencies

| Dependency | Status |
|---|---|
| Channel Summary — Bill In, Revenue logic | ยังไม่ implement |
| Channel Summary — channel grouping | ยังไม่ confirm |
| Cost* metrics | phase 4 — Rev/Cost ใช้ไม่ได้จนกว่าจะมี Cost |

### Open questions

- [ ] 1 แถว = 1 channel หรือ 1 affiliate link?
- [ ] Rev/Cost cumulative formula ยืนยันกับ business
- [ ] แสดง 3 แถว (M, M-1, M-2) หรือ 1 แถว pivot (Bill In 1/2/3)?
- [ ] Search criteria ตรง Channel Summary หรือไม่?
