# 2. Folder Structure (Modular)

## 📂 โครงสร้างโฟลเดอร์สำหรับ Backend Service
เพื่อรองรับการขยายตัวของระบบ (Scalability) และรักษาความเกี่ยวเนื่องกันของโค้ด (High Cohesion) Backend Service จะบังคับใช้โครงสร้างแบบ **Modular / Feature-based (Vertical Slicing)** โดยรวม Code ทุก Layer ของ Feature เดียวกันไว้ในโฟลเดอร์เดียวกัน 

```text
service-name/                           ← Root ของ Service
├── src/
│   ├── config/                         # ค่าคงที่และ Environment Variables
│   ├── lib/                            # ฟังก์ชันอรรถประโยชน์ (Utils) และ Shared Logic ส่วนกลาง
│   ├── plugins/                        # การตั้งค่า Framework Plugins (เช่น Database, Redis)
│   ├── modules/                        # โค้ดหลักแยกตาม Feature/Domain
│   │   ├── users/
│   │   │   ├── users.controller.js
│   │   │   ├── users.service.js
│   │   │   ├── users.repository.js
│   │   │   ├── users.schema.js
│   │   │   └── users.route.js
│   │   └── orders/
│   │       ├── orders.controller.js
│   │       └── ...
│   ├── app.js                          # ตั้งค่า Framework & Plugin ทั้งหมด
│   └── server.js                       # Entry Point (รัน Server & ต่อ DB)
├── .env.example                        # Template ของ Environment Variables
└── package.json                        # ข้อมูลโปรเจกต์และ Dependencies
```

### คำอธิบายแต่ละส่วนประกอบใน Module
| ส่วนประกอบ | หน้าที่ |
| :--- | :--- |
| **`*.route.js`** | กำหนด Endpoint (Path) และผูกกับ Controller |
| **`*.controller.js`** | รับ Request, ส่งไป Validate, เรียกใช้ Service, จัดการ Error, คืน Response |
| **`*.schema.js`** | บรรจุ JSON Schema (หรือตัว Validate) สำหรับตรวจสอบ Request / Response |
| **`*.service.js`** | Business Logic การประมวลผลหลัก |
| **`*.repository.js`** | การพูดคุยกับ Database หรือ Caching (Data Access Layer) |

> **[Required]** ห้ามทำข้าม Layer ภายใน Module เดียวกัน (เช่น Controller ไม่ควรเรียก Repository โดยตรง) และควรเชื่อมต่อข้าม Module ผ่านทาง Service เท่านั้น (ห้าม Module หนึ่งแอบ Query Database ของอีก Module โดยตรงเด็ดขาด)
