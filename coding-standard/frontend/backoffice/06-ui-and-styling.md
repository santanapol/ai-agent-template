# 6. UI & Styling

**`frontend/backoffice-next`** ใช้ **shadcn/ui** (style `radix-nova`) + **Tailwind CSS v4** เป็น UI stack เดียว — ไม่มี Ant Design

Primitives ใน `src/components/ui/` อาจห่อ **Radix** หรือ **Base UI** (`@base-ui/react`) — ตรวจไฟล์ local ก่อน compose เสมอ

## Design tokens (CSS variables)

- โทนสีและ radius อยู่ที่ `src/app/globals.css` ผ่าน CSS custom properties — กำหนดค่าใน `components.json` (`baseColor: neutral`, `cssVariables: true`)
- Theme presets เพิ่มเติมอยู่ที่ `src/styles/presets/`
- Light/dark mode + preset สลับผ่าน **Zustand preferences** (`src/stores/preferences/`) และ `applyThemeMode` (`src/lib/preferences/theme-utils.ts`) ร่วมกับ `ThemeSwitcher` / `LayoutControls`
- `ThemeContext` (`src/contexts/ThemeContext.tsx`) เป็น **compat hook** (`useTheme`) ที่อ่านจาก preferences store เท่านั้น — ไม่ใช่ theme engine แยก
- **[Forbidden]** อย่าเพิ่ม `next-themes` wrapper กลับมาเป็น source of truth — theme ต้องวิ่งผ่าน preferences store

## Layout composition

Import wrappers จาก `@/components/layout` และ toolbar จาก `@/components/list-page` — ดูโค้ดจริงใน `frontend/backoffice-next` (visual scaffold เพิ่มเติม: `live-demo-shadcn/src/templates/`)

### List / directory pages

1. Root: `<PageContainer title description extra?>`
2. Body: `<ListPageCard>` (หรือ `<PageContentCard>` เมื่อไม่ต้องการ list chrome)
3. Filters / actions: `<ListPageToolbar>` + `ListPageSearch` / `InlineFilterSelect` จาก `@/components/list-page` — ห้ามจัดแถวฟิลเตอร์ด้วย layout ดิบโดยไม่มี toolbar pattern
4. Table: `@tanstack/react-table` ผ่าน `@/components/data-table/` — ให้ตารางเลื่อนแนวนอนได้เมื่อคอลัมน์แน่น

### Detail pages

1. Root: `<DetailContainer>` (มี back + ความกว้างอ่านสบาย)
2. เนื้อหาฟอร์ม/รายละเอียดอยู่ใน `<PageContentCard>` หรือ section ภายใน container
3. ใช้ semantic tokens / `DescriptionList` pattern ที่มีอยู่ — ห้าม Ant Design `Descriptions`

### Dashboard / overview

- ใช้ grid + metric cards จาก layout/demo components ที่มีอยู่ (`StatCard` หรือเทียบเท่า) + semantic theme tokens
- อย่า copy Ant Design `Row`/`Statistic`/`Card variant="borderless"`

### Error / result

- ใช้ `ResultTemplate` (`src/components/layout/ResultTemplate.tsx`) หรือ error views (`Error403` / `Error404` / `Error500`) — ดู `08-error-handling.md`

## Layout & spacing (shared chrome)

- Shell: `AppSidebar`, `SiteHeader`, `AdminLayout` (`src/layouts/AdminLayout.tsx`)
- Toast/feedback: `sonner`
- Confirm dialogs: `AlertDialog` (shadcn) แทน imperative confirm

## เพิ่ม component

- ใช้ shadcn CLI ตาม `components.json` — ดูสิ่งที่มีอยู่ใน `src/components/ui/` ก่อนเพิ่มใหม่เสมอ
- **ห้ามแก้ไข** ไฟล์ใน `src/components/ui/` โดยตรง — ปรับแต่งที่จุดใช้งานผ่าน `cn()`/variants/tokens
- ใช้ Tailwind default palette named color เท่านั้นถ้า token ที่มีอยู่ไม่พอ — **ห้าม** ใช้ hex/RGB/HSL/OKLCH ตรงๆ

## ห้าม

- **[Forbidden]** เพิ่ม `antd` หรือ CSS-in-JS library อื่นเข้า `backoffice-next`
- **[Forbidden]** override shadcn ด้วย global CSS แทนการใช้ variants/`cn()`/tokens
