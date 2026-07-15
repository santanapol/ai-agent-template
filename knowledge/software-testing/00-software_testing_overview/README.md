# ภาพรวมและลำดับการทำ Software Testing (Master Index)

เอกสารในคลังนี้ (Knowledge Base) สรุปลำดับขั้นตอนและความจำเป็นของการทำ Software Testing ในระดับต่างๆ 
โดยแบ่งออกเป็นโฟลเดอร์ย่อยตามลำดับ Priority ที่แนะนำให้ทำ เพื่อให้ทีมสามารถเรียนรู้และนำไปปฏิบัติได้ทันที:

## 📌 หมวดที่ 1: Functional Testing Levels (ทำตามลำดับ)
ทดสอบว่าระบบทำงาน **ถูกต้องตาม Requirement** หรือไม่ 

- [01. Unit Testing](../01-unit-testing/README.md) - ทดสอบระดับหน่วยย่อย (Code)
- [02. Integration Testing](../02-integration-testing/README.md) - ทดสอบการเชื่อมต่อระดับ Code/Module
- [03. System / Functional Testing](../03-system-functional-testing/README.md) - ทดสอบระดับระบบ ครอบคลุม UI และ Business Logic
- [04. SIT (System Integration Testing)](../04-sit-testing/README.md) - ทดสอบการเชื่อมต่อระดับระบบข้าม Service
- [05. UAT (User Acceptance Testing)](../05-uat-testing/README.md) - ทดสอบเพื่อยอมรับระบบโดยผู้ใช้งานจริง

## 🔄 หมวดที่ 2: Cross-cutting Testing (ทำทุกครั้งที่ Deploy)
ทดสอบการทำงานและพฤติกรรมของระบบซ้ำๆ เพื่อความมั่นใจ

- [06. Smoke / Sanity Testing](../06-smoke-sanity-testing/README.md) - ตรวจสอบหลัง Deploy ว่าระบบเปิดติดและฟีเจอร์หลักไม่พัง
- [07. Regression Testing](../07-regression-testing/README.md) - ทดสอบฟีเจอร์เดิมทั้งหมดซ้ำเพื่อหาผลกระทบจากการแก้โค้ด
- [08. E2E Testing (End-to-End)](../08-e2e-testing/README.md) - ทดสอบจำลองพฤติกรรม User แบบครบวงจรผ่าน Browser

## 🛠️ หมวดที่ 3: Non-Functional Testing (ทำคู่ขนาน)
ทดสอบ **คุณภาพแฝง** ที่ส่งผลต่อประสบการณ์ผู้ใช้และความปลอดภัย

- [09. Security Testing](../09-security-testing/README.md) - ทดสอบช่องโหว่ความปลอดภัย (Penetration Testing)
- [10. Performance / Load Testing](../10-performance-testing/README.md) - ทดสอบรับโหลดของ Server
- [11. Accessibility Testing](../11-accessibility-testing/README.md) - ตรวจสอบความพร้อมใช้งานสำหรับผู้ใช้ทุกคน (a11y)
- [12. Compatibility Testing](../12-compatibility-testing/README.md) - ทดสอบความเข้ากันได้บน Browser และ Device ต่างๆ

---

*💡 กดเข้าไปในแต่ละลิงก์โฟลเดอร์ เพื่อดู **ทฤษฎี (README.md)** และ **ตัวอย่างโค้ดหรือตาราง (example.***) ที่พร้อมให้คุณ Copy ไปใช้งานจริง!*
