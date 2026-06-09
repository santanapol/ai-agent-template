# Frontend Back-office RUNBOOK

เอกสารนี้รวบรวมวิธีรันโปรเจกต์ Frontend (Back-office) ในเครื่อง Local (Development) และวิธีแก้ปัญหาเบื้องต้นที่อาจพบได้บ่อย

## 1. Prerequisites (สิ่งที่ต้องมี)

ก่อนรัน Frontend โปรดตรวจสอบให้แน่ใจว่าได้รัน Backend Services ที่จำเป็นไว้แล้ว:
- **Database & Redis**: ต้องรันผ่าน Docker Compose ก่อนเสมอ (ดูวิธีใน `backend/RUNBOOK.md`)
- **Auth Service**: รันอยู่ที่พอร์ต `3001`
- **Gateway Service**: รันอยู่ที่พอร์ต `3000`
*(หากต้องการทดสอบ API Service ตัวไหนเพิ่มเติม เช่น Staff Service หรือ Agent-Invoice ก็ให้เปิดตามพอร์ตที่กำหนด)*

## 2. Environment Variables

คัดลอกไฟล์ `.env.local.example` มาสร้างเป็นไฟล์ `.env.local`

```bash
cp .env.local.example .env.local
```

**ตัวแปรในไฟล์:**
ตัวแปรที่ขึ้นต้นด้วย `VITE_` จะถูกนำไปใช้ในโค้ดฝั่ง Client-side. สำหรับกรณีที่ต้องการพัฒนาโดยการยิง API ตรงเข้าหา Service หลังบ้านโดย **ไม่ผ่าน Gateway** (Mesh bypass) ระบบจะดึงค่าเหล่านี้ไปใช้จำลอง Header เสมือนว่าถูก Inject มาจาก Gateway แล้ว:

- `VITE_GATEWAY_SECRET`: Secret ที่ตรงกับหลังบ้าน
- `VITE_USER_OU` / `VITE_USER_BRANCH`: ระบุข้อมูล Tenant
- `VITE_USER_ID` / `VITE_USER_ROLE`: ระบุข้อมูล Role ของ Staff

*(หากรันผ่านระบบ Login และ Gateway ตามปกติ อาจไม่จำเป็นต้องตั้งค่านี้)*

## 3. Local Development

ติดตั้ง Package และรันคำสั่ง Dev Server

```bash
npm install
npm run dev
```

ตัวระบบจะรันขึ้นมาที่ `http://localhost:5174` โดยมีการตั้งค่า **Proxy** ผ่าน `vite.config.ts` ดังนี้:
- **`/auth/*`** → จะถูก Forward ไปที่ `http://127.0.0.1:3001` (Auth Service)
- **`/api/*`**  → จะถูก Forward ไปที่ `http://127.0.0.1:3000` (Gateway Service)

## 4. Troubleshooting (การแก้ปัญหาเบื้องต้น)

| ปัญหา | สาเหตุ & วิธีแก้ |
| --- | --- |
| **502 Bad Gateway (Proxy error)** | เกิดจาก Frontend พยายาม Proxy ไปที่พอร์ต 3000 หรือ 3001 แต่ไม่มี Service รันอยู่ <br> **วิธีแก้:** ตรวจสอบและสตาร์ท Gateway (`:3000`) หรือ Auth (`:3001`) ในฝั่ง Backend |
| **CORS Error** | ส่วนใหญ่เกิดตอนที่ Browser พยายามยิงตรงไปที่ Backend port แต่อาจลืมผ่าน Proxy หรือ Gateway ขาดการตั้งค่า CORS <br> **วิธีแก้:** ตรวจสอบว่า endpoint ขึ้นต้นด้วย `/api/` หรือ `/auth/` เพื่อให้ Vite Proxy ทำงานอย่างถูกต้อง |
| **401 / 403 Unauthorized** | Token อาจจะหมดอายุ หรือในกรณีที่ยิงตรง (Direct Mesh) ค่า `VITE_` ในไฟล์ `.env.local` อาจจะผิด <br> **วิธีแก้:** ลอง Logout แล้ว Login ใหม่ หรือตรวจสอบค่า `.env.local` |
| **Changes not reflecting** | Vite อาจแคชไฟล์เดิมไว้ <br> **วิธีแก้:** ลองรีสตาร์ท `npm run dev` ใหม่ หรือเข้า Browser แบบ Incognito / Disable Cache |
