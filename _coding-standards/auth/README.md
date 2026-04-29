# Auth Standards (Source of Truth)

มาตรฐานสำหรับ **บริการ identity / token / session** (หน้า Gateway หรือเทียบเท่า) เช่น login, refresh, logout
*เอกสารในโฟลเดอร์นี้และ `codes.yaml` ถือเป็น Source of Truth สำหรับขอบเขต Auth*

---

## 📂 โครงสร้างและจุดเริ่มต้น (Layout & Where to start)

เพื่อให้กระชับและหาข้อมูลได้ไวขึ้น นี่คือรายชื่อไฟล์ที่คุณต้องใช้:

| ไฟล์ | หน้าที่หลัก (สิ่งที่ควรเข้ามาอ่าน/แก้ไข) |
| :--- | :--- |
| **`api.md`** | **[สัญญา API]** กฎการออกแบบ Endpoint, Response Envelope, Headers, Rate Limit |
| **`openapi.yaml`** | **[OpenAPI Spec]** ไฟล์ Contract ฉบับเต็มของ Auth Service ครอบคลุมทุก Endpoint |
| **`codes.yaml`** | **[Error Codes]** แหล่งลงทะเบียนรหัสข้อผิดพลาดเฉพาะขอบเขต Auth |
| **`runtime.md`** | **[Runtime]** กฎเกณฑ์ฝั่ง Node, ESM, สภาพแวดล้อม (Environment variables) |

---
