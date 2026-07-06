# Performance / Load Testing

## 📌 คืออะไร
ยิง Request จำนวนมากพร้อมกัน เพื่อทดสอบขีดจำกัด Server ว่าสามารถรับโหลดได้มากแค่ไหน และ Response Time อยู่ในเกณฑ์ที่รับได้หรือไม่

## 👥 ใครทำ
Performance QA / DevOps / Developer

## 🛠️ เครื่องมือที่แนะนำ (Zero Platform Standard)
- **`k6` (by Grafana)** 
- **เหตุผล:** ทีมพัฒนาคุ้นเคยกับ JavaScript/TypeScript การเขียนสคริปต์โหลดด้วย k6 จะทำให้อ่านง่ายกว่า JMeter และยังเบากินเครื่องน้อยกว่ามาก

## 🔥 ความจำเป็น
⭐️ **Situation Dependent** — Optional สำหรับระบบ Backoffice ผู้ใช้น้อย แต่ **Must** สำหรับระบบ High Traffic ฝั่งผู้เล่นหน้าบ้าน
