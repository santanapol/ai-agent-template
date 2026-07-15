# Unit Testing (ทดสอบระดับหน่วยย่อย)

## 📌 คืออะไร
ทดสอบโค้ดทีละฟังก์ชัน หรือทีละ Module แบบ Isolated โดยไม่ต้องพึ่งพาระบบภายนอก (เช่น ฟังก์ชันคำนวณ Commission รับค่า 1000 ต้องคืน 50)

## 👥 ใครทำ
Developer

## 🛠️ เครื่องมือที่แนะนำ (Zero Platform Standard)
- **Frontend (`backoffice`):** `Vitest` + `React Testing Library` (มีการติดตั้งไว้พร้อมใช้งานแล้ว)
- **Backend:** `Node.js Native Test Runner` (`node --test`) คู่กับ `node:assert` (อิงตาม Tech Stack ห้ามใช้ Jest)

## 🔥 ความจำเป็น
**Must-have** — เป็นรากฐานที่ทำให้โค้ดแข็งแรง บั๊กส่วนใหญ่ควรถูกดักจับตั้งแต่ด่านนี้
