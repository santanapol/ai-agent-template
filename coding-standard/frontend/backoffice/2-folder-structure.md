# 2. Folder Structure

โครงสร้างของโปรเจกต์ Frontend ยึดหลักการแยกตามหน้าที่ (Feature-based / Layer-based) ดังนี้:

```text
src/
├── assets/       # รูปภาพ, ไฟล์โลโก้, หรือ static files ที่ต้องผ่าน Bundler
├── contexts/     # React Context API (เช่น AuthContext, ThemeContext)
├── layouts/      # โครงร่างหน้าเว็บ (เช่น AdminLayout, Sidebar, Navbar)
├── lib/          # ฟังก์ชัน, Axios instance หรือเครื่องมือที่เขียนเอง (Shared Utilities)
├── pages/        # หน้า UI ระดับบนสุด (ประกอบชิ้นส่วนต่างๆ เข้าด้วยกัน)
└── types/        # TypeScript Interfaces และ Types (เช่น types/auth.ts)
```

| กฎเหล็ก | ข้อบังคับ (Rule) |
| :--- | :--- |
| **UI Components** | หากมีการสร้าง Component ย่อยที่ใช้ซ้ำได้ ให้สร้างโฟลเดอร์ `src/components/` แยกออกมา |
| **การ Import** | ไม่ควร Import ข้ามโดเมนที่ซับซ้อน (เช่น ไม่ควรให้ `lib/` ไป import ไฟล์จาก `pages/`) |
