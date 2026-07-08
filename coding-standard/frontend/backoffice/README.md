# Frontend Standards

มาตรฐานสำหรับการพัฒนาโปรเจกต์ฝั่ง **Frontend (Web Applications)** ทั้งหมดในองค์กร

## Reference apps (not production)

| Path | Use |
|------|-----|
| [`live-demo-shadcn/`](./live-demo-shadcn/) | Minimal Vite + shadcn starter aligned with org stack |
| [`reference/studio-admin/`](./reference/studio-admin/) | Next.js admin UI/layout patterns — **local-only (gitignored)**; see [`reference/REFERENCE-PINS.md`](./reference/REFERENCE-PINS.md) |
| Production app | [`frontend/backoffice-next`](../../../frontend/backoffice-next/) — Next.js backoffice (studio shell + domain views) |

---

## 📂 โครงสร้างไฟล์ 10 หมายเลขสากล (Universal Numbering)

เพื่อให้มาตรฐานอ่านง่ายและหลอมรวมเป็นเนื้อเดียวกับระบบ Backend เราจึงยึดใช้โครงสร้าง "10 หมายเลขสากล" โดยปรับประยุกต์เนื้อหาหมายเลขตรงกลางให้เข้ากับบริบทของ React และหน้าบ้าน (Frontend) โดยเฉพาะค่ะ:

| ไฟล์ | หมวดหมู่ / เนื้อหาหลัก |
| :--- | :--- |
| **`01-tech-stack.md`** | Next.js 16 (App Router), React 19, shadcn/ui + Tailwind v4, zustand + Context, TypeScript Strict Mode |
| **`02-folder-structure.md`** | Co-location ตาม route ของ App Router — `app/`, `views/`, `components/`, `contexts/`, `stores/`, `lib/` |
| **`03-routing-and-pages.md`** | App Router (route groups), auth gate ผ่าน `MainLayoutClient`, หน้า Error (403/404/500) |
| **`04-state-management.md`** | Context สำหรับ session/permission, Zustand สำหรับ UI/preferences, local state ปกติ |
| **`05-api-integration.md`** | Axios client ต่อโดเมน, single-flight refresh token, same-origin path ผ่าน Next.js rewrites |
| **`06-ui-and-styling.md`** | shadcn/ui + Tailwind v4 tokens ใน `globals.css`, next-themes + Zustand สำหรับ theme |
| **`07-authentication.md`** | Auth flow, เก็บ Access Token ลง Memory, silent refresh, Decode JWT |
| **`08-error-handling.md`** | Toast แจ้งเตือนผ่าน sonner, Next.js error boundaries (`error.tsx`/`global-error.tsx`/`not-found.tsx`) |
| **`09-operations-and-deployment.md`** | Environment variables (`NEXT_PUBLIC_`), `next build`, deploy ผ่าน PM2 |
| **`10-code-quality.md`** | Biome (lint + format), TypeScript strict, Vitest |