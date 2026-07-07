# 10. OpenAPI Validation

## กฎการเขียนและการตรวจสอบ OpenAPI

เอกสาร OpenAPI (`openapi.yaml`) ถือเป็นหัวใจสำคัญของ Contract ระหว่าง Auth Service และผู้เรียกใช้ จึงต้องมีการตรวจสอบความถูกต้องอย่างเข้มงวดด้วย Linter 

| รายการ | ข้อกำหนด (Rule) |
| :--- | :--- |
| **Spectral Linter** | **[Required]** ต้องมีไฟล์ `.spectral.yaml` ควบคุมกฎการเขียน OpenAPI และบังคับให้รันคำสั่งตรวจสอบ (เช่น `npm run spec:lint`) บน CI/CD ทุกครั้ง หากพบ Error ห้าม Merge โดยเด็ดขาด |
| **Error Codes Validation** | **[Required]** รหัสข้อผิดพลาดทั้งหมดใน Endpoint ต้องสอดคล้องกับ `codes.yaml` (ควรใช้ Script เช่น `validate-auth-openapi-problem-codes.mjs` ควบคู่กัน) |
| **Response 7807 Schema** | **[Required]** `[Automated by Spectral]` ต้องประกาศ Component Schema ชื่อ `Problem` ใน OpenAPI เสมอ และทุก ๆ `4xx` / `5xx` Response ต้องอ้างอิง `$ref: '#/components/schemas/Problem'` |
