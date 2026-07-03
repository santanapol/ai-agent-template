# 8. OpenAPI Contract (Swagger)

มาตรฐานสำหรับการเขียน API Specification หรือเอกสารสัญญาการเชื่อมต่อ (Contract) เพื่อให้การพูดคุยข้าม Service หรือเรียกใช้จาก Frontend เป็นไปอย่างถูกต้องและปลอดภัย

## 📄 File Format & Location
* **ชื่อและที่อยู่ไฟล์:** บังคับตั้งชื่อ **`openapi.yaml`** และวางไว้ที่ **Root Folder** ของ Service เสมอ
* **ฟอร์แมต:** บังคับใช้รูปแบบ **YAML** เท่านั้น (ห้ามใช้ JSON เด็ดขาด)
  * ใช้การเว้นวรรค 2 เคาะ (2-space indent) ห้ามใช้ Tab
* **การจัดการขนาดไฟล์:** หากไฟล์มีขนาดใหญ่หรือยาวเกิน 3,000 บรรทัด อนุญาตให้แตกไฟล์เป็นส่วนย่อย ๆ ไปไว้ในโฟลเดอร์แยก (เช่น `./components/schemas.yaml`) และอ้างอิงผ่านคำสั่ง `$ref` ได้

## ⚙️ Versioning
* บังคับใช้มาตรฐาน **OpenAPI 3.1.0** เท่านั้น (ห้ามใช้ 3.0.x นอกเสียจากว่ามีข้อจำกัดที่แก้ไขไม่ได้ของ Tooling ที่ใช้งาน)

## 🏗️ โครงสร้างบังคับพื้นฐาน (Top-level Structure)
ข้อมูลขั้นต่ำที่ต้องประกาศในระดับบนสุด (Top-level) ของไฟล์ `openapi.yaml`:

| Field | กฎและการใช้งาน |
| :--- | :--- |
| **`openapi`** | `[Automated by Spectral]` ต้องระบุค่าเป็น `"3.1.0"` |
| **`info.title`** | ชื่อ Service ในรูปแบบ `kebab-case` (ต้อง **ตรงกัน** กับค่า `name` ใน `package.json`) |
| **`info.version`** | เวอร์ชันของ API ปัจจุบัน (ต้อง **ตรงกัน** กับค่า `version` ใน `package.json` เสมอ) |
| **`servers`** | **ห้ามระบุ Public URL** ให้ระบุเป็น URL ภายในระบบ (Internal URL) เพื่อความปลอดภัยและไม่เปิดเผย Endpoint จริงออกไปข้างนอก |
| **`security`** | ต้องกำหนด Global Security เป็นรับ Header `x-gateway-secret` เป็นค่าเริ่มต้น |
| **`tags`** | จัดหมวดหมู่ API (เช่น `users`, `orders`) โดยให้ชื่อตรงตามโฟลเดอร์ของ Feature/Module นั้น ๆ |
| **`paths`** | `[Automated by Spectral]` ทุก Endpoint บังคับให้ขึ้นต้น Path ด้วย `/api/v1/` เสมอ (ยกเว้น Route ตรวจสอบระบบเช่น `/healthz`, `/readyz`) |

> 💡 **หมายเหตุสำหรับ Public API:** หาก Service นี้มีการนำไปเชื่อมต่อออกสู่โลกภายนอก (Public Client) ผ่าน API Gateway แนะนำให้ทำไฟล์แยกคู่กันชื่อ **`openapi-via-gateway.yaml`** ที่อธิบาย Spec การใช้ Bearer Token ของฝั่งผู้ใช้นอกแยกต่างหากค่ะ
