# 5. Security & Request Validation

เพื่อรีดประสิทธิภาพการทำงานสูงสุดของ Fastify **[Required] บังคับให้ใช้ระบบ JSON Schema ในตัวของ Fastify (ซึ่งใช้ Ajv)** สำหรับการตรวจสอบ Request (Body, Params, Query) เสมอ

> **[Forbidden]** ห้ามใช้ `Joi`, `Yup` หรือการ Validate ในระดับ Controller ด้วยตัวเองโดยเด็ดขาด เนื่องจากจะเป็นการสูญเสียประสิทธิภาพของ Schema Compiler ของ Fastify

| หัวข้อ | ข้อกำหนด (Rule) |
| :--- | :--- |
| **Library** | **[Required]** ใช้ JSON Schema ที่ฝังมากับ Fastify Route Config (`schema` object) เท่านั้น (หรืออาจพิจารณาใช้ `@fastify/type-provider-typebox` เพื่อประโยชน์ด้าน TypeScript/Type Inference) |
| **การจัดเก็บ** | **[Recommended]** ควรแยก JSON Schema Object ออกไปไว้ในไฟล์ `*.schema.js` (เช่น `users.schema.js`) และ Export นำมาเสียบใส่ Route Config เพื่อให้ไฟล์ Route สะอาด |
| **Error Format** | **[Required]** ต้องมี Global `setErrorHandler` เพื่อดักจับ `FastifyError` ที่เกิดจาก Validation (`error.validation`) แล้วแปลงโครงสร้าง Response ให้ออกมาในรูปแบบ Custom JSON Wrapper (`{ success: false, code, message, data: null, requestId }`) ตามมาตรฐาน Response Envelope ในข้อ 5 เสมอ |
