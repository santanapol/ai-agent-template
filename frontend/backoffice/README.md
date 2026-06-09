# Zero Platform — Frontend (back-office)

Vite + React + Ant Design admin UI for **Zero Platform**. Proxies `/api` → gateway and `/auth` → auth in dev ([`vite.config.ts`](./vite.config.ts)).

## Document map (package SoT)

| Document | Purpose |
| :--- | :--- |
| [`docs/ui-ux-design.md`](./docs/ui-ux-design.md) | UX/UI — Staff Management, My Profile, login |
| [`docs/api-mapping.md`](./docs/api-mapping.md) | UI actions → HTTP endpoints |
| [`docs/sitemap-and-flows.md`](./docs/sitemap-and-flows.md) | Routes and user flows |
| [`docs/ux-writing.md`](./docs/ux-writing.md) | Copy and tone |
| [`docs/design-system.md`](./docs/design-system.md) | Ant Design tokens |
| [`docs/design-password-management.md`](./docs/design-password-management.md) | Password UI spec (**pending implementation**) |
| [`RUNBOOK.md`](./RUNBOOK.md) | Local development setup and troubleshooting |

Backend contracts: [`../services/staff/docs/`](../services/staff/docs/) · [`../auth/docs/`](../auth/docs/)

## Scripts

```bash
npm run dev      # http://localhost:5174
npm run lint
npm run build
```

## Standards

- Org: [`_coding-standards/frontend-bo/`](../../_coding-standards/frontend-bo/README.md)
- Workspace: [`../../AGENTS.md`](../../AGENTS.md)

## Last updated

2026-05-26 — Package README + doc map (password spec)
