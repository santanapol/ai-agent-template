# Staging UAT — backoffice-next cutover

**Target:** `https://zero-staging.168bits.com`  
**App:** PM2 `zero-backoffice` → Next.js `:3005`  
**Date:** 2026-07-08

## Pre-deploy (local)

- [x] `npm test` in `frontend/backoffice-next` (403+ tests)
- [x] `npm run lint` in `frontend/backoffice-next` (0 errors)
- [x] `npm run build` in `frontend/backoffice-next`
- [x] Next.js security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) in `next.config.mjs`
- [x] SmartReport server pagination + enrichment history split (automated tests)
- [x] Invoice URL filter validation + debounced search sync (automated tests)
- [x] Branch report / API error message hardening (automated tests)
- [ ] `./scripts/ci-all.sh` full harness (optional if Docker unavailable locally)
- [ ] `git push` after migration commit

## Known accepted risks (documented)

- **`xlsx` audit exception** — see [DEPENDENCY-AUDIT-EXCEPTIONS.md](./DEPENDENCY-AUDIT-EXCEPTIONS.md)
- **Nginx edge headers** — verify on staging host; app-level headers are set in Next.js

## Server deploy

On staging (`/var/www/zero-platform`):

```bash
git pull
bash scripts/deploy-staging.sh
pm2 status   # zero-backoffice online
curl -sf http://127.0.0.1:3005/ | head -c 200
```

## Nginx (once / verify)

`/etc/nginx/sites-available/zero-staging` — `location /` and `/_next/static/` → `127.0.0.1:3005`; `/api/` and `/auth/` → gateway `:3000`.

Recommended edge headers (in addition to Next.js):

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

See [server-environment/staging/RUNBOOK.md](../../../server-environment/staging/RUNBOOK.md) §6.

## Automated smoke (local → HTTPS)

```bash
SMOKE_PASSWORD='…' bash scripts/smoke-staging.sh
```

Credentials: `server-environment/staging/credential.md` (not committed).

## Manual route matrix

| Route | Desktop 1280px | Mobile 390px | Notes |
|-------|:--------------:|:------------:|-------|
| `/login` | | | Split layout, login + redirect |
| `/` | | | Metric grid (admin) / shortcuts |
| `/staff` | | | List/Grid, Customize, Export, pagination |
| `/agents` | | | Sync modal, inactive filter |
| `/agents/:id/fees` | | | Matrix scroll, dirty guard |
| `/invoices` | | | Selection bar, bulk bar safe-area, URL filters |
| `/invoices/:id` | | | Back preserves list filters |
| `/smart-reports` | | | Server pagination; list search disabled (future) |
| `/branch-report/marketing/channel-performance` | | | Royalty21 + result table |
| `/permissions` | | | Tabs, menu tree |
| `/profile` | | | Form cards, refresh |
| `/403` | | | |

## Role smoke

| Role | Menu visible | Permission gates |
|------|--------------|------------------|
| `platform_admin` | Full + branch switcher | Create staff, permissions |
| `branch_admin` | Branch-scoped | No platform-only actions |
| `staff` | Reduced menu | Read-only where expected |

## Sign-off

| Check | Owner | Date | Pass |
|-------|-------|------|:----:|
| Automated smoke | | | |
| Route matrix | | | |
| Role smoke | | | |
| Staff vs studio `:3010/dashboard/users` (visual) | | | |

After sign-off: move `docs/exec-plans/active/backoffice-next-migration.md` → `completed/`.
