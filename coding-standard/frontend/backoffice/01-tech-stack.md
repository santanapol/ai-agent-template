# 1. Tech Stack & Dependencies

| Layer | Technology / Specification |
| :--- | :--- |
| **Framework** | `Next.js 16` (App Router, React Compiler enabled) |
| **UI Library** | `React 19` |
| **Language** | `TypeScript` (Strict Mode) |
| **Routing** | Next.js file-based App Router — route groups (e.g. `(main)`) |
| **UI Components** | `shadcn/ui` (style `radix-nova`) + `radix-ui` + `Tailwind CSS v4` + `lucide-react` |
| **State (UI/preferences)** | `zustand` (vanilla store + React provider) |
| **State (domain/session)** | React Context (`AuthContext`) |
| **Forms** | `react-hook-form` + `zod` (via `@hookform/resolvers`) |
| **Tables** | `@tanstack/react-table` |
| **HTTP Client** | `axios` |
| **Testing** | `vitest` + `@testing-library/react` (jsdom) |
| **Lint / Format** | `biome` (not ESLint/Prettier) |
| **Toasts / feedback** | `sonner` |

`vite`/`@vitejs/plugin-react` appear in `devDependencies` only to power Vitest's transform — the app itself is built and served by Next.js (`next build`/`next dev`), not Vite.

## App paths

| App | Path | Status |
| :--- | :--- | :--- |
| **backoffice-next** | `frontend/backoffice-next` | **Production** — Next.js, studio shell + domain views |
| **live-demo-shadcn** (template) | `coding-standard/frontend/backoffice/live-demo-shadcn` | Reference scaffold for new shadcn pages |
| **studio-admin** (reference) | `coding-standard/frontend/backoffice/reference/studio-admin` | Local-only, gitignored — upstream layout/design reference |

Legacy `frontend/backoffice` (Vite + React Router) removed 2026-07-08 — all frontend work targets **`frontend/backoffice-next`**.

## 📦 Package Management
* บังคับให้ใช้คำสั่งที่อ่านจาก Lockfile (`npm ci`) เมื่ออยู่บนระบบ CI/CD
* อนุญาตให้อัปเดตเวอร์ชันระดับ `minor` และ `patch` ได้อิสระ แต่หากเป็น `major` ต้องมีการรีวิวผลกระทบเสมอ
