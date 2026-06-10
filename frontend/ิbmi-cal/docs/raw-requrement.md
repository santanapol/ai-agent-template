# BMI Calculator System

> ยืนยัน intent ผ่าน interview-me — 2026-06-10

## Raw requirement (ต้นฉบับ)

- คำนวณ BMI จากส่วนสูงและน้ำหนัก ในหน่วย metric
- ไม่ต้อง login — คำนวณผ่านหน้าเว็บได้เลย

## Confirmed intent

| หัวข้อ | รายละเอียด |
| :--- | :--- |
| **Outcome** | Demo app BMI Calculator — รับส่วนสูง (cm) + น้ำหนัก (kg) แล้วแสดง **ตัวเลข BMI + หมวดหมู่** |
| **User** | คนที่รัน demo local (ทีม / ผู้ดู workflow agent-skill) |
| **Why now** | Demo ใน zero-platform — ไม่ใช่ production health product |
| **Success** | รัน local (`npm run dev`) แล้วเปิด browser คำนวณ BMI ได้ทันที ไม่ต้อง login |
| **Constraint** | Pure frontend (คำนวณใน browser) · Metric เท่านั้น · Stack: React + Vite + TypeScript + Ant Design (สอดคล้อง backoffice) |
| **Out of scope** | imperial units · เก็บ history · backend/API · deploy · คำแนะนำสุขภาพ |

## Functional scope

1. หน้าเดียว — form รับ **ส่วนสูง (cm)** และ **น้ำหนัก (kg)**
2. คำนวณ BMI ใน browser: `BMI = weight (kg) / (height (m))²`
3. แสดงผล **ตัวเลข BMI** และ **หมวดหมู่** (เช่น Underweight / Normal / Overweight / Obese)
4. ไม่มี authentication — ไม่ persist ข้อมูล

## Technical notes

- โฟลเดอร์: `frontend/bmi-cal` (แยกจาก `frontend/backoffice`)
- Architecture: client-side only — ไม่เรียก backend/gateway ของ zero-platform
- เกณฑ์ demo เสร็จ: รัน local ได้ — ไม่ต้อง deploy
