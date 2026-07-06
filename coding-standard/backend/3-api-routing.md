# 3. API Routing & Methods

มาตรฐานการออกแบบ URL (Endpoint) และการใช้ HTTP Methods เพื่อให้สื่อความหมาย (RESTful API) และเข้าใจง่าย

## 🛠️ HTTP Methods

ใช้ Method เพื่อบอก **การกระทำ (Action)** เสมอ แทนการใช้คำกริยาใน URL

| Method | การใช้งาน (Action) |
| :--- | :--- |
| **GET** | ดึงข้อมูล / อ่านข้อมูล (Read) |
| **POST** | สร้างข้อมูลใหม่ (Create) |
| **PUT** | แก้ไขข้อมูลแบบแทนที่ทั้งก้อน (Replace) |
| **PATCH** | แก้ไขข้อมูลเฉพาะบางส่วน (Update) |
| **DELETE** | ลบข้อมูล (Delete) |

## 🔗 Routing Rules

* **Noun + Plural:** ใช้ **คำนามพหูพจน์** เสมอ (เช่น `/users`, `/bank-accounts`)
* **kebab-case:** ใช้ตัวพิมพ์เล็กและคั่นคำด้วยขีดกลาง (เช่น `/api/v1/bank-accounts`)
* **Versioning:** ต้องระบุ **เวอร์ชัน** เสมอใน URL (เช่น `/api/v1/...`)
* **Minimal Nesting:** ซ้อน Resource **ไม่เกิน 2 ระดับ** (เช่น `/bank-accounts/:id/slips`)
* **Custom Actions:** หากไม่ใช่ CRUD ปกติ ให้เติมกริยาต่อท้าย (เช่น `POST /slips/:id/verify`)
* **Query Params:** ใช้สำหรับ Filter, Sort หรือ Pagination เท่านั้น (เช่น `?page=1&sort=-createdAt`)
