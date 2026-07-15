# SIT — System Integration Testing (ทดสอบการเชื่อมต่อระดับระบบ)

## 📌 คืออะไร
ทดสอบระบบที่ **Deploy แล้ว** เมื่อต้องเชื่อมต่อกับระบบอื่น ไม่ว่าจะเป็นภายในองค์กรหรือ External ตรวจสอบว่าข้อมูลไหลข้ามระบบได้ถูกต้องตาม Contract ที่ตกลงกัน

## 👥 ใครทำ
QA + Developer

## 🛠️ เครื่องมือที่แนะนำ (Zero Platform Standard)
- **API Testing:** ใช้ **`Bruno`** (`.bru`) เซฟลงในโฟลเดอร์ `backend/_bruno` เท่านั้น (Docs as Code ช่วยให้คนอื่นในทีมเอาไปรันต่อได้เลย ไม่ต้องใช้ Postman)
- **Database Checking:** ใช้เครื่องมือเช่น DBeaver / MongoDB Compass

## 🔥 ความจำเป็น
⭐️ **Situation Dependent** — จำเป็นมากเมื่อระบบต้องเชื่อมต่อหลายส่วน (เช่น API คุยกับ Wallet Service)
