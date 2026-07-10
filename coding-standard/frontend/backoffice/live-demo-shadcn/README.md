# live-demo-shadcn

Minimal **Vite + React + shadcn** scaffold for layout/template previews only.

## Not production

| Use this for | Do not use this for |
| :--- | :--- |
| Visual reference of page templates under `src/templates/` | Org coding rules, lint, auth, API, or deploy |
| Trying a layout composition before porting to Next | A second backoffice app |

**Source of truth for agents and PRs:**

1. [`../01-tech-stack.md`](../01-tech-stack.md) … [`../10-code-quality.md`](../10-code-quality.md)
2. Production app: [`frontend/backoffice-next`](../../../../frontend/backoffice-next/)

Org lint/format is **Biome** in `backoffice-next`. This scaffold may ship Oxlint/Vite defaults — ignore those as org policy.

## Run (optional)

```bash
npm ci
npm run dev
```

When porting UI into production, follow `backoffice-next` patterns (`views/`, `components/layout`, `list-page`, API menus) — not this Vite entrypoint.
