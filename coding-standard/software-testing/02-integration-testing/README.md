# Integration Testing (ทดสอบการเชื่อมต่อระดับ Code/Module)

## 📌 คืออะไร
นำ Module หลายตัวมาต่อกัน และทดสอบว่าส่งผ่านข้อมูลระหว่างกันได้ถูกต้อง ทดสอบในระดับ **Code** ก่อนที่ระบบจะถูก Deploy

## 👥 ใครทำ
Developer

## 🛠️ เครื่องมือที่แนะนำ (Zero Platform Standard)
- **Frontend:** `Vitest`
- **Backend:** `Node.js Native Test Runner` (`node --test`) คู่กับ `fastify.inject()` สำหรับยิง Request ภายในโดยไม่ต้องสตาร์ท Port จริง

## 🔥 ความจำเป็น
**Must-have**

> **ข้อแตกต่างกับ SIT:**
> - Integration Testing = ทดสอบในระดับ **Code ก่อน Deploy**
> - SIT = ทดสอบในระดับ **ระบบที่ Deploy แล้วจริงๆ** ก่อนส่ง UAT
