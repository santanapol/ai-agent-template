# 10. Observability & Logging

มาตรฐานการติดตามการทำงานของระบบ (Observability) การเก็บ Log และ Metrics เพื่อให้สามารถวิเคราะห์และแก้ไขปัญหาได้อย่างรวดเร็ว

## 📝 Logging Standards (การใช้ Pino)
* **[บังคับ]** ห้ามใช้คำสั่ง `console.log` หรือ `console.error` ใน Production เด็ดขาด ให้ใช้ Library `pino` ซึ่งเป็น Structured JSON Logger แทน
* **Log Level:**
  * `production`: ค่าเริ่มต้นเป็น `warn`
  * `development`: เป็น `info` และสามารถใช้ `pino-pretty` เพื่อให้อ่านใน Console ได้ง่ายขึ้น
* **HTTP Logger:** บังคับใช้ Middleware `pino-http` ในการพิมพ์ Log ฝั่ง Request และ Response ทุกครั้งโดยอัตโนมัติ

## 🔒 Log Redaction (การปกปิดข้อมูลความลับ)
* ต้องตั้งค่ากรองและซ่อนข้อมูล Sensitive ก่อนถูกเขียนลง Log เสมอ โดยจะแทนที่ด้วยข้อความ `[REDACTED]`
* **ข้อมูลบังคับซ่อน:** `x-gateway-secret`, `authorization`, `cookie`, `password`, `token`, คีย์หรือรหัสผ่านต่าง ๆ รวมถึงข้อมูลส่วนบุคคลแบบเต็ม (PII)

## 🔗 Request Correlation (การผูก Tracing)
* ทุกการทำงานต้องส่ง Header **`x-request-id`** (ตัวพิมพ์เล็กเท่านั้น) ต่อไปให้กับทุก Service
* หากเป็นจุดเริ่มต้นและไม่มี Header นี้แนบมา ให้สร้าง UUID ขึ้นมาใหม่ เพื่อใช้โยงหา Log ข้าม Service เวลามีปัญหา

## 📊 Metrics (`prom-client`)
* การเก็บข้อมูล Metric ภายในตัวแอป (เช่น CPU, Memory Usage) ให้ใช้ `prom-client` ผ่าน Endpoint `GET /metrics`
* **ข้อควรระวัง:** ห้ามเปิด Endpoint นี้เป็น Public บังคับให้ต้องเรียกผ่าน Gateway ด้วยการตรวจสอบค่า `x-gateway-secret` ก่อนเสมอ
