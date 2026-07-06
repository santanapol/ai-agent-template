# 8. OpenAPI Validation

## การตรวจสอบ Contract ด้วย Linter

เพื่อรักษาคุณภาพและความถูกต้องของ `openapi.yaml` ในระดับสูงสุด Gateway บังคับให้ใช้กระบวนการตรวจสอบอัตโนมัติดังนี้:

| รายการ | ข้อกำหนด (Rule) |
| :--- | :--- |
| **Spectral Linter** | **[Required]** ต้องมีไฟล์ `.spectral.yaml` ควบคุมกฎการเขียน OpenAPI และบังคับให้รันคำสั่งตรวจสอบ (`npm run spec:lint`) บน CI/CD ทุกครั้ง ห้าม Merge หากมี Error |
| **Error Codes Validation** | **[Required]** รหัสข้อผิดพลาดทั้งหมดใน Endpoint ต้องสอดคล้องกับ `codes.yaml` (ใช้ Script `validate-gateway-openapi-problem-codes.mjs` ควบคู่กัน) |
