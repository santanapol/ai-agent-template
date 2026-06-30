# Royalty 21 Times

> รายงานแยก — หน้า/API ของตัวเอง (ไม่รวมกับรายงานอื่น)  
> สถานะ: **scope ปัจจุบัน — spec confirmed, พร้อม implement**  
> ERD: [erd/README.md](../erd/README.md)  
> Frontend design: [design/royalty-21-times-ui.md](./design/royalty-21-times-ui.md)  
> Implementation spec: [_mission-control/SPEC.md](../_mission-control/SPEC.md)

## Overview

รายงาน **รายสมาชิก** — แต่ละแถว = 1 สมาชิก

- แสดง **สมาชิกใน channel ที่เลือก** ที่ `reg_date` อยู่ในช่วง Register From–To
- **Lifetime metrics** สำหรับสมาชิกที่ผ่าน filter (ไม่ filter billin/withdraw/deposits ตามเดือน)
- **ทุก member status** (ไม่ filter status)

## โครงสร้างคอลัมน์

| Column | Source | Logic |
|---|---|---|
| Username | `member.username` | |
| Register | `member.reg_date` | แสดง `DD/MM/YYYY` (UTC calendar date) |
| Billin | `dm_dm_tn_deposit` | SUM `amt` ฝากสำเร็จ lifetime |
| Withdraw | `wallet_withdraw` | SUM `amt` ถอนสำเร็จ lifetime |
| Promotion | — | phase 1: API คืน `0` — UI แสดง `-` (phase 2 — collection จริง) |
| Revenue | derived | `Billin - Withdraw - Promotion` (= `Billin - Withdraw` รอบนี้) |
| 1 … 21 | `dm_dm_tn_deposit` | `amt` ครั้งที่ N นับจากวันสมัคร; เรียง `bill_date` ASC; ไม่ครบ = `0` |

### Logic คอลัมน์ 1–21

```javascript
{ $match: {
    ou_id, branch_id, mem_id: memberId,
    status: { $in: DEPOSIT_SUCCESS_STATUS }
  }},
{ $sort: { bill_date: 1 } },  // bill_date = +7 stored ใน DB แล้ว
{ $group: { _id: null, deposits: { $push: "$amt" } } }
// deposits[0] → col 1, … deposits[20] → col 21
```

## Search Criteria

| Criteria | Source | Notes |
|---|---|---|
| Branch (active) | JWT → gateway headers | **ไม่รับ query param** — ดู [Tenant scope](#tenant-scope) |
| Channel Type | query `channelType` | `affiliate_link` \| `member_referral` \| `direct` (required, single-select) |
| Affiliate Link | query `inviteLinkId` | required เมื่อ `affiliate_link`; dropdown ทุก link ของ branch |
| Register From | query `regDateFrom` | required; `YYYY-MM-DD` (**UTC calendar date**); default เดือนปัจจุบัน (local timezone บน UI — ดู [Date & Timezone](#date--timezone)) |
| Register To | query `regDateTo` | required; `YYYY-MM-DD` (**UTC calendar date**); default เดือนปัจจุบัน; ต้อง ≥ Register From; **สูงสุด 366 วัน** (inclusive) |
| Report Month | — | **ไม่ใช้** (lifetime metrics) |
| Username | — | **ไม่มี** |

### Channel filter (member)

| channelType | MongoDB filter |
|---|---|
| `affiliate_link` | `{ referral_staff_link_id: ObjectId(inviteLinkId) }` |
| `member_referral` | `{ referral: "Member" }` |
| `direct` | `{ referral: "Branch" }` |

## Tenant scope

Branch จาก **navbar active branch** — ไม่ทำ branch DDL ใน search form

```
Navbar → POST /auth/me/active-branch
      → JWT: ou_id, branch_id (active)
      → Gateway: x-user-ou, x-user-branch
      → request.userContext.ouId / branchId
```

Reference: `frontend/backoffice/src/contexts/AuthContext.tsx` · `backend/gateway/src/plugins/inject-context.js`

### MongoDB

- DB เดียว: env `MONGODB_URI` + `MONGODB_DB_BRANCH` (เช่น `gpp_777ww`)
- **ทุก query** บังคับ `{ ou_id, branch_id }` จาก userContext
- Collections: `member`, `su_staff_invite_link`, `dm_dm_tn_deposit`, `wallet_withdraw`

```javascript
{
  ou_id: ObjectId(userContext.ouId),
  branch_id: ObjectId(userContext.branchId),
}
```

## Business rules (implicit)

| Rule | Value |
|---|---|
| Deposit สำเร็จ | `status ∈ ["001","002","004","006","007","008","009","010"]` |
| Withdraw สำเร็จ | `wd_status = "200"` |
| Channel attribution | channel ตอนสมัคร (`member` fields) |
| Member status | ทุก status |

## Date & Timezone

> date ทั้งหมด UTC **ยกเว้น `bill_date`** ที่ใน DB เป็น +7 อยู่แล้ว — **ห้าม** `$dateAdd +7`

| Field | Storage | ใช้ในรายงานนี้ |
|---|---|---|
| `bill_date` | +7 (stored) | sort คอล. 1–21 |
| `reg_date` | UTC | filter ช่วงสมัคร + แสดง Register `DD/MM/YYYY` |

`approve_date` ของ deposit **ไม่ใช้** เป็นวันที่ report

### UI vs API (reg date filter)

| Layer | Semantics |
|---|---|
| **UI DatePicker** | ปฏิทิน local — default เดือนปัจจุบันตาม browser timezone |
| **API query** | `regDateFrom` / `regDateTo` เป็น **UTC calendar date** (`YYYY-MM-DD`) — backend แปลงเป็น `reg_date` bounds `T00:00:00.000Z` … `T23:59:59.999Z` |
| **Register column** | แสดง UTC calendar date จาก `reg_date` (ไม่ใช่ local) |

ผู้ใช้เลือกวันที่บนปฏิทิน local แล้วส่งเป็นสตริงปฏิทิน (เช่น `2026-06-01`) — **ไม่** แปลง timezone offset ก่อนส่ง API  
ดังนั้นสมาชิกที่ `reg_date` ใกล้ขอบ UTC อาจแสดงวันที่ต่างจากช่วงที่เลือกได้ — เป็นพฤติกรรมที่ตกลงไว้

**Max range:** inclusive สูงสุด **366 วัน** — เกินแล้ว API คืน `400 INVALID_PARAM`

**Register format:** จาก `reg_date` (UTC) → string `DD/MM/YYYY` (zero-pad day/month)

```javascript
// e.g. reg_date = ISODate("2024-06-15T10:30:00Z") → "15/06/2024"
```

## Implementation

Scope รอบนี้: **API + aggregation + Frontend**

### Response envelope (confirmed)

ใช้ standard envelope เดียวกับ internal service อื่น (เช่น `agent-invoice`, `smart-report`):

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": null,
  "data": [],
  "pagination": { "page": 1, "pageSize": 50, "total": 0 },
  "requestId": "uuid"
}
```

Error: `{ "success": false, "code": "INVALID_PARAM", "message": "...", "data": null, "requestId": "..." }`

**Pagination:** `page` default 1; `pageSize` default 50, max **100** (clamp ถ้าเกิน)

---

### API — Invite Links (dropdown)

```
GET /api/v1/branch-report/invite-links
```

| | |
|---|---|
| Scope | `{ ou_id, branch_id }` จาก `userContext` (active branch) — **ไม่รับ query param** |
| Source | `su_staff_invite_link` |
| Sort | `invite_code` ASC |

**Response `data`:** array

```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "inviteCode": "3000001",
    "username": "BERLIN",
    "description": "line777ww7"
  }
]
```

Frontend dropdown label: `{inviteCode} — {username}` (description ส่งมาแต่ไม่ใช้ใน label)

---

### API — Royalty 21 Times

```
GET /api/v1/branch-report/royalty-21-times
```

| Query param | Required | Notes |
|---|---|---|
| `channelType` | yes | `affiliate_link` \| `member_referral` \| `direct` |
| `inviteLinkId` | when affiliate | ObjectId string |
| `page` | no | default 1 |
| `pageSize` | no | default 50, max 100 (clamp) |

- **ไม่รับ `branchId`** — ใช้ `x-user-ou` + `x-user-branch`
- Sort default: `username` ASC

**Response (full envelope):**

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": null,
  "data": [
    {
      "username": "7W0635268288",
      "register": "15/06/2024",
      "billin": 15000,
      "withdraw": 5000,
      "promotion": 0,
      "revenue": 10000,
      "deposits": [100, 200, 0, 500]
    }
  ],
  "pagination": { "page": 1, "pageSize": 50, "total": 1234 },
  "requestId": "uuid"
}
```

- `deposits` = array 21 ช่อง (index 0 = col 1); ค่า `0` = ไม่มีฝากครั้งนั้น (UI แสดง `-`)
- `promotion` phase 1 คืน `0` เสมอ (UI แสดง `-`)

## Decisions log (confirmed 2026-06-29)

| ID | Decision |
|---|---|
| B1 | Endpoint แยก `GET /invite-links` — fields: `inviteCode`, `username`, `description` |
| B2 | Filter active branch only; sort `invite_code` ASC |
| B3 | Response envelope standard `{ success, code, message, data, pagination?, requestId }` |
| F1 | Menu: **Branch Report → Marketing → Channel Performance** |
| F2 | Dropdown label: `invite_code — username` |
| F3 | ค่า `0` ในคอล. 1–21 → แสดง `-` |
| F4 | Table header: antd default (ไม่ clone Excel สีส้ม) |
| F5 | Promotion column → แสดง `-` (phase 1) |
| F6 | ตัวเลข Billin/Withdraw/Revenue → ทศนิยม 2 ตลอด |
| F7 | UI labels ภาษาอังกฤษ |
| X1 | Promotion phase 1 = `-` |
| X2 | สลับ branch → reset form, clear table, reload invite links |
| X3 | Default Channel Type = `affiliate_link` |
| O1 | Gateway `/api/v1/branch-report` → `branch-report:PORT` |
| O2 | Permission `branch-report:marketing:channel-performance:read` |
| O3 | pageSize default 50, max 100 (clamp) |
| O4 | OpenAPI `openapi.yaml` at service root (3.1.0) |

### Infrastructure (confirmed)

- **Gateway:** route prefix `/api/v1/branch-report`; client เรียกผ่าน gateway เท่านั้น
- **Permission:** seed ใน auth + menu/route guard ฝั่ง backoffice
- **OpenAPI:** `backend/service/branch-report/openapi.yaml`

### Out of scope รอบนี้

- Branch dropdown / branch list API (branch จาก navbar)
- Export Excel
- Username search
- Promotion collection / real Promotion value (phase 2)

### Frontend

- UI design: [design/royalty-21-times-ui.md](./design/royalty-21-times-ui.md)
