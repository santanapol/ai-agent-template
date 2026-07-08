# Staging UAT — backoffice-next cutover

**Target:** `https://zero-staging.168bits.com`  
**App:** PM2 `zero-backoffice` → Next.js `:3005`  
**Date:** 2026-07-08  
**Deployed SHA:** `7aed652` (tag `v0.5.0`)

## Pre-deploy (local)

- [x] `npm test` in `frontend/backoffice-next` (403+ tests)
- [x] `npm run lint` in `frontend/backoffice-next` (0 errors)
- [x] `npm run build` in `frontend/backoffice-next`
- [x] Next.js security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) in `next.config.mjs`
- [x] SmartReport server pagination + enrichment history split (automated tests)
- [x] Invoice URL filter validation + debounced search sync (automated tests)
- [x] Branch report / API error message hardening (automated tests)
- [ ] `./scripts/ci-all.sh` full harness (optional if Docker unavailable locally)
- [x] `git push` after migration commit (tag `v0.5.0` pushed)

## Known accepted risks (documented)

- **`xlsx` audit exception** — see [DEPENDENCY-AUDIT-EXCEPTIONS.md](./DEPENDENCY-AUDIT-EXCEPTIONS.md)
- **Nginx edge headers** — proxy to `:3005` verified; app-level headers set in Next.js

## Server deploy

On staging (`/var/www/zero-platform`):

```bash
git pull
bash scripts/deploy-staging.sh
pm2 status   # zero-backoffice online
curl -sf http://127.0.0.1:3005/ | head -c 200
```

**2026-07-08:** Manual deploy completed. 2GB swap added on droplet (`/swapfile`) to avoid OOM during `npm ci` / Next build. PM2 `zero-backoffice` online; post-deploy curl checks passed.

## Nginx (once / verify)

- [x] `/etc/nginx/sites-available/zero-staging` — `location /` and `/_next/static/` → `127.0.0.1:3005`; `/api/` and `/auth/` → gateway `:3000`
- [x] HTTPS `:443` (Let's Encrypt) restored after proxy rewrite
- [x] `sudo nginx -t && sudo systemctl reload nginx`

See [server-environment/staging/RUNBOOK.md](../../../server-environment/staging/RUNBOOK.md) §6.

## Automated smoke (local → HTTPS)

```bash
SMOKE_PASSWORD='…' bash scripts/smoke-staging.sh
```

- [x] **2026-07-08** — `scripts/smoke-staging.sh` passed against `https://zero-staging.168bits.com`

Credentials: `server-environment/staging/credential.md` (not committed).

## Manual route matrix

| Route | Desktop 1280px | Mobile 390px | Notes |
|-------|:--------------:|:------------:|-------|
| `/login` | x | x | Split layout, Sign In, redirect OK |
| `/` | x | x | Dashboard, branch switcher (admin), shortcuts |
| `/staff` | x | — | List/table, empty seed OK |
| `/agents` | x | — | Sync modal, empty seed OK |
| `/agents/:id/fees` | N/A | — | No agent rows in seed — list empty |
| `/invoices` | x | — | Filters, selection bar |
| `/invoices/:id` | N/A | — | No invoice rows in seed |
| `/smart-reports` | x | — | Server pagination |
| `/branch-report/marketing/channel-performance` | x | — | Royalty21 + result table |
| `/permissions` | x | — | Tabs, menu tree (platform_admin) |
| `/profile` | x | — | Form cards |
| `/403` | x | — | Go to Dashboard |

Mobile spot-check: login + dashboard at 390×844. Remaining routes deferred — layout uses responsive sidebar; no blockers observed.

## Role smoke

| Role | Menu visible | Permission gates | Pass |
|------|--------------|------------------|:----:|
| `platform_admin` | Full + branch switcher | Create staff, permissions, all routes | x |
| `branch_admin` | Branch-scoped (777WW) | No Permissions menu; direct `/permissions` → 403 | x |
| `staff` | Reduced (777WW) | No Permissions, no Create staff | x |

## Sign-off

| Check | Owner | Date | Pass |
|-------|-------|------|:----:|
| Automated smoke | Agent UAT | 2026-07-08 | x |
| Route matrix | Agent UAT | 2026-07-08 | x |
| Role smoke | Agent UAT | 2026-07-08 | x |
| Staff vs studio `:3010/dashboard/users` (visual) | — | — | — |

Exec plan moved: `docs/exec-plans/completed/backoffice-next-migration.md`.
