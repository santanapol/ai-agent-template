# Channel Summary (Matrix 1)

> รายงานแยก — หน้า/API ของตัวเอง (ไม่รวมกับรายงานอื่น)  
> สถานะ: **ถัดไป — spec ระดับ outline, ยังไม่ confirmed สำหรับ implement**  
> ERD: [erd/README.md](../erd/README.md)

## Overview

รายงาน **สรุปตาม channel** — แต่ละแถว = 1 channel (หรือ 1 affiliate link) ในเดือนที่เลือก

- Grouping by **Report Month**
- Input source: BO Affiliate, Member Referral
- Channel groups: **Affiliate Link**, **Member Referral**, **Direct**

## โครงสร้างคอลัมน์

| Column | Source | Logic | Phase |
|---|---|---|---|
| Cost* | — | ข้าม | 3 |
| Bill In (Deposit Amount) | `dm_dm_tn_deposit` | SUM `amt` ฝากสำเร็จ; filter `bill_date` (+7 stored) | **2** |
| Revenue | derived | Bill In − Withdraw ต่อ channel/เดือน | **2** |
| Register Count | `member` | COUNT สมาชิกใหม่; filter `reg_date` (UTC) | **2** |
| Member Bill In | `dm_dm_tn_deposit` | COUNT DISTINCT `mem_id` ฝากสำเร็จ; วันที่จาก `bill_date` | **2** |
| Register Cost* | — | ข้าม | 3 |
| Cost Bill In* | — | ข้าม | 3 |
| Rev/Cost* | — | ข้าม | 3 |
| Member Royalty | derived | **TBD** — Deposit Count / Deposit Day Count | **2** |

### Member Royalty (TBD)

จาก spec ต้นฉบับ:

- Deposit Count
- Deposit Day Count

> ยังไม่ confirm นิยามและสูตรคำนวณ — ต้อง clarify ก่อน implement

## Search Criteria

| Criteria | UI | Notes |
|---|---|---|
| Branch (active) | navbar (session) | **ไม่ใช่ search field** — JWT → `x-user-ou` + `x-user-branch` |
| Report Month | month picker | required (เช่น May/2025) |
| Channel Type | multi-select | default = ทั้งหมด (Affiliate Link, Member Referral, Direct) |
| Affiliate Link | dropdown | **ทุก link** ของ branch; แสดงเมื่อเลือก Affiliate Link |

### Channel grouping

| Group | MongoDB hint |
|---|---|
| Affiliate Link | `member` ⋈ `su_staff_invite_link` via `referral_staff_link_id` |
| Member Referral | `member.referral_uid` not null หรือ `referral = "Member"` |
| Direct | `member.referral = "Branch"` |

> Channel filter รายละเอียด (multi-select logic) — **ยังไม่ confirmed**

## Tenant scope

(เหมือน [Royalty 21 Times](./royalty-21-times.md#tenant-scope))

- DB เดียว `MONGODB_DB_BRANCH` + filter `{ ou_id, branch_id }` ทุก query
- Branch จาก navbar active branch via JWT — ไม่รับ `branchId` จาก client

## Business rules (implicit)

| Rule | Value |
|---|---|
| Deposit สำเร็จ | `status ∈ ["001","002","004","006","007","008","009","010"]` |
| Withdraw สำเร็จ | `wd_status = "200"` |
| Channel attribution | channel ตอนสมัคร (`member` fields) |

## Date & Timezone

> date ทั้งหมด UTC **ยกเว้น `bill_date`** (+7 stored) — **ห้าม** `$dateAdd +7`

Filter เดือน Report Month = **May/2025** ตัวอย่าง:

| Field | Storage | Filter | Metrics |
|---|---|---|---|
| `bill_date` | +7 (stored) | `2025-05-01T00:00:00Z` ≤ x < `2025-06-01T00:00:00Z` | Bill In, Member Bill In |
| `reg_date` | UTC | `2025-05-01T00:00:00Z` ≤ x < `2025-06-01T00:00:00Z` | Register Count |
| `approve_date` (withdraw) | UTC | `2025-05-01T00:00:00Z` ≤ x < `2025-06-01T00:00:00Z` | Withdraw, Revenue |

```javascript
// Bill In — filter เดือน May/2025
{ bill_date: { $gte: ISODate("2025-05-01T00:00:00Z"), $lt: ISODate("2025-06-01T00:00:00Z") } }

// Register / Withdraw
{ reg_date: { $gte: ISODate("2025-05-01T00:00:00Z"), $lt: ISODate("2025-06-01T00:00:00Z") } }
{ approve_date: { $gte: ISODate("2025-05-01T00:00:00Z"), $lt: ISODate("2025-06-01T00:00:00Z") } }
```

> `approve_date` ของ deposit **ไม่ใช้** — ใช้ `bill_date` สำหรับ deposit metrics

## Implementation

> **ยังไม่เริ่ม** — รอ confirm Member Royalty + multi-select channel logic

### API (draft)

```
GET /api/v1/branch-report/channel-summary   ← ชื่อ TBD
```

| Query param | Notes |
|---|---|
| `reportMonth` | `YYYY-MM` — TBD |
| `channelTypes` | multi — TBD |
| `inviteLinkIds` | when affiliate selected — TBD |

### Open questions

- [ ] นิยาม Member Royalty (Deposit Count / Deposit Day Count)
- [ ] แถว report = 1 row ต่อ channel type หรือ 1 row ต่อ affiliate link?
- [ ] Multi-select channel — union หรือ filter แยก?
- [ ] Pagination / export requirements
- [ ] Cost* metrics — phase 3
