# 3. Routing & Pages

เราใช้ **Next.js App Router** (file-based) — ไม่ใช้ `react-router-dom`

## กฎการจัดการ Route (`src/app/`)

- **Protected routes:** ทุก route ที่ต้อง login อยู่ใต้ route group `(main)/` — gate ผ่าน `MainLayoutClient` (`src/app/(main)/main-layout-client.tsx`) ที่เช็ค `useAuth()` แล้ว `router.replace("/login")` ถ้าไม่มี session พร้อม `LoadingScreen` ระหว่างรอ
- **Layout wrapper:** `(main)/layout.tsx` ประกาศ `export const dynamic = "force-dynamic"` (กัน static caching ของหน้า authenticated) แล้ว wrap ด้วย `MainLayoutClient` → `AdminLayoutShell`
- **Error pages:** บังคับให้มีเสมอ:
  - `(main)/403/page.tsx` — ไม่มีสิทธิ์เข้าถึง (Forbidden)
  - `(main)/500/page.tsx`, `app/error.tsx`, `app/global-error.tsx` — error boundary ระดับ route/root (ดู 08-error-handling.md)
  - `app/not-found.tsx` — 404

## การตั้งชื่อ

- **`src/app/<route>/page.tsx`** — เนื้อหาเฉพาะ route composition เท่านั้น เก็บ logic ไว้ที่ `src/views/<Feature>`
- **`src/views/`** — ใช้ **PascalCase** สำหรับไฟล์ view หลัก (เช่น `StaffManagement.tsx`, `InvoiceList.tsx`)
- **Server vs Client Components:** `page.tsx` เป็น Server Component โดย default — ย้าย logic ที่ interactive/ต้องใช้ browser API ไปเป็น Client Component แยก (`"use client"`) เช่น `main-layout-client.tsx`
- เพิ่ม route ใหม่ที่ต้องโชว์ใน sidebar → ลงทะเบียนที่ `src/navigation/`
