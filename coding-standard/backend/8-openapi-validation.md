# 11. OpenAPI Validation (Spectral)

มาตรฐานการตรวจสอบความถูกต้องของไฟล์เอกสาร `openapi.yaml` แบบอัตโนมัติ (Automated Linting) เพื่อไม่ให้เอกสารผิดเพี้ยนไปจากมาตรฐานขององค์กร

## ✅ Spectral Ruleset
เราใช้งานเครื่องมือ **Spectral** ในการรันเช็คโครงสร้างไฟล์ OpenAPI ทุกครั้งที่มีการเปิด Pull Request (CI Gate) เพื่อตรวจหาความผิดปกติหรือการเขียนที่ไม่เป็นไปตามกฎ

### 📏 กฎการเรียง Header Parameters (Trusted Header Order)
Spectral ถูกตั้งค่า (ผ่านไฟล์ `coding-standard/backend/spectral/org-api.yaml`) และ custom function `coding-standard/backend/spectral/functions/trustedHeaderOrder.js` ให้มีหน้าที่ตรวจสอบการเรียงลำดับของ Parameter ใน Header ว่าเขียนไว้ใน OpenAPI ถูกต้องและเป็นระเบียบหรือไม่:

* **[บังคับ]** ต้องเรียง Header Parameters ให้อยู่ในลำดับนี้เท่านั้น:
  1. `x-user-ou`
  2. `x-user-branch`
  3. `x-user-id`
  4. `x-user-role`
  5. `If-Match`
  6. `x-request-id`
* **การจัดการ:** หากมี Parameter ตัวใดที่ไม่ได้ใช้งาน อนุญาตให้ข้ามได้ แต่ Parameter ตัวที่เหลือต้อง **เรียงลำดับตามโครงสร้างด้านบนเป๊ะ ๆ**
* หากเขียนสลับที่กัน เครื่องมือ Spectral จะแสดง Error ทันที และจะบล็อกไม่ให้สามารถ Merge โค้ดได้ (Severity: Error)
