# 6. UI & Styling

เรามีสอง UI stack ตาม variant ของแอป — เลือกแนวทางที่ตรงกับโปรเจกต์ที่กำลังแก้ไข

---

## shadcn variant (`backoffice/`)

แอป backoffice ใช้ **shadcn/ui** + **Tailwind CSS v4** เป็น UI stack หลัก

แอปที่ migrate แล้วใช้ **shadcn/ui** + **Tailwind CSS v4** แทน Ant Design โดยอ้างอิง scaffold จาก `live-demo-shadcn/`

### 🎨 Design Tokens (CSS variables)
- โทนสีและ radius อยู่ที่ `src/index.css` ผ่าน CSS custom properties (`--primary`, `--destructive`, `--radius`, …)
- TypeScript mirror สำหรับค่าที่ใช้ใน logic อยู่ที่ `src/theme/tokens.ts`
- ธีม light/dark สลับผ่าน `ThemeProvider` (`src/components/theme-provider.tsx`) — **ไม่ใช้** AntD `ConfigProvider`

### 📐 Layout & spacing
- ใช้ Tailwind utility classes และ layout templates ใน `src/components/layout/` (`PageContainer`, `DetailContainer`, …)
- ตาราง: `@tanstack/react-table` ผ่าน `src/components/data-table.tsx`
- Toast / feedback: `sonner` ผ่าน `useAppFeedback` และ `<Toaster />` ใน `App.tsx`
- Confirm dialogs: `useConfirmDialog` + `AlertDialog` (แทน `Modal.confirm`)

### 🧩 เพิ่ม component
- ใช้ shadcn CLI / MCP ตาม `components.json`
- Component พื้นฐานอยู่ใน `src/components/ui/` — ห้าม duplicate ไปที่ path อื่น

### 🚫 ห้าม
- **[Forbidden]** นำ `antd` กลับเข้า `backoffice` ยกเว้น migration ชั่วคราวที่มี ticket ชัดเจน
- **[Forbidden]** override shadcn ด้วย global CSS แทนการใช้ variants / `cn()` / tokens
