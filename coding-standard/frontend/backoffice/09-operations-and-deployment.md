# 9. Operations & Deployment

## 🌍 Environment Variables

- ไฟล์ dev: `.env.local` (copy จาก `.env.local.example`)
- **[Required]** ตัวแปรที่ต้อง inject เข้าฝั่ง client ต้องขึ้นต้นด้วย **`NEXT_PUBLIC_`** เสมอ (เช่น `NEXT_PUBLIC_API_BASE_URL`) ไม่ใช่ `VITE_` — ตัวแปรที่ไม่มี prefix นี้จะใช้ได้เฉพาะฝั่ง server (`next.config.mjs`, route handlers)
- เรียกใช้ผ่าน `process.env.NEXT_PUBLIC_...` เท่านั้น (ไม่ใช่ `import.meta.env`)
- API เรียกผ่าน same-origin path (`/auth/*`, `/api/*`) — Next.js `rewrites()` ใน `next.config.mjs` เป็นตัว proxy ไป `AUTH_PROXY_TARGET`/`GATEWAY_PROXY_TARGET` (แทน dev-server proxy ของ Vite เดิม)

## 🛠️ Build Process

- Production build: `next build` (script `npm run build`) — มี `build:staging` แยกสำหรับ staging config
- Dev server รันที่ port คงที่ **3005** (`next dev -p 3005`), production ก็ `next start -p 3005`
- **[Required]** TypeScript strict mode ต้องผ่านก่อน build เสมอ ห้าม suppress type error
- Deploy จริงรันผ่าน PM2 (`ecosystem.factory.js` / `ecosystem.staging.config.js`) ไม่ใช่ static export — ดู [backend/RUNBOOK.md](../../../backend/RUNBOOK.md) และ [docs/deploy/digitalocean.md](../../../docs/deploy/digitalocean.md)
