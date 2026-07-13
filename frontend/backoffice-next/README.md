# Zero Platform — Backoffice (Next.js)

Production admin UI on **Next.js 16**. Structure and coding rules live in this app plus [`coding-standard/frontend/backoffice/`](../../coding-standard/frontend/backoffice/). Upstream **studio-admin** is a local design/shell reference only (gitignored under coding-standard) — do not treat it as the folder or menu source of truth.

## Stack

- Next.js App Router (`src/app/`)
- Feature UI in `src/views/` (thin `page.tsx` composition)
- Auth: memory JWT + HttpOnly refresh via `/auth` (same-origin)
- API: `/api` → gateway (dev rewrites in `next.config.mjs`)
- Theme / layout prefs: Zustand preferences store
- Sidebar: auth API `menus` via `AuthContext`

## Scripts

```bash
npm ci --legacy-peer-deps
npm run dev      # http://localhost:3005
npm run build
npm run start    # production on :3005
npm test
npm run lint
npm run check
```

## Environment

Copy `.env.local.example` → `.env.local` for local mesh bypass headers.

Staging: `.env.staging.example` → `.env.staging` on server.

## Deploy

- PM2 app: `zero-backoffice` (`next start -p 3005`)
- nginx: proxy `/` → `:3005`; `/api`, `/auth` → gateway `:3000`

See [docs/exec-plans/completed/backoffice-next-migration.md](../../docs/exec-plans/completed/backoffice-next-migration.md) and agent notes in [AGENTS.md](./AGENTS.md).
