# 9. Operations & Deployment

มาตรฐานด้านระบบปฏิบัติการ (Operations) และการ Deploy ขึ้น Production เพื่อให้ระบบมีความเสถียรและมั่นคง

## 📉 Service Level Objectives (SLO Baseline)
การวัดประสิทธิภาพความน่าเชื่อถือของระบบ:
* **Latency p95:** ต้องทำงานตอบสนองเร็วกว่า `< 1000 ms`
* **Error Rate:** ต้องน้อยกว่า `< 2%` (สัดส่วน 5xx ต่อ Request ทั้งหมด)
* **Availability (Uptime):** ต้องเปิดใช้งานได้มากกว่า `≥ 99.5%`

## 🛡️ Security SLA (กำหนดเวลาแก้ไขช่องโหว่)
หากตรวจพบช่องโหว่ความปลอดภัย (Vulnerability) จาก `npm audit` หรือ Dependabot ให้แก้ไขภายในเวลาที่กำหนด:
* **Critical:** ภายใน **48 ชั่วโมง**
* **High:** ภายใน **7 วัน** (หากพบระดับ High หรือ Critical จะถูกบล็อกการ Merge ทันทีใน CI Pipeline)
* **Medium:** ภายใน **30 วัน**

## 🏥 Liveness & Readiness Probes
ทุก Service ต้องเตรียม Endpoint พื้นฐานไว้สำหรับตรวจสอบสถานะ:

| Path | ประเภท | บทบาท / ข้อกำหนด (Rule) |
| :--- | :--- | :--- |
| **`GET /healthz`** | Liveness | ตรวจสอบว่า Process ทำงานอยู่ (ห้ามเปิดเผยข้อมูล Sensitive หรือค่า Config) |
| **`GET /readyz`** | Readiness | ตรวจสอบว่า Dependencies พร้อมรับ Traffic (หากไม่พร้อมให้ตอบ `503 Service Unavailable`) |
| **`GET /health`** | - | **[Forbidden]** ห้ามใช้ (ยกเลิกการใช้งานแล้วตามมาตรฐาน) |

### Response Schema

**`GET /healthz` → `200 OK`** (`Content-Type: application/json`)
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 120
}
```
> **หมายเหตุ:** `uptime` คือจำนวนวินาที (integer) นับตั้งแต่ Process เริ่มทำงาน ห้ามเปิดเผย Config, Secret หรือข้อมูล Sensitive ใดๆ

**`GET /readyz` → `200 OK`** (`Content-Type: application/json`)
```json
{
  "status": "ok",
  "dependencies": [
    { "name": "database", "status": "ok" }
  ]
}
```
> **หมายเหตุ:** array `dependencies` ต้องระบุทุก dependency ที่ Service ต้องพึ่งพา (เช่น `mongodb`, `redis`, `jwks`)

**`GET /readyz` → `503 Service Unavailable`** (`Content-Type: application/json`)
```json
{
  "success": false,
  "code": "SERVICE_UNAVAILABLE",
  "message": "Readiness check failed.",
  "data": null,
  "requestId": "req-123456"
}
```

## 🗄️ Database Index Rollout (ข้อกำหนดเรื่องการสร้าง Index)
* **ห้าม** ให้ Application Code แอบสร้าง Index เองโดยอัตโนมัติ (Bootstrap) บน Production
* การสร้าง Index ต้องสร้างด้วยคำสั่ง `{ background: true }` ในช่วงเวลาที่มี Traffic ต่ำเสมอ เพื่อป้องกัน Database ล็อกการทำงาน
