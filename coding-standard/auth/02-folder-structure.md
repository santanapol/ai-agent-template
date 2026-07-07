# 8. Folder Structure (Modular)

## 📂 โครงสร้างโฟลเดอร์สำหรับ Auth Service
Auth Service บังคับใช้โครงสร้างโฟลเดอร์แบบ **Modular / Feature-based** ซึ่งรวม Code ทุก Layer ของ Feature เดียวกันไว้ในโฟลเดอร์เดียวกัน (แตกต่างจาก Backend มาตรฐานที่แยกโฟลเดอร์ตาม Layer อย่าง Controllers, Services) 

```text
src/
├── config/       # ค่าคงที่และ Environment Variables
├── lib/          # ฟังก์ชันอรรถประโยชน์ (Utils) และ Shared Logic (เช่น JWT, Problem)
├── plugins/      # Fastify Plugins (เช่น การเชื่อมต่อ Database)
└── modules/      # โค้ดหลักแยกตาม Feature/Domain
    ├── auth/
    │   ├── auth.controller.js
    │   ├── auth.service.js
    │   ├── auth.repository.js
    │   ├── auth.validator.js
    │   └── auth.route.js
```

### คำอธิบายแต่ละส่วนประกอบใน Module
| ส่วนประกอบ | หน้าที่ |
| :--- | :--- |
| **`*.route.js`** | กำหนด Endpoint (Path) และผูกกับ Controller |
| **`*.controller.js`** | รับ Request, ส่งไป Validate, เรียกใช้ Service, จัดการ Error, คืน Response (รวมถึง Cookie/Header) |
| **`*.validator.js`** | บรรจุ Joi Schema สำหรับตรวจสอบ Request Body / Query / Params |
| **`*.service.js`** | Business Logic การประมวลผลหลัก |
| **`*.repository.js`** | การพูดคุยกับ Database (MongoDB) หรือ Caching (Redis) |

> **[Required]** ห้ามทำข้าม Layer (เช่น Controller ไม่ควรเรียก Repository โดยตรง) และให้จัดกลุ่มไฟล์ด้วยชื่อ Feature นำหน้าเพื่อความชัดเจน (เช่น `auth.xxx.js`)
