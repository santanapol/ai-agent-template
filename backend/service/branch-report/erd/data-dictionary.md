# Data Dictionary — gpp_777ww

> Inferred from MongoDB schema sampling (sampleSize=100) + sample documents.  
> Types show union when field has multiple observed BSON types.  
> **Tenant scope:** DB เดียว — ทุก query ต้องมี `{ ou_id, branch_id }` จาก active branch (JWT).

## Success status filters (Branch Report)

| Collection | Field | สำเร็จ | MongoDB filter |
|---|---|---|---|
| `dm_dm_tn_deposit` | `status` | `001`, `002`, `004`, `006`, `007`, `008`, `009`, `010` | `{ status: { $in: ["001","002","004","006","007","008","009","010"] } }` |
| `wallet_withdraw` | `wd_status` | `200` | `{ wd_status: "200" }` |

## Date & Timezone rules

> **date ทั้งหมดเป็น UTC ยกเว้น `bill_date` ที่ใน DB เป็น +7 อยู่แล้ว** — ห้าม `$dateAdd +7` ซ้ำ

| Collection | Field | Storage | ใช้สำหรับ |
|---|---|---|---|
| `dm_dm_tn_deposit` | `bill_date` | **+7 (stored)** | Bill In, Member Bill In, sort คอล. 1–21 |
| `member` | `reg_date` | **UTC** | Register Count |
| `wallet_withdraw` | `approve_date` | **UTC** | Withdraw, Revenue (ฝั่งถอน) |

> Deposit: ไม่ใช้ `approve_date` เป็นวันที่ report — ใช้ `bill_date` เท่านั้น

---

## member

**Collection:** `gpp_777ww.member`  
**Documents:** 5,398,283  
**Primary key:** `_id`  
**Natural key:** `ou_id` + `username`

### Identity & organization

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `_id` | ObjectId | N | Primary key — member ID |
| `ou_id` | ObjectId | N | Organization unit (tenant) |
| `branch_id` | ObjectId | N | Branch ที่สมาชิกสังกัด |
| `agent_id` | ObjectId | Y | Agent (มักเป็น null) |
| `member_type` | String | N | ประเภทสมาชิก e.g. `"0"` |
| `username` | String | N | Login ID e.g. `7W0635268288` |

### Personal profile

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `prefix` | String | Y | คำนำหน้าชื่อ |
| `f_name` | String | N | ชื่อ |
| `m_name` | String | Y | ชื่อกลาง |
| `l_name` | String | N | นามสกุล |
| `gender` | String | Y | เพศ e.g. `"2"` |
| `birthdate` | Date | Y | วันเกิด |
| `country_code` | String | N | รหัสประเทศโทรศัพท์ e.g. `"+66"` |
| `tel` | String | N | เบอร์โทร (ไม่รวม country code) |
| `email` | String | N | อีเมล |
| `language` | String | N | ภาษา e.g. `"en"` |

### Authentication & security

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `password_type` | String | N | ประเภทรหัสผ่าน e.g. `"0"`, `"1"` |
| `password` | String | N | รหัสผ่าน (hashed) — **sensitive** |
| `password_patern_status` | String | N | สถานะ pattern รหัสผ่าน |
| `password_patern` | String | Y | pattern รหัสผ่าน |
| `password_fail` | Number | N | จำนวนครั้งที่ใส่รหัสผ่านผิด |
| `io_session` | String | Y | session id ขณะ online |

### Registration & activity

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `reg_ip` | String | N | IP ตอนสมัคร |
| `reg_date` | Date | N | วันเวลาสมัคร (UTC) — **Register Count** |
| `reg_mode` | String | N | โหมดการสมัคร |
| `last_login_ip` | String | Y | IP login ล่าสุด |
| `last_login_date` | Date | Y | วันเวลา login ล่าสุด |
| `second_last_login_date` | Date | N | login ก่อนหน้าล่าสุด |
| `last_action_date` | Date | Y | วันเวลา action ล่าสุด |
| `online_status` | String | N | สถานะ online e.g. `"0"`, `"1"` |

### Referral & marketing channel

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `referral` | String | N | ช่องทางสมัคร e.g. `"Branch"` — **ใช้ Direct grouping** |
| `referral_uid` | ObjectId | Y | FK → `member._id` ผู้แนะนำ — **Member Referral** |
| `referral_code` | String | N | รหัส referral / affiliate e.g. `"200001k"` |
| `referral_qrcode` | String | Y | ไฟล์ QR code referral |
| `referral_staff_id` | ObjectId | Y | FK staff affiliate (BO) |
| `referral_staff_link_id` | ObjectId | Y | FK → `su_staff_invite_link._id` — **Affiliate Link grouping** |

### Status flags

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `status` | String | N | สถานะสมาชิก e.g. `"1"` active |
| `status_promotion` | String | N | สถานะโปรโมชัน |
| `status_new_member` | String | N | สถานะสมาชิกใหม่ |
| `status_insert_member_data` | String | N | สถานะ insert data |
| `status_migrate` | String | N | สถานะ migration e.g. `"2"` |
| `sms_status` | String | N | สถานะ SMS |
| `email_status` | String | N | สถานะ email |
| `point_status` | String | N | สถานะ point |
| `mem_bank_acc_verify` | String | N | ยืนยันบัญชีธนาคาร |
| `mem_likeshare` | String | N | like/share status |
| `member_warning_status` | String | N | สถานะเตือนสมาชิก |
| `tel_verify` | String | N | สถานะยืนยันเบอร์ |
| `crmos_send` | String | N | ส่ง CRM OS |
| `email_send` | String | N | ส่ง email |
| `sms_send` | String | N | ส่ง SMS |

### LINE integration

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `uid_line` | String[] | N | LINE user IDs |

### Audit trail

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `cr_by` | String | N | ผู้สร้าง e.g. `"MIGRATE"` |
| `cr_date` | Date | Y | วันสร้าง record |
| `cr_prog_id` | String | Y | โปรแกรมที่สร้าง |
| `upd_by` | String | N | ผู้แก้ไขล่าสุด |
| `upd_date` | Date | N | วันแก้ไขล่าสุด |
| `upd_prog` | String | N | โปรแกรมที่แก้ไข |
| `tel_cr_by` | String | N | ผู้สร้างเบอร์ |
| `tel_cr_date` | Date | N | วันสร้างเบอร์ |
| `tel_upd_by` | String | N | ผู้แก้เบอร์ |
| `tel_upd_date` | Date | N | วันแก้เบอร์ |

### External / promotion sync

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `external` | Document | N | ข้อมูล sync ภายนอก |
| `external.promotion.status` | String | N | สถานะ sync promotion e.g. `"200"` |
| `external.promotion.date` | Date | N | วัน sync promotion |

### Migration fields

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `migrate_member_tree` | String | N | migration member tree |
| `migrate_login` | String | N | migration login flag |
| `migrate_username` | String | N | username จากระบบเก่า |
| `migrate_password` | String | N | password เก่า — **sensitive** |
| `migrate_salt` | String | N | salt — **sensitive** |
| `migrate_salt2` | String | N | salt2 — **sensitive** |
| `migrate_qrcode` | String | N | QR migration |
| `migrate_code_upd_date` | Date | N | วันอัปเดต code migration |
| `migate_change_pass` | String | N | เปลี่ยนรหัสผ่าน migration |
| `migrate_tel_mmk` | String | N | เบอร์ MMK migration |
| `ban_by_tel` | String | N | ban ตามเบอร์ |
| `lock_by` | String | Y | ผู้ lock |
| `lock_date` | Date | Y | วัน lock |

---

## dm_dm_tn_deposit

**Collection:** `gpp_777ww.dm_dm_tn_deposit`  
**Documents:** 18,765,956  
**Primary key:** `_id`  
**Foreign key:** `mem_id` → `member._id`

### Identity & organization

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `_id` | ObjectId | N | Primary key — deposit document |
| `ou_id` | ObjectId | N | Organization unit |
| `branch_id` | ObjectId | N | Branch |
| `operate_branch_id` | ObjectId | N | Branch ที่ operate |
| `agent_id` | ObjectId | Y | Agent |
| `main_doc_type` | ObjectId | N | ประเภทเอกสารหลัก |
| `sub_doc_type` | ObjectId | N | ประเภทเอกสารย่อย |

### Member reference

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `mem_id` | ObjectId | Y | FK → `member._id` (null ถ้ายัง match ไม่ได้) |
| `username` | String | Y | username สมาชิก (denormalized) |
| `status_member` | String | N | สถานะสมาชิก ณ เวลาฝาก |

### Bank transaction references

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `bank_transaction_id` | ObjectId | Y | FK bank transaction |
| `sms_transaction_id` | ObjectId | Y | FK SMS transaction |
| `ref_tn_cashier_id` | String | Y | ref cashier |
| `ref_web_depid` | String | Y | ref web deposit |
| `ref_fast_dep_id` | ObjectId | N | ref fast deposit |
| `ref_deposit_3rd` | String | N | ref 3rd party deposit |
| `cashier_id` | String | Y | cashier id |
| `h2p_id` | String | Y | H2P payment id |
| `transaction_id` | String | Y | external transaction id |

### Source bank (from)

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `from_bank_id` | ObjectId | Y | ธนาคารต้นทาง |
| `from_bank_name` | String | Y | ชื่อธนาคารต้นทาง e.g. `"KBANK"` |
| `from_acc_id` | ObjectId | Y | บัญชีต้นทาง |
| `from_acc_no` | String | Y | เลขบัญชีต้นทาง |
| `from_acc_name` | String | Y | ชื่อบัญชีต้นทาง |

### Destination bank (to)

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `to_bank_id` | ObjectId | Y | ธนาคารปลายทาง |
| `to_bank_name` | String | Y | ชื่อธนาคารปลายทาง e.g. `"SCB"` |
| `to_acc_id` | ObjectId | Y | บัญชีปลายทาง |
| `to_acc_no` | String | Y | เลขบัญชีปลายทาง |
| `to_acc_name` | String | Y | ชื่อบัญชีปลายทาง |

### Amount & dates

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `amt` | Number | N | จำนวนเงินฝาก — **Bill In** |
| `amt_transfer` | Number | N | จำนวนโอนจริง |
| `money_bye` | Number | N | ส่วนต่าง/ค่าธรรมเนียม |
| `bill_date` | Date | Y | วันเวลาตามสลิป — **+7 stored ใน DB แล้ว** (วันที่ report ฝาก; ห้าม offset ซ้ำ) |
| `doc_date` | Date | N | วันเวลาสร้างเอกสาร |
| `transaction_date` | Date | N | วัน transaction |
| `request_date` | Date | N | วันขอฝาก |
| `approve_date` | Date | Y | วันอนุมัติ (ไม่ใช้เป็นวันที่ report — ใช้ `bill_date` แทน) |
| `time_out_date` | Date | N | วันหมดเวลา |

### Status & workflow

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `status` | String | N | สถานะเอกสาร — **สำเร็จ** = `001`, `002`, `004`, `006`, `007`, `008`, `009`, `010` |
| `status_wallet` | String | N | สถานะ wallet `"0"`/`"1"` — `1` = credited (ไม่ใช้ filter สำเร็จใน report) |
| `status_promotion` | ObjectId[] | N | โปรโมชันที่เกี่ยวข้อง |
| `status_msg` | String | N | สถานะ message |
| `status_migrate` | String | N | สถานะ migration |
| `full_transfer` | String | N | โอนเต็มจำนวน |
| `verify_status` | String | N | สถานะ verify |
| `verify_by` | String | Y | ผู้ verify |
| `verify_date` | Date | Y | วัน verify |
| `wave_money_type` | String | N | ประเภท Wave Money |
| `status_wave_money` | String | Y | สถานะ Wave Money |
| `etl` | String | N | ETL flag |

### Approval & comments

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `request_by` | String | N | ผู้ขอ e.g. `"auto deposit"` |
| `approve_by` | String | Y | ผู้อนุมัติ |
| `order_comment` | String | Y | หมายเหตุ order |
| `operate_comment` | String | Y | หมายเหตุ operate |
| `lock_by` | String | Y | ผู้ lock |
| `lock_date` | Date | Y | วัน lock |
| `err_desc` | String | N | คำอธิบาย error |

### Slip & media

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `bill_slip` | String / Boolean | Y | ไฟล์สลิป e.g. `"5f50a32b....png"` |
| `upload_image` | String | N | รูปที่ upload |

### Payment integrations

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `kbzpay` | String | Y | KBZ Pay flag |
| `kbzpay_transaction_no` | String | Y | KBZ Pay transaction no |
| `kbzpay_transaction_input` | String | Y | KBZ Pay input |
| `pay_type` | String | Y | ประเภทการจ่าย |

### Marketing channel

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `bank_acc_group_data` | Document | N | กลุ่มบัญชี + channel |
| `bank_acc_group_data.group_id` | ObjectId[] | Y | กลุ่มบัญชี |
| `bank_acc_group_data.channel_id` | ObjectId | N | **Marketing channel ID** |

### Currency exchange

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `exchange_rate` | Document | N | อัตราแลกเปลี่ยน |
| `exchange_rate.currency` | String | N | สกุลเงิน |
| `exchange_rate.source_amt` | Number | N | จำนวนต้นทาง |
| `exchange_rate.target_amt` | Number | N | จำนวนปลายทาง |
| `exchange_rate.buying_rate` | Number | N | อัตราซื้อ |
| `exchange_rate.selling_rate` | Number | N | อัตราขาย |
| `exchange_rate.ref_id_setting_currency` | ObjectId | N | FK setting currency |

### Level & external

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `current_level` | ObjectId | Y | level ปัจจุบัน |
| `second_level` | ObjectId | Y | level ที่สอง |
| `external` | Document | N | sync ภายนอก |
| `external.promotion.status` | String | N | promotion sync status |
| `external.promotion.date` | Date | N | promotion sync date |
| `duplicate_with` | ObjectId[] | N | รายการซ้ำ |

### Audit

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `ip` | String | N | IP address |
| `cr_by` | String | N | ผู้สร้าง |
| `cr_date` | Date | N | วันสร้าง |
| `cr_prog` | String | Y | โปรแกรมสร้าง |
| `upd_by` | String | N | ผู้แก้ไข |
| `upd_date` | Date | N | วันแก้ไข |
| `upd_prog` | String | Y | โปรแกรมแก้ไข |

---

## wallet_withdraw

**Collection:** `gpp_777ww.wallet_withdraw`  
**Documents:** 3,296,570  
**Primary key:** `_id`  
**Foreign key:** `uid` → `member._id`

### Identity & organization

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `_id` | ObjectId | N | Primary key — withdraw document |
| `ou_id` | ObjectId | N | Organization unit |
| `branch_id` | ObjectId | N | Branch |
| `operate_branch_id` | ObjectId | N | Branch ที่ operate |
| `agent_id` | ObjectId | Y | Agent |
| `main_doc_type` | ObjectId | N | ประเภทเอกสารหลัก |
| `sub_doc_type` | ObjectId | Y | ประเภทเอกสารย่อย |
| `ref_id` | ObjectId | N | reference document id |

### Member reference

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `uid` | ObjectId | N | FK → `member._id` |
| `username` | String | N | username สมาชิก (denormalized) |

### Destination bank

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `to_bank_id` | ObjectId | N | ธนาคารปลายทาง |
| `to_bank_name` | String | N | ชื่อธนาคาร e.g. `"SCB"`, `"KBANK"` |
| `to_acc_id` | ObjectId | N | บัญชีปลายทาง |
| `to_acc_no` | String | N | เลขบัญชี |
| `to_acc_name` | String | N | ชื่อบัญชี |

### Amount & dates

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `amt` | Number | N | จำนวนเงินถอน — **Withdraw** |
| `doc_date` | Date | N | วันเวลาสร้างเอกสาร |
| `req_date` | Date | N | วันขอถอน |
| `confirm_date` | Date | Y | วันยืนยัน |
| `approve_date` | Date | Y | วันอนุมัติ — **วันที่ทำรายการสำเร็จ (UTC)** |
| `denied_date` | Date | Y | วันปฏิเสธ |
| `reject_date` | Date | Y | วันถูก reject |

### Status & workflow

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `wd_status` | String | N | สถานะถอน — **สำเร็จ** = `"200"` |
| `status_msg` | String | N | สถานะ message |
| `send_to` | String | Y | ปลายทางส่ง e.g. `"ipay"` |
| `turnover_type` | String | N | ประเภท turnover |
| `turnover` | Number | N | ยอด turnover |
| `wait_turnover_check` | String | N | รอตรวจ turnover |
| `wait_turnover_check_date` | Date | N | วันรอตรวจ turnover |
| `auto_check_approve` | String | N | auto approve check |
| `auto_check_wd` | String | N | auto withdraw check |
| `start_date_auto_check` | Date | N | เริ่ม auto check |
| `end_date_auto_check` | Date | Y | สิ้นสุด auto check |
| `hidden_free_spin` | String | N | hidden free spin flag |
| `cal_netwin` | String | N | คำนวณ netwin |
| `channel_wd` | String | Y | channel ถอน |
| `crypto_transaction` | String | N | crypto transaction flag |
| `paytype_3rd` | String | Y | ประเภทจ่าย 3rd party |

### Approval actors

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `req_by` | String | N | ผู้ขอ (มักเป็น username) |
| `confirm_by` | String | Y | ผู้ยืนยัน |
| `denied_by` | String | Y | ผู้ปฏิเสธ |
| `approve_by` | String | Y | ผู้อนุมัติ e.g. `"auto"` |
| `reject_by` | String | Y | ผู้ reject |

### Remarks & media

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `remark` | String | Y | หมายเหตุ |
| `remark_ipay` | String | Y | หมายเหตุ ipay |
| `image` | String[] | Y | รูปแนบ |
| `image_ss` | String[] | Y | screenshot |
| `bill_slip` | String | N | สลิป |

### Turnover period

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `length_date` | Document | N | ช่วงเวลา turnover |
| `length_date.date_from` | Date | N | วันเริ่ม |
| `length_date.date_to` | Date | N | วันสิ้นสุด |
| `length_date.type` | String[] | N | ประเภท |

### Game lock-in/out (embedded array)

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `lock_in_out` | Document[] | N | รายการ lock in/out เกม |
| `lock_in_out[]._id` | String | N | id |
| `lock_in_out[].ref_id` | String | N | reference |
| `lock_in_out[].type` | String | N | ประเภท |
| `lock_in_out[].game_comp` | String | N | game company |
| `lock_in_out[].game_id` | String | N | game id |
| `lock_in_out[].ref_wt_id` | String | N | wallet transaction ref |
| `lock_in_out[].date_in` | Date | N | วันเข้า |
| `lock_in_out[].date_out` | Date | N | วันออก |
| `lock_in_out[].amt_in` | Number | N | เงินเข้า |
| `lock_in_out[].amt_out` | Number | N | เงินออก |
| `lock_in_out[].vb` | Number | N | valid bet |
| `lock_in_out[].nw` | Number | N | net win |
| `lock_in_out[].nw_diff` | Number | N | net win diff |
| `lock_in_out[].status` | String | N | สถานะ |
| `lock_in_out[].first_log` | String | N | first log |
| `lock_in_out[].warning` | String | N | warning |
| `lock_in_out[].hidden_freespin` | String | N | hidden freespin |

### Auto-check steps (embedded array)

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `step_check_auto` | Document[] | N | ขั้นตอน auto check |
| `step_check_auto[].step_check` | String | N | ชื่อขั้นตอน |
| `step_check_auto[].status` | String | N | สถานะ |
| `step_check_auto[].start_date` | Date | Y | เริ่ม |
| `step_check_auto[].end_date` | Date | Y | สิ้นสุด |

### Wait turnover log (embedded array)

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `wait_turn_log` | Document[] | N | log รอ turnover |
| `wait_turn_log[].date` | Date | N | วัน |
| `wait_turn_log[].message` | String | N | ข้อความ |

### Payment detail (3rd party)

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `detail_payment` | Document | N | รายละเอียดการจ่าย |
| `detail_payment.transaction_id` | String | N | transaction id |
| `detail_payment.remaining_amount` | Number | N | ยอดคงเหลือ |
| `detail_payment.amount` | Number | N | จำนวน |
| `detail_payment.status` | String | N | สถานะ |
| `detail_payment.complete` | String | N | complete flag |
| `detail_payment.provider` | String | N | provider |
| `detail_payment.withdraw_detail` | Document[] | N | รายละเอียดย่อย |
| `detail_payment.withdraw_detail[].id` | Number | N | id |
| `detail_payment.withdraw_detail[].status` | String | N | สถานะ |
| `detail_payment.withdraw_detail[].amount` | Number | N | จำนวน |
| `detail_payment.withdraw_detail[].bill_date` | String | Y | วันสลิป |
| `detail_payment.withdraw_detail[].from_bank` | String | N | ธนาคารต้นทาง |
| `detail_payment.withdraw_detail[].from_acc_no` | String | N | เลขบัญชี |
| `detail_payment.withdraw_detail[].from_acc_name` | String | N | ชื่อบัญชี |
| `detail_payment.withdraw_detail[].desc` | String | N | คำอธิบาย |
| `detail_payment.withdraw_detail[].bill_slip` | String | Y | สลิป |

### Currency exchange

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `exchange_rate` | Document | N | อัตราแลกเปลี่ยน |
| `exchange_rate.ref_id_setting_currency` | ObjectId | Y | FK setting currency |
| `exchange_rate.currency` | String | N | สกุลเงิน |
| `exchange_rate.source_amt` | Number | N | จำนวนต้นทาง |
| `exchange_rate.target_amt` | Number | N | จำนวนปลายทาง |
| `exchange_rate.selling_rate` | Number | N | อัตราขาย |
| `exchange_rate.buying_rate` | Number | N | อัตราซื้อ |

### Audit

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `ip` | String | N | IP address |
| `cr_by` | String | N | ผู้สร้าง |
| `cr_date` | Date | N | วันสร้าง |
| `cr_prog` | String | N | โปรแกรมสร้าง e.g. `"Wallet Withdraw"` |
| `upd_by` | String | Y | ผู้แก้ไข |
| `upd_date` | Date | N | วันแก้ไข |
| `upd_prog` | String | N | โปรแกรมแก้ไข e.g. `"receiveipay"` |

---

## su_staff_invite_link

**Collection:** `gpp_777ww.su_staff_invite_link`  
**Documents:** 2,982  
**Primary key:** `_id`  
**Natural key:** `invite_code`

ลิงก์เชิญชวนของ staff (BO Affiliate) — สมาชิกที่สมัครผ่านลิงก์จะมี `member.referral_staff_link_id` ชี้มาที่ `_id` ของ record นี้

### Identity & organization

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `_id` | ObjectId | N | Primary key — invite link ID; FK จาก `member.referral_staff_link_id` |
| `ou_id` | ObjectId | N | Organization unit |
| `branch_id` | ObjectId | N | Branch (บาง record อาจไม่มีใน sample แต่มี index) |
| `agent_id` | ObjectId | Y | Agent (มักเป็น null) |
| `staff_id` | ObjectId | N | FK → BO staff user; สอดคล้องกับ `member.referral_staff_id` |
| `username` | String | N | username ของ staff e.g. `"BERLIN"`, `"ADMIN_BO"` |

### Invite link details

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `invite_code` | String | N | รหัส affiliate e.g. `"3000001"` — ใช้ grouping/report |
| `description` | String | Y | ชื่อแคมเปญ/ช่องทาง e.g. `"line777ww7"`, `"testlandingpage"` |
| `qrcode` | String | N | ไฟล์ QR code e.g. `"5f50ec12....png"` |

### Audit

| Field | Type | Nullable | Description |
|---|---|:---:|---|
| `cr_by` | String | N | ผู้สร้าง |
| `cr_date` | Date | N | วันสร้าง |
| `cr_prog` | String | N | โปรแกรมสร้าง e.g. `"INSERT INVITE LINK"` |
| `upd_by` | String | N | ผู้แก้ไข |
| `upd_date` | Date | N | วันแก้ไข |
| `upd_prog` | String | N | โปรแกรมแก้ไข |
| `etl` | String | N | ETL flag |

### Relationships

| Direction | Join | Cardinality | Notes |
|---|---|:---:|---|
| `su_staff_invite_link` → `member` | `su_staff_invite_link._id` = `member.referral_staff_link_id` | 1:N | สมาชิกที่สมัครผ่านลิงก์นี้ |
| `su_staff_invite_link` → staff | `su_staff_invite_link.staff_id` | N:1 | staff เจ้าของลิงก์ (collection ภายนอก scope) |
