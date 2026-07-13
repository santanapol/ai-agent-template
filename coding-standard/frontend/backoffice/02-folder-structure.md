# 2. Folder Structure

โครงสร้างยึด **co-location ตาม route** ของ Next.js App Router — เก็บโค้ดเฉพาะหน้าไว้ใกล้กับ route ที่เป็นเจ้าของ:

```text
src/
├── app/                # App Router — route groups, layout.tsx, error.tsx, page.tsx
│   ├── (main)/         # Route group ที่ต้อง login (gate ผ่าน main-layout-client.tsx)
│   │   ├── <route>/    # เช่น staff/, invoices/, permissions/
│   │   └── layout.tsx  # force-dynamic + MainLayoutClient (auth gate)
│   ├── login/
│   ├── error.tsx        # Route-level error boundary
│   ├── global-error.tsx # Root error boundary (รวม chunk-load recovery)
│   └── not-found.tsx
├── views/              # Feature views ที่ประกอบเป็นหน้า (เช่น StaffManagement, InvoiceList)
├── layouts/            # App shell — AdminLayout (sidebar + header + outlet)
├── components/         # Shared application components
│   ├── layout/         # PageContainer, ListPageCard, DetailContainer, …
│   ├── list-page/      # ListPageToolbar, ListPageSearch, InlineFilterSelect
│   ├── data-table/     # TanStack table chrome
│   └── ui/             # shadcn primitives — ห้ามแก้ไข ดู 06-ui-and-styling.md
├── contexts/           # React Context (เช่น AuthContext, ThemeContext compat)
├── stores/             # Zustand stores (เช่น stores/preferences)
├── hooks/              # Shared hooks (เช่น useAgents, useInvoiceListFilters)
├── lib/                # Axios clients, utilities, ไม่ผูกกับ UI
├── config/             # App-level config (เช่น app-config.ts)
├── navigation/         # RR→Next compat only (`compat.tsx`) — ไม่ใช่ sidebar registry
├── types/              # TypeScript types (เช่น types/auth.ts)
├── styles/             # Theme presets, ธง/ไอคอน static
└── test/               # Test mocks/helpers ที่ใช้ร่วมกันหลาย suite
```

Sidebar / menu items มาจาก **auth API** (`AuthContext.menus`) ไม่ใช่ไฟล์ static ใน `src/navigation/`.

| กฎเหล็ก | ข้อบังคับ (Rule) |
| :--- | :--- |
| **Screen-specific code** | เก็บ component/hook ที่ใช้เฉพาะ feature ไว้ใน `views/<feature>/` หรือใกล้ route — ย้ายเข้า `src/components/` หรือ `src/hooks/` เฉพาะเมื่อมี feature ที่สองมาใช้ซ้ำ |
| **`src/components/ui/`** | ห้ามแก้ไขไฟล์ในนี้โดยตรง — ปรับแต่งที่จุดใช้งานแทน |
| **การ Import** | ไม่ควร import ข้ามโดเมนที่ซับซ้อน (เช่น ไม่ควรให้ `lib/` ไป import จาก `views/`) |
| **`navigation/compat.tsx`** | migration shim สำหรับ hooks แบบ react-router — ห้ามใช้เป็นแบบอย่างการลงทะเบียน route/เมนูใหม่ |
| **`(legacy)` routes** | ห้ามใช้เป็นตัวอย่างอ้างอิงสำหรับ route ใหม่ ยกเว้นกำลัง maintain route legacy นั้นโดยตรง |
