# 5. OpenAPI Contract

## OpenAPI Specification
| หัวข้อ | ข้อกำหนด (Rule) |
| :--- | :--- |
| **Operation `summary`** | **[Required]** `[Automated by Spectral]` หากมี Endpoint ต่อไปนี้ **ต้อง** ใช้ชื่อสั้น (Canonical):<br>• `GET /healthz` ➔ `Liveness`<br>• `GET /readyz` ➔ `Readiness`<br>• `POST /auth/login` ➔ `Login`<br>• `POST /auth/refresh` ➔ `Refresh token`<br>• `POST /auth/logout` ➔ `Logout` |
| **Error Codes (`code`)** | **[Required]** ทุก `code` ที่ส่งใน Body (ถ้ามี) สำหรับข้อผิดพลาดของ Auth Edge **ต้อง** ถูกลงทะเบียนไว้ใน `codes.yaml` |
