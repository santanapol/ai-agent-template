# Network verify checklist — backoffice-next

Source of truth for duplicate and payload checks after API Network Audit fixes.

## Environment

| Mode | Command | Port | Dup-3 (Strict Mode) |
|------|---------|------|---------------------|
| Prod spot-check | `npm run build && npx next start -p 3006` | 3006 | **Off** — use for Dup-1 |
| Dev harness | `./scripts/dev/dev-up.sh --with-frontend` | 3005 | On — do not count ×2 as bugs |

Login: `platform_admin` / `1234`, branch **777WW** (`5f4fb5bb3156af7a2db9e5a0`).

## Mandatory routes (Phase gates)

| Route | NET / PAY | Pass criteria |
|-------|-----------|---------------|
| `/smart-reports` | NET-001 | `GET .../smart-reports/history?limit=100` **×1**; `GET .../smart-reports?page=1&limit=20` **×1** |
| `/permissions` | NET-002 | Tab switch Menu ↔ Role: `GET /auth/admin/menus` **×0** extra |
| `/invoices` | NET-004 | Full reload: `GET /api/v1/invoices/agent` **×1** |
| `/` | PAY-005 | `GET .../profiles/count?status=` **×2** (not full list rows) |
| Shell | PAY-001 | Branch switcher typeahead: `GET /auth/me/branches?q=&limit=20` on search |

## Full route inventory (14 routes)

Record incremental calls after shell warm (sidebar nav, not full reload):

1. `/login` — POST `/auth/login` on submit only
2. `/` — dashboard counts
3. `/profile` — `profiles?user_id=` ×1
4. `/smart-reports` — see above
5. `/staff` — `listProfiles` ×1 per filter change; branch switch ×1 (NET-006)
6. `/agents` — agents list ×1
7. `/agents/:id/fees` — agent + fees + master-data waterfall ×1 each
8. `/invoices` — invoices + agent branches
9. `/invoices/:id` — detail + transactions
10. `/permissions` — shared menu catalog
11. `/branch-report/.../channel-performance` — invite-links lazy/search
12–14. `/403`, `/404`, `/500` — 0 API

## Payload thresholds (audit §6)

| Endpoint | Check |
|----------|-------|
| `GET /auth/me/branches?q=77&limit=20` | < 2 KB |
| `GET .../master-data/game-companies?fields=matrix` | ≥ 50% smaller than default |
| `GET .../profiles/count?status=active` | < 100 bytes |
| `GET .../branch-report/invite-links?limit=20` | < 5 KB when seeded |

## Tools

- Chrome DevTools → Network (filter XHR/Fetch)
- CDP: `performance.getEntriesByType('resource')` after navigation
- `node scripts/ops/payload-benchmark-api-audit.mjs` (harness cookies)

## Baseline reference

See [API-NETWORK-AUDIT-2026-07-09.md](./API-NETWORK-AUDIT-2026-07-09.md) §10 Appendix B/C.
