# 9. Request Validation

## การตรวจสอบความถูกต้องของข้อมูล (Validation)

เพื่อรีดประสิทธิภาพการทำงานสูงสุดของ Fastify สำหรับ Auth Service **[Required] บังคับให้ใช้ระบบ JSON Schema ในตัวของ Fastify (ซึ่งใช้ Ajv)** สำหรับการตรวจสอบ Request (Body, Params, Query) เสมอ

> **[Forbidden]** ห้ามใช้ `Joi`, `Yup` หรือการ Validate ในระดับ Controller ด้วยตัวเองโดยเด็ดขาด เนื่องจากจะเป็นการสูญเสียประสิทธิภาพของ Schema Compiler ของ Fastify

| หัวข้อ | ข้อกำหนด (Rule) |
| :--- | :--- |
| **Library** | **[Required]** ใช้ JSON Schema ที่ฝังมากับ Fastify Route Config (`schema` object) เท่านั้น (หรืออาจพิจารณาใช้ TypeBox ในอนาคตหากต้องการ Type Safety เต็มรูปแบบ) |
| **การจัดเก็บ** | **[Recommended]** ควรแยก JSON Schema Object ออกไปไว้ในไฟล์ `*.schema.js` หรือ `*.validator.js` (เช่น `auth.schema.js`) และ Export นำมาเสียบใส่ Route Config เพื่อให้ไฟล์ Route สะอาด |
| **Error Format** | **[Required]** ต้องมี Global `setErrorHandler` เพื่อดักจับ `FastifyError` ที่เกิดจาก Validation (`error.validation`) แล้วแปลงโครงสร้าง Response ให้ออกมาในรูปแบบ `application/problem+json` (RFC 7807) พร้อม Status 400 (เช่น `AUTH_INVALID_REQUEST`) ตามมาตรฐาน Response Envelope ของ Auth เสมอ |
