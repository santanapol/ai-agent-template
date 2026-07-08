# ERD — gpp_777ww (detail)

> **Tenant scope:** DB เดียว (`gpp_777ww`) — แยก branch ด้วย `ou_id` + `branch_id` ในทุก query (จาก JWT active branch)

## Logical model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              member                                         │
│  PK: _id                                                                    │
│  UK: ou_id + username                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  Org:     ou_id, branch_id, agent_id                                        │
│  Profile: username, f_name, m_name, l_name, tel, email, gender, birthdate   │
│  Referral: referral, referral_uid ──► member._id (self)                   │
│            referral_code, referral_staff_id                                 │
│            referral_staff_link_id ──► su_staff_invite_link._id            │
│  Dates:   reg_date, cr_date, last_login_date                                │
│  Status:  status, status_promotion, online_status                           │
└───────┬─────────────────┬─────────────────────┬───────────────────────────┘
        │ 1:N             │ 1:N                 │ N:1
        │ mem_id          │ uid                 │ referral_staff_link_id
        ▼                 ▼                     ▼
┌───────────────────┐ ┌───────────────────┐ ┌─────────────────────────────┐
│ dm_dm_tn_deposit  │ │ wallet_withdraw   │ │   su_staff_invite_link      │
│ PK: _id           │ │ PK: _id           │ │   PK: _id                   │
├───────────────────┤ ├───────────────────┤ ├─────────────────────────────┤
│ FK: mem_id        │ │ FK: uid           │ │ FK: staff_id (BO staff)     │
│ Amount: amt       │ │ Amount: amt       │ │ invite_code, description    │
│ Dates: bill_date (+7 stored)│ │ Dates: approve_date (UTC)│ │ username (staff), qrcode    │
│ Status: status    │ │ Status: wd_status │ │ ou_id, branch_id            │
└───────────────────┘ └───────────────────┘ └─────────────────────────────┘
```

## Mermaid (field-level)

```mermaid
erDiagram
    MEMBER ||--o{ DM_DM_TN_DEPOSIT : deposits
    MEMBER ||--o{ WALLET_WITHDRAW : withdraws
    MEMBER ||--o| MEMBER : refers
    SU_STAFF_INVITE_LINK ||--o{ MEMBER : invite_link

    SU_STAFF_INVITE_LINK {
        ObjectId _id
        ObjectId ou_id
        ObjectId branch_id
        ObjectId staff_id
        string username
        string invite_code
        string description
        string qrcode
        date cr_date
    }

    MEMBER {
        ObjectId _id
        ObjectId ou_id
        ObjectId branch_id
        string username
        string referral
        ObjectId referral_uid
        string referral_code
        ObjectId referral_staff_id
        ObjectId referral_staff_link_id
        date reg_date
        date cr_date
        string status
        string status_promotion
    }

    DM_DM_TN_DEPOSIT {
        ObjectId _id
        ObjectId mem_id
        string username
        number amt
        date bill_date
        date doc_date
        date approve_date
        string status
        string status_wallet
        ObjectId ou_id
        ObjectId branch_id
        ObjectId operate_branch_id
        object bank_acc_group_data
    }

    WALLET_WITHDRAW {
        ObjectId _id
        ObjectId uid
        string username
        number amt
        date doc_date
        date req_date
        date approve_date
        string wd_status
        ObjectId ou_id
        ObjectId branch_id
        number turnover
    }
```

## Nested / embedded documents

### member.external

```
external
└── promotion
    ├── status   (string)  e.g. "200"
    └── date     (date)
```

### dm_dm_tn_deposit.exchange_rate

```
exchange_rate
├── currency                  (string)
├── source_amt                (number)
├── target_amt                (number)
├── buying_rate               (number)
├── selling_rate              (number)
└── ref_id_setting_currency   (ObjectId)
```

### dm_dm_tn_deposit.bank_acc_group_data

```
bank_acc_group_data
├── group_id    (ObjectId[] | null)
└── channel_id  (ObjectId)   ← marketing channel for deposit routing
```

### wallet_withdraw.length_date

```
length_date
├── date_from  (date)
├── date_to    (date)
└── type       (string[])
```

### wallet_withdraw.lock_in_out[]

```
lock_in_out[]
├── _id, ref_id, type, game_comp, game_id, ref_wt_id
├── date_in, date_out, amt_in, amt_out
├── vb, nw, nw_diff, status, first_log, warning, hidden_freespin
```

### wallet_withdraw.detail_payment

```
detail_payment
├── transaction_id, remaining_amount, amount, status, complete, provider
└── withdraw_detail[]
    ├── id, status, amount, bill_date
    ├── from_bank, from_acc_no, from_acc_name, desc, bill_slip
```

## Indexes (query-relevant for branch report)

### member

| Index                            | Fields                     | Report use                     |
| -------------------------------- | -------------------------- | ------------------------------ |
| `cr_date_-1`                     | cr_date ↓                  | member created timeline        |
| `ou_id_1_branch_id_1_reg_date_1` | ou_id, branch_id, reg_date | register count by branch/month |
| `referral_code_1_cr_date_-1`     | referral_code, cr_date ↓   | affiliate code performance     |
| `referral_uid_1`                 | referral_uid               | member referral tree           |
| `referral_staff_link_id_1`       | referral_staff_link_id     | affiliate link grouping        |
| `referral_staff_id_1`            | referral_staff_id          | staff affiliate                |

### dm_dm_tn_deposit

| Index                                                                                                         | Fields                           | Report use                                   |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------- |
| `mem_id_1_bill_date_1_status_1`                                                                               | mem_id, bill_date, status        | per-member deposit history (**report date**) |
| `mem_id_1_approve_date_1_status_1`                                                                            | mem_id, approve_date, status     | legacy index (report ใช้ `bill_date` แทน)    |
| `bill_date_1_status_1_status_wallet_1`                                                                        | bill_date, status, status_wallet | **monthly bill-in aggregation**              |
| `ou_id_1_branch_id_1_bill_date_1__id_1`                                                                       | ou_id, branch_id, bill_date      | branch-level deposit by report date          |
| `ou_id_1_branch_id_1_status_1_approve_date_1_bank_acc_group_data.group_id_1_bank_acc_group_data.channel_id_1` | …channel_id                      | deposit by marketing channel                 |

### wallet_withdraw

| Index                                                           | Fields                                    | Report use                             |
| --------------------------------------------------------------- | ----------------------------------------- | -------------------------------------- |
| `uid_1_approve_date_1_sub_doc_type_1_wd_status_1_amt_1`         | uid, approve_date, wd_status, amt         | per-member withdraw                    |
| `approve_date_1_wd_status_1_sub_doc_type_1`                     | approve_date, wd_status                   | **monthly withdraw aggregation (UTC)** |
| `ou_id_1_branch_id_1_approve_date_1_sub_doc_type_1_wd_status_1` | ou_id, branch_id, approve_date, wd_status | branch-level withdraw report           |
| `uid_1_doc_date_1_wd_status_1`                                  | uid, doc_date, wd_status                  | member withdraw timeline               |

### su_staff_invite_link

| Index                 | Fields           | Report use                 |
| --------------------- | ---------------- | -------------------------- |
| `invite_code_1`       | invite_code      | lookup affiliate code      |
| `staff_id_1_ou_id_1`  | staff_id, ou_id  | links per staff            |
| `ou_id_1_branch_id_1` | ou_id, branch_id | branch-scoped invite links |

> Join: `member.referral_staff_link_id = su_staff_invite_link._id` (index `referral_staff_link_id_1` on member)

## Success status filters (Branch Report)

### Deposit — `dm_dm_tn_deposit.status`

รายการฝากที่ถือว่า **สำเร็จ** สำหรับ Bill In / Member Bill In / Member Royalty:

```javascript
const DEPOSIT_SUCCESS_STATUS = [
  "001",
  "002",
  "004",
  "006",
  "007",
  "008",
  "009",
  "010",
];

// MongoDB filter
{
  status: {
    $in: DEPOSIT_SUCCESS_STATUS;
  }
}
```

| Code               | Report   |
| ------------------ | -------- |
| `001`              | สำเร็จ ✓ |
| `002`              | สำเร็จ ✓ |
| `004`              | สำเร็จ ✓ |
| `006`              | สำเร็จ ✓ |
| `007`              | สำเร็จ ✓ |
| `008`              | สำเร็จ ✓ |
| `009`              | สำเร็จ ✓ |
| `010`              | สำเร็จ ✓ |
| อื่นๆ (e.g. `003`) | ไม่นับ   |

> ไม่ใช้ `status_wallet` เป็นเงื่อนไขสำเร็จ — ใช้เฉพาะ `status` ตามรายการด้านบน

**วันที่ทำรายการสำเร็จ:** `bill_date` — ค่าใน DB เป็น **+7 อยู่แล้ว** (ห้าม `$dateAdd +7` ซ้ำ)

```javascript
// filter เดือน May/2025 — ใช้ค่า bill_date ใน DB โดยตรง
{ bill_date: { $gte: ISODate("2025-05-01T00:00:00Z"), $lt: ISODate("2025-06-01T00:00:00Z") } }

// reg_date, approve_date (withdraw) — UTC
{ reg_date: { $gte: ISODate("2025-05-01T00:00:00Z"), $lt: ISODate("2025-06-01T00:00:00Z") } }
```

### Withdraw — `wallet_withdraw.wd_status`

รายการถอนที่ถือว่า **สำเร็จ**:

```javascript
const WITHDRAW_SUCCESS_STATUS = "200";

// MongoDB filter
{
  wd_status: WITHDRAW_SUCCESS_STATUS;
}
```

| Code  | Report   |
| ----- | -------- |
| `200` | สำเร็จ ✓ |
| อื่นๆ | ไม่นับ   |

**วันที่ทำรายการสำเร็จ:** `approve_date` ใช้ตาม **UTC** ใน DB (ไม่ offset)

```javascript
// filter เดือน May 2025 (UTC)
{ approve_date: { $gte: ISODate("2025-05-01T00:00:00Z"), $lt: ISODate("2025-06-01T00:00:00Z") } }
```

### ตัวอย่าง aggregation

```javascript
// Bill In by month (bill_date = +7 stored)
db.dm_dm_tn_deposit.aggregate([
  {
    $match: {
      status: { $in: ["001", "002", "004", "006", "007", "008", "009", "010"] },
      bill_date: {
        $gte: ISODate("2025-05-01T00:00:00Z"),
        $lt: ISODate("2025-06-01T00:00:00Z"),
      },
      mem_id: { $ne: null },
    },
  },
  {
    $group: {
      _id: { $dateToString: { format: "%Y-%m", date: "$bill_date" } },
      bill_in: { $sum: "$amt" },
      deposit_count: { $sum: 1 },
    },
  },
]);

// Withdraw by month (approve_date UTC)
db.wallet_withdraw.aggregate([
  {
    $match: {
      wd_status: "200",
      approve_date: {
        $gte: ISODate("2025-05-01T00:00:00Z"),
        $lt: ISODate("2025-06-01T00:00:00Z"),
      },
    },
  },
  {
    $group: {
      _id: { $dateToString: { format: "%Y-%m", date: "$approve_date" } },
      withdraw: { $sum: "$amt" },
    },
  },
]);
```

## Other status reference

| Collection         | Field           | Sample values | Notes                                       |
| ------------------ | --------------- | ------------- | ------------------------------------------- |
| `member`           | `status`        | `1`           | active member                               |
| `member`           | `referral`      | `Branch`      | direct / branch registration                |
| `dm_dm_tn_deposit` | `status_wallet` | `0`, `1`      | wallet credited flag (ไม่ใช้ filter สำเร็จ) |
| `dm_dm_tn_deposit` | `status_msg`    | `1`           | message/process flag                        |
| `wallet_withdraw`  | `status_msg`    | `1`           | message/process flag                        |
