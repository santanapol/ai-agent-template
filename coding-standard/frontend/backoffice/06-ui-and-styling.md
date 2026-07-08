# 6. UI & Styling

**`frontend/backoffice-next`** ใช้ **shadcn/ui** (style `radix-nova`) + **Tailwind CSS v4** เป็น UI stack เดียว — ไม่มี Ant Design

## 🎨 Design tokens (CSS variables)

- โทนสีและ radius อยู่ที่ `src/app/globals.css` ผ่าน CSS custom properties — กำหนดค่าใน `components.json` (`baseColor: neutral`, `cssVariables: true`)
- Theme presets เพิ่มเติมอยู่ที่ `src/styles/presets/`
- Light/dark mode + preset สลับผ่าน `next-themes` ร่วมกับ Zustand preferences store (`src/stores/preferences/`) และ `ThemeSwitcher` (`src/components/layout/ThemeSwitcher.tsx`) — **ไม่มี** React Context `ThemeProvider` แยกต่างหาก

## 📐 Layout & spacing

- ใช้ Tailwind utility classes และ layout template ใน `src/components/layout/` (`PageContainer`, `DetailContainer`, `AppSidebar`, `SiteHeader`, …)
- ตาราง: `@tanstack/react-table` ผ่าน `src/components/data-table/`
- Toast/feedback: `sonner`
- Confirm dialogs: `AlertDialog` (shadcn) แทน imperative confirm

## 🧩 เพิ่ม component

- ใช้ shadcn CLI ตาม `components.json` — ดูสิ่งที่มีอยู่ใน `src/components/ui/` ก่อนเพิ่มใหม่เสมอ
- **ห้ามแก้ไข** ไฟล์ใน `src/components/ui/` โดยตรง — ปรับแต่งที่จุดใช้งานผ่าน `cn()`/variants/tokens
- ใช้ Tailwind default palette named color เท่านั้นถ้า token ที่มีอยู่ไม่พอ — **ห้าม** ใช้ hex/RGB/HSL/OKLCH ตรงๆ

## 🚫 ห้าม

- **[Forbidden]** เพิ่ม `antd` หรือ CSS-in-JS library อื่นเข้า `backoffice-next`
- **[Forbidden]** override shadcn ด้วย global CSS แทนการใช้ variants/`cn()`/tokens
