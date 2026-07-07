# 7. Request Headers

มาตรฐานการจัดการ Request Header ฝั่ง Backend เพื่อความปลอดภัยและการเชื่อมต่อกับ Gateway ที่ถูกต้อง

## 🛡️ Trusted Context Headers
Backend ต้องรอรับ Header ที่ถูกส่งต่อมาจาก API Gateway เพื่อใช้ระบุตัวตนและสิทธิ์ของผู้ใช้เสมอ โดยบังคับใช้ชื่อและลำดับดังนี้:
* `x-gateway-secret`: รหัสยืนยันจาก Gateway
* `x-user-ou`: ข้อมูลรหัสบริษัท/องค์กร
* `x-user-branch`: สาขาที่กำลังทำงาน (active branch)
* `x-user-home-branch`: สาขาบ้านถาวรของผู้ใช้ (optional — เมื่อ JWT มี `home_branch_id`)
* `x-user-id`: รหัสผู้ใช้งาน
* `x-user-role`: สิทธิ์ของผู้ใช้งาน
* `If-Match`: ใช้ร่วมกับการทำ Optimistic Locking เมื่อมีการแก้ไขข้อมูล

## 🚨 Duplicate Header Policy (นโยบายป้องกัน Header ซ้ำ)
**ห้ามอนุญาตให้มี Critical Headers ถูกส่งมาซ้ำเด็ดขาด** 
เนื่องจาก Express.js จะนำค่า Header ที่ส่งมาชื่อเดียวกันมาต่อกันด้วยเครื่องหมายลูกน้ำ (Comma-separated) โดยอัตโนมัติ ซึ่งอาจเปิดช่องโหว่ให้เกิดการแฮก (Spoofing / Auth Bypass) ได้ 

* **การจัดการ:** หากตรวจพบ Header สำคัญถูกส่งมามากกว่า 1 ค่าใน Request เดียว ให้ Middleware ปฏิเสธและตอบกลับด้วย HTTP Status **`400 INVALID_HEADER`** ทันที

## 🆔 Request ID
* ต้องรับและส่งต่อ Header **`x-request-id`** สำหรับทุก ๆ Request เสมอ
* บังคับใช้ตัวพิมพ์เล็กทั้งหมด (`lowercase`) เพื่อให้สามารถนำไปใช้ Tracking และดู Logging ต่อเนื่องข้าม Service ได้อย่างถูกต้อง

## 📝 OpenAPI (Swagger)
* ต้องประกาศ Header Parameters ที่จำเป็นทั้งหมดไว้ในไฟล์ `openapi.yaml` ของ Service เสมอ เพื่อให้ฝั่ง Frontend หรือผู้เรียกใช้ (Client) ทราบถึงข้อกำหนดอย่างชัดเจน

## 🏷️ ETag & If-Match (Optimistic Concurrency Control)
ใช้สำหรับป้องกันปัญหาการบันทึกข้อมูลทับกันเวลาที่มีผู้ใช้เปิดหน้าจอแก้ไขข้อมูลเดียวกันพร้อมกัน (Concurrent Updates)

* **ETag Generation (ฝั่ง Backend สร้าง):**
  * บังคับใช้รูปแบบ **Weak ETag** เสมอ (เช่น `W/"<base64_encode_ของ_upd_date>"`)
  * สร้าง ETag จากฟิลด์ `upd_date` เท่านั้น ห้ามนำ Document ทั้งก้อนไป Hash เพราะสิ้นเปลือง CPU และอาจทำให้โครงสร้างภายในรั่วไหล
* **Response Header (การส่ง ETag กลับให้ Client):**
  * แนบ Header `ETag` กลับไปเมื่อมีการดึงข้อมูล 1 รายการ (GET Detail) หรือเมื่อจัดการข้อมูลสำเร็จ (POST, PUT, PATCH)
  * ข้อยกเว้น: ไม่ต้องแนบ `ETag` กลับไปเมื่อมีการดึงข้อมูลแบบ List หรือตอนเกิด Error
* **Request Header (การรับ `If-Match` จาก Client):**
  * เมื่อ Client ต้องการแก้ไขหรือลบข้อมูล (PUT, PATCH, DELETE) **บังคับ** ต้องแนบค่า ETag เดิมกลับมาใน Header ตัวที่ชื่อ `If-Match` เสมอ
  * หากลืมส่งมา: ให้ตอบกลับเป็น HTTP Status **`428 PRECONDITION_REQUIRED`**
  * หากค่าไม่ตรงกับปัจจุบัน (มีคนอื่นชิงเซฟไปก่อน): ให้ตอบกลับเป็น HTTP Status **`412 VERSION_CONFLICT`**
