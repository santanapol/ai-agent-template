# 5. Operations & Deployment

## Health และ Readiness (การตรวจสอบสถานะบริการ)
| Path | ประเภท | บทบาท / ข้อกำหนด (Rule) |
| :--- | :--- | :--- |
| **`GET /healthz`** | Liveness | ตรวจสอบว่า Process Gateway ทำงานอยู่ (ห้ามเปิดเผยข้อมูล Sensitive หรือค่า Config) |
| **`GET /readyz`** | Readiness | **[Required]** ตรวจสอบว่าพร้อมรับ Traffic โดย **ต้องมีการเช็ค `PING` ไปยัง Redis ด้วย** หาก Gateway มีการเปิดใช้ JWT Revocation Gate (หากไม่พร้อมให้ตอบ `503 Service Unavailable`) |
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
    { "name": "jwks", "status": "ok" },
    { "name": "routes", "status": "ok" },
    { "name": "redis", "status": "ok" }
  ]
}
```
> **หมายเหตุ:** array `dependencies` ต้องระบุทุก dependency ที่ Gateway ต้องพึ่งพา (`redis` จะปรากฏก็ต่อเมื่อเปิดใช้ JWT Revocation Gate)

**`GET /readyz` → `503 Service Unavailable`** (`Content-Type: application/problem+json`)
```json
{
  "type": "https://.../not-ready",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "Readiness check failed: JWKS not available.",
  "code": "GATEWAY_NOT_READY"
}
```

## Process Lifecycle และ NPM Scripts
| Item | Rule |
| :--- | :--- |
| **Graceful Shutdown** | **[Required]** ต้องตอบสนองต่อ Event `SIGINT` / `SIGTERM` ➔ หยุดรับ Request ใหม่ ➔ รอให้ In-flight request ทำงานเสร็จ ➔ ปิด Upstream client |
| **Environment Flags** | **[Required]** รันแอปพลิเคชันด้วยฟีเจอร์ Native ของ Node.js ผ่าน flag `--env-file=.env` |
| **Experimental Flags** | **[Forbidden]** ห้ามใช้ `--experimental-*` ใน Production โดยเด็ดขาด |
