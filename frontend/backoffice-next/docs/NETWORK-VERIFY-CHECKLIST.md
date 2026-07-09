# Network verify checklist — backoffice-next

Source of truth for duplicate and payload checks after API Network Audit fixes.

## Environment

| Mode | Command | Port | Dup-3 (Strict Mode) |
|------|---------|------|---------------------|
| Prod spot-check | `npm run build && npx next start -p 3006` | 3006 | **Off** — use for Dup-1 |
| Dev harness | `./scripts/dev/dev-up.sh --with-frontend` | 3005 | On — do not count ×2 as bugs |

Login: `platform_admin` / `1234`, branch **777WW** (`5f4fb5bb3156af7a2db9e5a0`).

**Harness gate (terminal):** `./scripts/dev/smoke.sh` after `dev-up.sh` — healthz, login, gateway proxy.

**Before verify:** restart backend if code changed (`staff`, `agent-invoice`, `branch-report`, `auth`). Clear auth throttle if login fails: `docker exec zero-platform-mongodb mongosh zero_platform_auth --quiet --eval 'db.auth_credential_throttle.deleteMany({})'`.

## How to count (important)

| Method | Use for |
|--------|---------|
| **Sidebar / shortcut nav** after shell warm | NET/PAY duplicate gates (mandatory routes) |
| **Full URL load or F5** | Payload sizing only — may show ×2 bootstrap + route (not a Dup-1 bug) |
| Chrome DevTools → Network (XHR/Fetch) | Manual spot-check |
| CDP `performance.getEntriesByType('resource')` | Automated spot-check (same rules as DevTools) |
| `node scripts/ops/payload-benchmark-api-audit.mjs` | Gateway payload bytes (Bearer token; not browser dupes) |

---

## Verification run — 2026-07-09

**Branch:** `feat/api-network-audit-fixes-2026-07-09`  
**Stack:** harness `PORT_OFFSET=0`, prod UI `next start -p 3006`  
**Actor:** `platform_admin` on branch **777WW**

### Harness smoke

| Check | Result |
|-------|--------|
| `./scripts/dev/smoke.sh` | **PASS** (all healthz, login, `/api/v1/me`, `/auth/me/branches`, backoffice shell + auth proxy) |

### Mandatory routes (Phase gates) — `:3006`, incremental nav

| Route | NET / PAY | Pass criteria | Result |
|-------|-----------|---------------|--------|
| `/smart-reports` | NET-001 | `history?…limit=100` **×1**; `smart-reports?page=1&limit=20` **×1** | **PASS** (sidebar from `/`) |
| `/permissions` | NET-002 | Tab Menu ↔ Role: `GET /auth/admin/menus` **×0** extra | **PASS** |
| `/invoices` | NET-004 | See note below | **PASS** (switch role — no `invoices/agent`) |
| `/` | PAY-005 | `profiles/count?status=` **×2** (active + archived); no full list rows | **PASS** (sidebar from `/staff`) |
| Shell | PAY-001 | Typeahead: `GET /auth/me/branches?q=…&limit=20` on search | **PASS** (`q=77&limit=20` ×1) |

**NET-004 note:** `platform_admin` / `support_*` use `branchCatalogCache` + `auth/me/branches` (PAY-002). Expect **`invoices/agent` ×0** on reload. Re-test with **`branch_admin`** if you need `invoices/agent` ×1.

### Payload thresholds — gateway curl (post service restart)

| Endpoint | Threshold | Measured |
|----------|-----------|----------|
| `GET /auth/me/branches?q=77&limit=20` | < 2 KB | **1,988 B** |
| `GET …/game-companies?fields=matrix` vs default | ≥ 50% smaller | **16,629 B → 5,640 B** (~66%) |
| `GET …/profiles/count?status=active` | < 100 bytes | **~80 B** |
| `GET …/invite-links?limit=20` | < 5 KB (when seeded) | **109 B** |

### Full route inventory — spot-check `:3006`

Incremental nav unless noted. Status for 2026-07-09 run:

| # | Route | Expected (incremental) | Result |
|---|-------|------------------------|--------|
| 1 | `/login` | POST `/auth/login` on submit only | Not re-run (session reused) |
| 2 | `/` | Dashboard `profiles/count` ×2 | **PASS** |
| 3 | `/profile` | `profiles?user_id=` ×1 | **PASS** (page loads profile; shell may cache) |
| 4 | `/smart-reports` | See NET-001 | **PASS** |
| 5 | `/staff` | `listProfiles` ×1 per filter change | **PASS** (×1 list on nav) |
| 6 | `/agents` | agents list ×1 | **PASS** (`/agents?page=1&limit=10` ×1) |
| 7 | `/agents/:id/fees` | agent + fees + matrix master-data ×1 each | Not run (manual / UAT) |
| 8 | `/invoices` | See NET-004 | **PASS** |
| 9 | `/invoices/:id` | detail + transactions | Not run (manual / UAT) |
| 10 | `/permissions` | Shared menu catalog | **PASS** |
| 11 | `/branch-report/…/channel-performance` | `invite-links` lazy on affiliate filter | **PASS** (`invite-links?limit=20` ×1 on Affiliate Link toggle) |
| 12–14 | `/403`, `/404`, `/500` | 0 API | Not run (static pages) |

---

## Mandatory routes (reference)

| Route | NET / PAY | Pass criteria |
|-------|-----------|---------------|
| `/smart-reports` | NET-001 | `GET .../smart-reports/history?limit=100` **×1**; `GET .../smart-reports?page=1&limit=20` **×1** |
| `/permissions` | NET-002 | Tab switch Menu ↔ Role: `GET /auth/admin/menus` **×0** extra |
| `/invoices` | NET-004 | **Switch roles:** `invoices/agent` **×0** (auth catalog). **Branch-pinned:** `invoices/agent` **×1** on full reload |
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
8. `/invoices` — invoices + agent branches (role-dependent)
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

## Re-run (copy-paste)

```bash
# Terminal 1 — backend
./scripts/dev/dev-up.sh

# Terminal 2 — smoke + prod UI
./scripts/dev/smoke.sh
cd frontend/backoffice-next
npm run build
AUTH_PROXY_TARGET=http://127.0.0.1:3001 GATEWAY_PROXY_TARGET=http://127.0.0.1:3000 npx next start -p 3006

# Optional payload table (Bearer via gateway :3000)
TOKEN=$(curl -sf -X POST http://127.0.0.1:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"platform_admin","password":"1234","client_kind":"native"}' \
  | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); process.stdout.write(j.access_token)")
curl -s "http://127.0.0.1:3000/auth/me/branches?q=77&limit=20" -H "Authorization: Bearer $TOKEN" | wc -c
```

Then complete mandatory routes in browser at `http://localhost:3006` per tables above.

## Baseline reference

See [API-NETWORK-AUDIT-2026-07-09.md](./API-NETWORK-AUDIT-2026-07-09.md) §10 Appendix B/C.
