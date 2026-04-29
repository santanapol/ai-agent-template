# Auth API Contract (Edge)

ข้อกำหนด HTTP สำหรับ **Endpoint ที่ Client (Browser / App) หรือ Mesh เรียกใช้งาน Auth Service โดยตรง** (ไม่ใช่ข้อกำหนด Envelope ของ Internal API หลัง Gateway)

**Tag legend (ระดับความเข้มงวด):**

| Tag | ความหมาย |
| :--- | :--- |
| **[Required]** | ต้องทำ; deviation ต้อง ADR |
| **[Recommended]** | แนะนำ default; เปลี่ยนได้ตามบริบท |
| **[Forbidden]** | ห้าม; ละเมิด = block merge |
| **[Reference]** | ตัวอย่าง / ภาคผนวก ไม่บังคับ |
| **[ADR-gated]** | ต้องเขียน ADR + sign-off ก่อนทำ |

---

## 1. Design & Contract (การออกแบบและสัญญา API)

### 1.1 Response Envelope

Auth Edge Service ใช้รูปแบบ **Response แยกตามประเภท** ดังนี้:

**Success** (`application/json`):
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

**Error** — **[Required]** ใช้ **RFC 7807 Problem Details** (`application/problem+json`) เป็นมาตรฐาน:
```json
{
  "type": "https://example.invalid/auth/problems/<slug>",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Invalid username or password.",
  "code": "LOGIN_INVALID_CREDENTIALS"
}
```

| Field | ความหมาย |
| :--- | :--- |
| `type` | URI ที่ระบุประเภทปัญหา (Machine-readable) |
| `title` | คำอธิบายสั้น (Human-readable) |
| `status` | HTTP Status Code ซ้ำใน Body เพื่อความสะดวก |
| `detail` | รายละเอียดเพิ่มเติม (อาจ omit ได้) |
| `code` | **[Required]** รหัสจาก [`codes.yaml`](./codes.yaml) เพื่อให้ Client แยกแยะ Error ได้แม่นยำ |

- **[Required]** ต้องประกาศ Schema `Problem` (RFC 7807) ใน `openapi.yaml` และใช้ `content-type: application/problem+json` สำหรับทุก Error Response
- **[Forbidden]** ห้ามใช้ `application/json` กับ Error Response (ต้องเป็น `application/problem+json` เท่านั้น)

### 1.2 OpenAPI Specification

| หัวข้อ | ข้อกำหนด (Rule) |
| :--- | :--- |
| **Operation `summary`** | **[Required]** หากมี Endpoint ต่อไปนี้ **ต้อง** ใช้ชื่อสั้น (Canonical):<br>• `GET /healthz` ➔ `Liveness`<br>• `GET /readyz` ➔ `Readiness`<br>• `POST /auth/login` ➔ `Login`<br>• `POST /auth/refresh` ➔ `Refresh token`<br>• `POST /auth/logout` ➔ `Logout` |
| **Error Codes (`code`)** | **[Required]** ทุก `code` ที่ส่งใน Body (ถ้ามี) สำหรับข้อผิดพลาดของ Auth Edge **ต้อง** ถูกลงทะเบียนไว้ใน [`codes.yaml`](./codes.yaml) |

---

## 2. Error Mapping (การจัดการข้อผิดพลาด)

**[Required]** ทุก Error Response ต้องเป็น RFC 7807 (`application/problem+json`) โดยฟิลด์ `code` ต้องตรงกับที่ลงทะเบียนไว้ใน [`codes.yaml`](./codes.yaml) และ `status` ต้องจับคู่กับ HTTP Status Code ตามตารางด้านล่าง:

| `code` | HTTP Status | `type` URI slug |
| :--- | :--- | :--- |
| `AUTH_INVALID_REQUEST` | `400` | `invalid-request` |
| `LOGIN_INVALID_CREDENTIALS` | `401` | `invalid-credentials` |
| `TOKEN_REFRESH_REJECTED` | `401` | `refresh-rejected` |
| `LOGIN_ACCOUNT_LOCKED` | `423` | `account-locked` |
| `AUTH_TOO_MANY_ATTEMPTS` | `429` | `too-many-attempts` |
| `AUTH_NOT_READY` | `503` | `not-ready` |

---

## 3. Headers, Cookies & Context (การจัดการข้อมูลส่วนหัวและบริบท)

### 3.1 ลำดับ Headers ที่เชื่อถือได้ (Canonical Trusted Header Order)

สำหรับการเชื่อมต่อภายใน (Internal/Mesh) **ที่ Auth Service ต้องส่งต่อบริบทผู้ใช้ไปยัง Downstream หรือ Gateway** หากมีการอ้างอิง Headers ชุดนี้ใน OpenAPI หรือตัวอย่าง HTTP **ต้องเรียงลำดับจากบนลงล่างดังนี้เสมอ** (สามารถข้ามตัวที่ไม่ได้ใช้งานได้ แต่ห้ามสลับลำดับตัวที่เหลือ):

1. **`x-gateway-secret`** (สำหรับ Caller ยืนยันตัวตน)
2. **`x-user-ou`** (Organization Unit ID)
3. **`x-user-branch`** (Branch ID)
4. **`x-user-id`** (User ID)
5. **`x-user-role`** (Role แบบ Opaque String)
6. **`If-Match`** (สำหรับ ETag / Conditional updates)
7. **`x-request-id`** (และต่อด้วย Header ทั่วไปอื่นๆ เช่น `Content-Type`, `Accept`)

> **[Forbidden]** ไม่อนุญาตให้มีการส่งค่า Headers สำคัญเหล่านี้แบบซ้ำซ้อนหลายค่า (Duplicate Headers) หากพบให้ Reject เป็น 400 หรือ 401 ทันที

### 3.2 การจัดการ Cookies และ Tracing

| รายการ | ข้อกำหนด (Rule) |
| :--- | :--- |
| **Refresh Token (Cookies)** | **[Recommended]** ควรตั้งค่า `HttpOnly`, `Secure` และ `SameSite` ตามความเสี่ยงของแอป<br>**[Required]** หาก Dev ต้องใช้ `Secure: false` ให้ระบุไว้ใน OpenAPI และ ADR ให้ชัดเจน |
| **`x-request-id` (Tracing)** | **[Recommended]** รับค่าจาก Client หรือสร้าง UUID v4 ใหม่, ส่ง `x-request-id` (ต้องเป็นตัวเล็กทั้งหมด) ไปยัง Gateway/Downstream, ผูก Context กับ Log, และต้องมีส่งกลับใน Response Header หา Caller ด้วย |

---

## 4. Security & Rate Limiting (ความปลอดภัยและการจำกัดปริมาณ)

| หัวข้อ | ข้อกำหนด (Rule) |
| :--- | :--- |
| **Transport** | **[Required]** ใช้ TLS บน Production เสมอ<br>**[Forbidden]** ห้ามส่ง Refresh Token หรือ Password ผ่าน Query String |
| **Rate Limit (HTTP)** | **[Required]** ต้องจำกัดความถี่ต่อ Client Identity (มักเป็น IP หรือ Key จาก Reverse Proxy) สำหรับ `POST /auth/login`, `POST /auth/refresh` และ `POST /auth/logout`<br>**[Required]** ต้องแยก Policy ตาม Route (ไม่ใช้ Bucket รวมกัน เพื่อป้องกันการ Refresh กินโควตาของ Login)<br>**[Required]** ระบุตัวเลข Limit ที่ชัดเจนใน OpenAPI / ADR และต้องเข้มงวดไม่น้อยกว่าค่า Default ด้านล่าง |
| **Rate Limit (Default)** | **[Recommended]** ค่าเริ่มต้นแนะนำ (ปรับเปลี่ยนได้ตาม SLO):<br>• `POST /auth/login`: **≤ 30** req/min<br>• `POST /auth/refresh`: **≤ 120** req/min<br>• `POST /auth/logout`: **≤ 60** req/min<br>*(ควรใช้ Window 1 นาที และหากเกินให้ตอบ 429 พร้อม Response Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`)* |
| **Rate Limit vs Throttle** | **[Required]** ต้องแยกชั้น **HTTP Rate Limit** (Middleware) ออกจาก **Credential Throttle** (เช่น การล็อกบัญชีเมื่อใส่รหัสผิด)<br>แม้จะตอบ `429` ได้ทั้งคู่ แต่**ต้องระบุฟิลด์แยกประเภทข้อผิดพลาดใน Response ให้ชัดเจน** (เช่น ระบุ `type` หากใช้ `problem+json` หรือระบุ `error` หากใช้ OAuth 2.0) ตามที่ได้ประกาศไว้ใน OpenAPI |
| **Enumeration** | **[Recommended]** ใช้ `enumerationGuard` หรือ `enumerationGroup` ใน [`codes.yaml`](./codes.yaml) เพื่อป้องกันผู้โจมตีแยกแยะได้ว่า Username นั้นมีหรือไม่มีในระบบ |

---

## 5. Health และ Readiness (การตรวจสอบสถานะบริการ)

**[Recommended]** หาก Orchestrator ตรวจสอบ Health ของ Auth Service โดยตรง ให้ใช้ชื่อ Path และบทบาทการทำงานดังนี้:

| Path | ประเภท | บทบาท / ข้อกำหนด (Rule) |
| :--- | :--- | :--- |
| **`GET /healthz`** | Liveness | ตรวจสอบว่า Process ทำงานอยู่ (ห้ามเปิดเผยข้อมูล Sensitive หรือค่า Config) |
| **`GET /readyz`** | Readiness | ตรวจสอบว่า Dependencies พร้อมรับ Traffic (หากไม่พร้อมให้ตอบ `503 Service Unavailable`) |
| **`GET /health`** | - | **[Forbidden]** ห้ามใช้ (ยกเลิกการใช้งานแล้วตามมาตรฐาน) |
