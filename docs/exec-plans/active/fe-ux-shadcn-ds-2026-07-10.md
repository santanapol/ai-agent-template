---
status: active
created: 2026-07-10
updated: 2026-07-10
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

## Decision log

- 2026-07-10: Dashboard shortcuts ใช้ `Link` + `buttonVariants` ไม่ใช้ polymorphic `Button render={<Link>}`
- 2026-07-10: RolePermissions empty → `onGoToCatalog` จาก PermissionAdmin `setActiveTab("menus")`
- 2026-07-10: EmptyMedia required เฉพาะ page-level; in-table optional
- 2026-07-10: SearchDialog แก้ copy เท่านั้น (ไม่เปลี่ยน CommandItem เป็น Link)
- 2026-07-10: ไม่รวม FE-REV network-audit follow-ups (คนละแผน)

## Scope

| In | Out |
|----|-----|
| Empty API on DataTableView/StaffTable + call-site CTAs | `src/components/ui/` edits |
| SelectGroup wrap | Search ⌘K / CommandItem→Link |
| space-y → flex/gap (นอก ui/) | Unify legacy DataTable |
| NavMain + Dashboard real links | Delete StatCard.tsx |
| Copy/a11y polish | FE-REV-* network audit |

## Tasks

1. Shared Empty API + call-site CTAs
2. SelectGroup compliance
3. Replace `space-y-*` outside `ui/`
4. NavMain/Dashboard Link + SearchDialog copy
5. Copy / a11y polish

Checkpoints: A after 1–3; B after 4–5 (`npm test` + `npm run check` in `frontend/backoffice-next`)
