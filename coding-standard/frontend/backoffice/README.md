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
| **`1-tech-stack.md`** | บังคับใช้ React 19, Vite, shadcn/ui + Tailwind v4, และ TypeScript Strict Mode |
| **`2-folder-structure.md`** | กฎการแบ่งโครงสร้างโฟลเดอร์ เช่น `assets`, `pages`, `contexts`, `lib` |
| **`3-routing-and-pages.md`** | การใช้ React Router, กฎของหน้า Protected และการเตรียมหน้า Error (404/500) |
| **`4-state-management.md`** | การจัดการ Global State ด้วย Context API และ Local State ด้วย useState |
| **`5-api-integration.md`** | การกำหนดค่า Axios, การดักจับ API Error, และกระบวนการ Auto Refresh Token |
| **`6-ui-and-styling.md`** | กฎการใช้ shadcn/ui, CSS variables / design tokens และข้อห้ามในการ Custom CSS |
| **`7-authentication.md`** | การประมวลผล Auth Flow, เก็บ Access Token ลง Memory และ Decode JWT |
| **`8-error-handling.md`** | การโชว์ Alert, Message แจ้งเตือนผู้ใช้เมื่อเกิด API Error |
| **`9-operations-and-deployment.md`** | กฎการตั้งชื่อ Environment Variables (`VITE_`) และการ Build |
| **`10-code-quality.md`** | กฎบังคับเรื่อง ESLint 10, TypeScript-eslint, และ Prettier |