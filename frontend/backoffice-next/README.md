# Zero Platform — Backoffice (Next.js)

Production admin UI on **Next.js 16** + studio-admin shell patterns. Replaces `frontend/backoffice` (Vite) for deploy.

## Stack

- Next.js App Router (`src/app/`)
- Business views ported to `src/views/` (from Vite `pages/`)
- Auth: memory JWT + HttpOnly refresh via `/auth` (same-origin)
- API: `/api` → gateway (dev rewrites in `next.config.mjs`)

## Scripts

```bash
npm ci --legacy-peer-deps
npm run dev      # http://localhost:3005
npm run build
npm run start    # production on :3005
npm test
npm run lint
```

## Environment

Copy `.env.local.example` → `.env.local` for local mesh bypass headers.

Staging: `.env.staging.example` → `.env.staging` on server.

## Deploy

- PM2 app: `zero-backoffice` (`next start -p 3005`)
- nginx: proxy `/` → `:3005`; `/api`, `/auth` → gateway `:3000`

See [docs/exec-plans/completed/backoffice-next-migration.md](../../docs/exec-plans/completed/backoffice-next-migration.md) and [docs/specs/frontend/backoffice-next/backoffice-next-spec.md](../../docs/specs/frontend/backoffice-next/backoffice-next-spec.md).
