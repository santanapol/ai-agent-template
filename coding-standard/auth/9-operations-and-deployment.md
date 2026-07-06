# 6. Operations & Deployment

## Health และ Readiness (การตรวจสอบสถานะบริการ)
**[Recommended]** หาก Orchestrator ตรวจสอบ Health ของ Auth Service โดยตรง ให้ใช้ชื่อ Path และบทบาทการทำงานดังนี้:

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
    { "name": "mongodb", "status": "ok" },
    { "name": "redis", "status": "ok" }
  ]
}
```

**`GET /readyz` → `503 Service Unavailable`** (`Content-Type: application/problem+json`)
```json
{
  "type": "https://.../not-ready",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "Readiness check failed.",
  "code": "AUTH_NOT_READY"
}
```

## Process Lifecycle และ NPM Scripts
- **Process Error Handling:** จัดการ `uncaughtException` และ `unhandledRejection` โดยการพ่น Log ข้อผิดพลาดออกมา แล้วสั่ง `process.exit(1)` เพื่อให้ระบบ Container สั่งรันแอปขึ้นมาใหม่
- **Graceful Shutdown:** ต้องตอบสนองต่อ Event `SIGINT` / `SIGTERM` ➔ สั่งหยุดรับ Request ใหม่ (`server.close()`) ➔ คืนค่า Database Connection ตามลำดับอย่างปลอดภัย
- **Environment Flags:** **[Required]** บังคับใช้ฟีเจอร์ของ Node.js ยุคใหม่โดยใช้ flag `--env-file=.env` ในสคริปต์รัน (ไม่ต้องพึ่งพา `dotenv` library)
- **NPM Scripts:** **[Recommended]** ควรมีสคริปต์มาตรฐานเตรียมไว้เสมอ ได้แก่: `lint`, `test`, `format:check`, `ci`, `spec:lint`, `audit:check`

## ข้อห้ามเด็ดขาดระดับ Runtime (Forbidden)
- **[Forbidden]** ห้ามใช้คำสั่งซ่อนคำเตือนของระบบ (`--no-warnings`) บนเซิร์ฟเวอร์ Production เด็ดขาด
- **[Forbidden]** ห้ามเปิดใช้งาน Experimental Node Flags บน Production โดยปราศจากการเขียนเอกสาร ADR ขออนุมัติ
