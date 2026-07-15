# branch-report — Business domain

> Entry: [branch-report-spec.md](./branch-report-spec.md) · **implemented**

## 1. Scope

| In scope | Out of scope |
|----------|--------------|
| List affiliate invite links (dropdown) | CRUD invite links |
| Royalty 21 Times member report (21 deposit slots) | Write-back to branch DB |
| Channel segmentation (`affiliate_link`, `member_referral`, `direct`) | Cross-OU admin views |

## 2. Channel types (**OBSERVED** `channel-filter.js`)

| `channelType` | Filter rule |
|---------------|-------------|
| `affiliate_link` | `referral_staff_link_id` = `inviteLinkId` (required) |
| `member_referral` | `referral` = `Member` |
| `direct` | `referral` = `Branch` |

ทุก channel filter ด้วย `ou_id` + `branch_id` จาก mesh headers

## 3. Royalty 21 Times report

Per-member row: `username`, `register`, `billin`, `withdraw`, `promotion`, `revenue`, `deposits[21]`

- Registration window: `regDateFrom` / `regDateTo` (YYYY-MM-DD)
- Pagination: `page`, `pageSize` (default 50)
- Aggregates จาก `dm_dm_tn_deposit` + `wallet_withdraw` (**OBSERVED** `member-metrics.js`)

## 4. Tenancy

Mandatory `x-user-ou` + `x-user-branch` on business routes (`user-context` plugin, `requireBranch: true`)

## 5. Legacy docs

Package `docs/` และ shipped mission specs under `docs/SPEC-*.md` — superseded by central spec folder; อ้างอิง code เป็นหลัก
