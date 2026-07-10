# AGENTS.md

## Project overview

Zero Platform **backoffice-next** — production admin UI on Next.js 16, React 19, TypeScript, Tailwind CSS v4, and shadcn/ui (`radix-nova`).

Org frontend standards: [`coding-standard/frontend/backoffice/`](../../coding-standard/frontend/backoffice/) (`01`–`10`). Prefer those docs over any studio-admin or Vite scaffold patterns.

This app’s shadcn CLI reports `base: "radix"`. Always inspect local wrappers in `src/components/ui/` — some use Radix, some use `@base-ui/react`.

<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

## shadcn skill

Use the shadcn skill for work involving shadcn/ui components, styling, composition, registries, presets, or `components.json`.

Do not modify files inside `src/components/ui/`. Customize at the call site with `cn()`, variants, and theme tokens.

## Setup

```bash
npm ci --legacy-peer-deps
npm run dev      # http://localhost:3005
```

Scripts (see `package.json`):

```bash
npm run build
npm run start    # :3005
npm run lint     # biome lint
npm run check    # biome check
npm test         # vitest run
```

## Structure (this app)

Keep feature logic in `src/views/`. Route files stay thin.

- Routes: `src/app/(main)/<path>/page.tsx` composes a view
- Auth gate: `src/app/(main)/main-layout-client.tsx`
- Shell: `src/layouts/AdminLayout.tsx` + `src/components/layout/`
- List chrome: `src/components/list-page/` + `src/components/data-table/`
- Shared UI: `src/components/`
- shadcn primitives: `src/components/ui/` (do not edit)
- Session: `src/contexts/AuthContext.tsx`
- Theme / layout prefs: `src/stores/preferences/` (+ thin `useTheme` in `ThemeContext`)
- API clients: `src/lib/*ApiClient.ts`
- RR→Next compat only: `src/navigation/compat.tsx` — **not** a sidebar registry

**Sidebar menus** come from the auth API (`AuthContext.menus`). There is no `sidebar-items.ts`. New nav entries need a route **and** backend menu/permission.

Do **not** invent studio-admin paths such as `app/(main)/dashboard/<screen>/_components/` or `navigation/sidebar/sidebar-items.ts` for this app.

## Creating or extending a screen

1. Inspect the closest existing view under `src/views/` and its `page.tsx`.
2. Add `src/app/(main)/…/page.tsx` that renders the view; keep `page.tsx` small.
3. Put interactive logic in Client Components / views (`"use client"` where needed).
4. Reuse `PageContainer`, `ListPageCard` / `PageContentCard`, `DetailContainer`, list-page toolbar pieces — see coding-standard `06-ui-and-styling.md`.
5. Use semantic theme tokens; no arbitrary hex/RGB/HSL/OKLCH unless explicitly required.
6. Ensure backend menus/permissions expose the path if it should appear in the sidebar.
7. Handle loading, empty, error, and disabled states; keep keyboard/focus accessibility.

## Code conventions

- TypeScript strict; avoid `any`.
- `@/` import aliases.
- Biome: double quotes, semicolons, two-space indent, sorted imports, 120-character line width.
- Tests: co-located `*.test.tsx` (or `views/<feature>/test/`); run `npm test`.
- Keep changes focused; do not refactor unrelated files.
