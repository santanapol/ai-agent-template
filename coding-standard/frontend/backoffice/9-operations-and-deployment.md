# 9. Operations & Deployment

มาตรฐานการจัดการ Environment และการ Build เพื่อนำขึ้น Production

## 🌍 Environment Variables
- ไฟล์ที่ใช้เก็บตัวแปรแวดล้อมให้ใช้ชื่อตามกฎของ Vite คือ `.env.local` สำหรับเครื่อง Dev
- **[Required]** ตัวแปรทุกตัวที่ต้องถูกแทรก (Inject) เข้าไปในฝั่ง Frontend ต้องขึ้นต้นด้วยคำว่า **`VITE_`** เสมอ (เช่น `VITE_API_URL_GATEWAY`) หากไม่มีคำนำหน้านี้ Vite จะไม่ยอมให้ฝั่ง UI เข้าถึงเพื่อเหตุผลด้านความปลอดภัย
- การเรียกใช้ในโค้ด ให้เรียกผ่าน `import.meta.env.VITE_...` เท่านั้น (ห้ามใช้ `process.env`)

## 🛠️ Build Process
- การ Build สำหรับ Production ให้รันคำสั่ง `npm run build` (ซึ่งจะไปทริกเกอร์ `tsc -b && vite build`) 
- **[Required]** ทุกครั้งก่อน Build ระบบจะเช็ค Type (TypeScript Strict) เสมอ หากมี Type ผิดพลาด การ Build จะถูกบล็อก (Fail) ทันที ห้ามใช้เวทมนตร์ปิดการตรวจ Type เด็ดขาด
