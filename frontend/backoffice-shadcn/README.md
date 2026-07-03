# Zero Platform — Backoffice (shadcn/ui)

Vite + React + shadcn/ui + Tailwind v4 admin UI for **Zero Platform**. Feature parity with [`../backoffice`](../backoffice) (Ant Design). Proxies `/api` → gateway and `/auth` → auth in dev ([`vite.config.ts`](./vite.config.ts)).

## Scripts

```bash
npm run dev      # http://localhost:5175
npm run lint
npm run build
npm test
```

## Local development

1. Install dependencies in **this folder** (`npm install`), not only at the monorepo root.
2. Start backend services from their own directories (auth `3001`, gateway `3000`, staff `3101`, agent-invoice `3102`, smart-report `3103`, branch-report `3015`, demo-service `3002`). Workspace packages need `npm install --install-strategy=nested --workspaces=false` in each service folder.
3. Copy [`.env.local.example`](./.env.local.example) to `.env.local` when calling staff APIs directly in dev.
4. Run `npm run dev` and open http://localhost:5175/login (seed user: `platform_admin` / `1234`).

See [`../backoffice/RUNBOOK.md`](../backoffice/RUNBOOK.md) for full stack setup and troubleshooting.

## Standards

- Template: [`coding-standard/frontend/backoffice/live-demo-shadcn`](../../../../coding-standard/frontend/backoffice/live-demo-shadcn)
- Org: [`_coding-standards/frontend-bo/`](../../_coding-standards/frontend-bo/README.md)
- Workspace: [`../../AGENTS.md`](../../AGENTS.md)
