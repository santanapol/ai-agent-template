# Smoke Testing / Sanity Testing

## 📌 คืออะไร
Quick-check ทำทันทีหลัง Deploy เพื่อยืนยันว่าระบบ "เปิดติด" และ Critical Feature ยังทำงานได้ก่อนจะ run Full Test

## 👥 ใครทำ
QA (Automated)

## 🛠️ เครื่องมือที่แนะนำ (Zero Platform Standard)
- **Frontend / UI:** `Playwright` (รันสคริปต์เข้าหน้าเว็บเช็คด่วน 1-2 นาที)
- **Backend / API:** `Bruno` (สร้าง Collection โฟลเดอร์ `smoke-tests` เอาไว้ยิงเช็ค Endpoint สำคัญรัวๆ)

## 🔥 ความจำเป็น
**Must-have** — ประหยัดเวลามหาศาล ป้องกันการ run Full Test บน Environment ที่พังอยู่แล้ว
