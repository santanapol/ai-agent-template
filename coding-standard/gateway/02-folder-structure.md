# 2. Folder Structure (Proxy)

## 📂 โครงสร้างโฟลเดอร์สำหรับ Gateway Service
Gateway Service มีหน้าที่หลักในการทำ Proxy และตรวจ JWT โดยไม่มี Business Logic ซับซ้อน โครงสร้างโฟลเดอร์จึงถูกออกแบบมาให้เรียบง่ายและบางเบาดังนี้:

```text
src/
├── config/       # ค่าคงที่, Environment Variables และการตั้งค่า Config ต่างๆ
├── lib/          # ฟังก์ชันอรรถประโยชน์ (Utils) ที่เขียนขึ้นเองเพื่อใช้ในโปรเจกต์
├── plugins/      # Fastify Plugins (เช่น การเชื่อมต่อ Redis, หรือตัวตรวจสอบ JWT)
└── proxy/        # โค้ดหลักที่ใช้ผูก Route ต่างๆ สำหรับการทำ Proxy HTTP request
```

| โฟลเดอร์ | หน้าที่ |
| :--- | :--- |
| **`config/`** | จัดการดึงค่าจาก `.env` และ Validate ค่า Config ก่อนให้ส่วนอื่นเรียกใช้ |
| **`lib/`** | แหล่งรวม Shared Logic เล็กๆ น้อยๆ เช่น ฟังก์ชันสุ่มค่า หรือตัวจัดการ Error |
| **`plugins/`** | ไฟล์ที่ลงทะเบียน (Register) เข้ากับ Fastify Instance เช่น ปลั๊กอินต่อ Redis |
| **`proxy/`** | ไฟล์ที่เรียกใช้ `@fastify/http-proxy` เพื่อกำหนดเส้นทาง Upstream ต่างๆ |
