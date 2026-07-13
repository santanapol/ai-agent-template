---
status: completed
created: 2026-07-10
updated: 2026-07-12
services: [backoffice-next]
source-review: UX/UI + shadcn DS review (ui-skills-root + shadcn)
branch: fix/fe-ux-shadcn-ds-2026-07-10
---

# Plan: FE UX + shadcn design-system fixes (backoffice-next)

## Objective

แก้ findings จาก UX/UI + shadcn design-system review ให้ครบ: Empty/SelectGroup/spacing compliance, real Link navigation, Dashboard hierarchy, และ polish เล็กน้อย — โดยไม่แตะ `src/components/ui/`

## Progress log

- 2026-07-10: สร้าง exec plan + branch `fix/fe-ux-shadcn-ds-2026-07-10` จาก `origin/main`; เริ่ม implement
- 2026-07-10: Tasks 1–5 implemented (Empty API, SelectGroup, space-y, Nav/Dashboard links, polish); running Checkpoint B
- 2026-07-10: Recovered truncated files mid-session; Checkpoint B targeted tests green; NavMain active-link assert updated
- 2026-07-10: Smart Report editor UX + routing (v2): `useSmartReportEditor`, routes `/smart-reports/new` + `/[id]/edit`, workflow bar polish, breadcrumb+dirty guard, NavMain prefix active; 69 targeted tests green
- 2026-07-11: `/test` full suite — 17 failures deferred as **TD-026**
- 2026-07-12: Smart Report sandbox projection fix, download history sheet polish, ToggleGroup border fix; TD-026 closed (547/547 tests); **ปิดแผน**

## Decision log

- 2026-07-10: Dashboard shortcuts ใช้ `Link` + `buttonVariants` ไม่ใช้ polymorphic `Button render={<Link>}`
- 2026-07-10: RolePermissions empty → `onGoToCatalog` จาก PermissionAdmin `setActiveTab("menus")`
- 2026-07-10: EmptyMedia required เฉพาะ page-level; in-table optional
- 2026-07-10: SearchDialog แก้ copy เท่านั้น (ไม่เปลี่ยน CommandItem เป็น Link)
- 2026-07-10: ไม่รวม FE-REV network-audit follow-ups (คนละแผน)
- 2026-07-10: Smart Report editor ใช้ `onBack`+dirty guard (ไม่ใช้ `backUrl`); Save อยู่ `DetailContainer` เท่านั้น; list navigate แทน `viewMode`

## Scope

| In | Out |
|----|-----|
| Empty API on DataTableView/StaffTable + call-site CTAs | `src/components/ui/` edits |
| SelectGroup wrap | Search ⌘K / CommandItem→Link |
| space-y → flex/gap (นอก ui/) | Unify legacy DataTable |
| NavMain + Dashboard real links | Delete StatCard.tsx |
| Copy/a11y polish | FE-REV-* network audit |

## Tasks

- [x] 1. Shared Empty API + call-site CTAs
- [x] 2. SelectGroup compliance
- [x] 3. Replace `space-y-*` outside `ui/`
- [x] 4. NavMain/Dashboard Link + SearchDialog copy
- [x] 5. Copy / a11y polish
- [x] Smart Report editor v2 (routes, hook, workflow bar, dirty guard)
- [x] Smart Report sandbox projection parity (backend `normalizeFindSecondArg`)
- [x] Download history sheet UX polish
- [x] TD-026: test harness fixes (`InvoiceList` SidebarProvider, `AdminLayout` Dashboard link query, branchSwitcher flake)

## Verification

| Gate | Result |
|------|--------|
| `npm test` (backoffice-next) | **547/547 pass** (2026-07-12) |
| Smart Report targeted suite | 69/69 pass |
| Commit | `bd7079f` on `fix/fe-ux-shadcn-ds-2026-07-10` |

## Related

- Tech debt: [`../tech-debt-tracker.md`](../tech-debt-tracker.md) (TD-026 closed)
- Network follow-ups (separate): [`fe-network-audit-review-followups-2026-07-10.md`](./fe-network-audit-review-followups-2026-07-10.md)
