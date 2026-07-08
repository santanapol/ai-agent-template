# Studio reference pins (Phase 6)

Read-only snapshots from [arhamkhnz/next-shadcn-admin-dashboard](https://github.com/arhamkhnz/next-shadcn-admin-dashboard). **Not deployed.**

| Field | Value |
|-------|-------|
| Upstream commit | `35044736d4ef` |
| Pinned | 2026-07-08 |
| Prod app | `frontend/backoffice-next` |
| Local clone | `reference/studio-admin/` (gitignored — local design reference only) |

## Pinned files (inside local clone)

| Path | Purpose |
|------|---------|
| `src/app/(main)/dashboard/users/_components/users.tsx` | Page-level `useReactTable` state |
| `src/app/(main)/dashboard/users/_components/users-table.tsx` | Table renderer + pagination chrome |
| `src/app/(main)/dashboard/users/_components/users-columns.tsx` | `ColumnDef` pattern |
| `src/app/(main)/dashboard/tasks/_components/tasks-toolbar.tsx` | **Real** column visibility dropdown |
| `src/components/ui/pagination.tsx` | Numbered pagination UI |

## Stub vs prod (Phase 6)

| Control | Studio `users.tsx` | backoffice-next Phase 6 |
|---------|-------------------|-------------------------|
| Customize | Button stub | Column visibility dropdown (from `tasks-toolbar`) |
| Hide | Button stub | **Dropped** — merged into Customize |
| Export | Button stub | CSV/XLSX of visible columns + current page |
| List/Grid | Tabs stub | **Staff pilot only** — real grid; other lists list-only |
| Card search shortcut | N/A | None — header nav search uses `⌘J` |
| Numbered pagination | Real in `UsersTable` | Port `pagination.tsx` + server adapter |

## Refresh

```bash
SHA=35044736d4ef  # or latest main
BASE="https://raw.githubusercontent.com/arhamkhnz/next-shadcn-admin-dashboard/${SHA}"
# re-curl paths listed above into reference/studio-admin/
```
