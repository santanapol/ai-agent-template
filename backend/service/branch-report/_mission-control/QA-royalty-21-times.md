# QA Sign-off — Royalty 21 Times

> Feature: Branch Report → Marketing → Channel Performance  
> Date: 2026-06-29 (browser QA reg-date: 2026-06-29)  
> Environment: local dev — gateway `:3000`, branch-report `:3015`, frontend `:5173`, Atlas `gpp_777ww`

## Automated verification (passed)

| Check | Evidence |
|---|---|
| Backend unit + integration (`npm test`) | **70 passed** — includes reg-date-range, royalty API validation |
| Frontend Royalty 21 Times (`vitest` scoped) | **12 passed** — DatePickers, API client, SearchForm, ChannelPerformancePage |
| OpenAPI (`npm run spec:lint`) | Spectral — 0 errors |
| Gateway tests (`npm test`) | **74 passed** |

## Acceptance criteria

| AC | Requirement | Status | Verification method |
|---|---|---|---|
| AC-1 | Menu Branch Report → Marketing → Channel Performance; title Royalty 21 Times; route `/branch-report/marketing/channel-performance` | **Verified (browser)** | Login `branch_admin`; sidebar navigation; breadcrumb + title visible |
| AC-2 | Channel Type default affiliate; affiliate link required; Register From/To required, default current month; Search/Clear | **Verified (browser)** | Defaults `01/06/2026`–`30/06/2026`; affiliate combobox `{code} — {username}`; Search without link → field `invalid` |
| AC-3 | Table columns; Username/Register fixed; cols 1–21 scroll | **Code complete** | Visual not fully audited this run; table + pagination render after search |
| AC-4 | Promotion `-`; deposit 0 → `-`; summary 2 decimals; English UI | **Verified (unit)** | `royalty21Formatters.test.ts` |
| AC-5 | Invite links API: fields, sort ASC, active branch scope | **Verified (integration + browser)** | Dropdown loads options on affiliate channel |
| AC-6 | Royalty API: params incl. `regDateFrom`/`regDateTo`, tenant scope | **Verified (browser + integration)** | Network: `regDateFrom=2026-06-01&regDateTo=2026-06-30`; missing dates → `INVALID_PARAM` |
| AC-7 | Branch switch: reset, reload links, info toast | **Code complete** | Not re-tested this browser session |
| AC-8 | Standard envelope + HTTP status on success/error | **Verified (integration)** | 200 + pagination on search |
| AC-9 | No auto-fetch report on mount | **Verified (unit + browser)** | Empty table until Search clicked |
| AC-10 | `regDateFrom` ≤ `regDateTo` validation | **Verified (browser)** | Register To `01/05/2026` with From `01/06/2026` → Register To field `invalid`; API rejects inverted range |

## Browser QA results (2026-06-29)

| # | Scenario | Result | Notes |
|---|---|---|---|
| 1 | Login `branch_admin` / `1234` | **Pass** | Redirect to dashboard |
| 2 | Navigate Channel Performance | **Pass** | URL `/branch-report/marketing/channel-performance` |
| 3 | Default Register From/To = current month (local) | **Pass** | `01/06/2026` – `30/06/2026` |
| 4 | Search affiliate without link | **Pass** | Affiliate Link field `invalid`; no API call |
| 5 | AC-10 inverted dates (client) | **Pass** | Register To `invalid` after Search |
| 6 | Member Referral search (June 2026) | **Pass** | `Total 1332 members`; API ~3.3s |
| 7 | Pagination page 2 | **Pass** | `page=2&regDateFrom=2026-06-01&regDateTo=2026-06-30` preserved |
| 8 | Clear resets channel + dates | **Pass** | Back to affiliate default; dates current month |
| 9 | Affiliate link search (wide range) | **Pass** | `regDateFrom=2020-01-01`; `Total 4139 members`; ~2.2s |

## Manual QA checklist (remaining)

- [ ] Without branch: warning alert + disabled form
- [ ] Switch branch → toast + empty table until re-search (AC-7)
- [ ] API error (stop branch-report) → error message
- [ ] Visual table columns / sticky headers (AC-3)

## Sign-off

| Role | Name | Date | Result |
|---|---|---|---|
| Developer | agent | 2026-06-29 | Automated + browser QA (reg-date) passed; AC-7 / no-branch / AC-3 visual pending |
| Reviewer | | | |
