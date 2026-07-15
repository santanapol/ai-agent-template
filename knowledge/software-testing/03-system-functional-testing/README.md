# System Testing / Functional Testing (ทดสอบระดับระบบ)

## 📌 คืออะไร
ทดสอบระบบทั้งหมดว่าทำงานตรงตาม Requirement หรือไม่ ครอบคลุมทุก Feature บนหน้า UI ตั้งแต่ Validation, Business Logic ไปจนถึง Flow การทำงาน
**ตัวอย่าง:** ไฟล์ `SIT_TC_Rolling_Commission_US_01_Create_Casino - SIT_TC_RCC.csv` คือการทดสอบระดับนี้

## 👥 ใครทำ
QA (Manual หรือ Automated)

## 🛠️ เครื่องมือ
- Jira (พร้อม plugin Zephyr, Xray), TestRail, Qase, Excel/Google Sheets

## 🔥 ความจำเป็น
**Must-have (สำคัญที่สุด)**

## 📄 Template
นี่คือรูปแบบที่คุณเบียร์ใช้อยู่ มักจะเขียนเป็นตาราง Excel/CSV หรือใช้เครื่องมือจัดการ

```csv
TC_ID, Description, Pre-Condition, Steps, Expected Result
FUNC-01, ตรวจสอบการกรอกอีเมลผิดรูปแบบ, อยู่หน้าสมัครสมาชิก, 1. กรอกอีเมล 'test@' 2. กดปุ่ม Submit, ระบบแสดงข้อความ 'Invalid email format' และไม่ส่งข้อมูล
```
