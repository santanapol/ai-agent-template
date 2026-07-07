# 3. API Response Codes

## Response Envelope
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
| `code` | **[Required]** รหัสจาก `codes.yaml` เพื่อให้ Client แยกแยะ Error ได้แม่นยำ |

- **[Required]** ต้องประกาศ Schema `Problem` (RFC 7807) ใน `openapi.yaml` และใช้ `content-type: application/problem+json` สำหรับทุก Error Response
- **[Forbidden]** ห้ามใช้ `application/json` กับ Error Response (ต้องเป็น `application/problem+json` เท่านั้น)

## Error Mapping (การจัดการข้อผิดพลาด)
**[Required]** ทุก Error Response ต้องเป็น RFC 7807 (`application/problem+json`) โดยฟิลด์ `code` ต้องตรงกับที่ลงทะเบียนไว้ใน `codes.yaml` และ `status` ต้องจับคู่กับ HTTP Status Code ตามตารางด้านล่าง:

| `code` | HTTP Status | `type` URI slug |
| :--- | :--- | :--- |
| `AUTH_INVALID_REQUEST` | `400` | `invalid-request` |
| `LOGIN_INVALID_CREDENTIALS` | `401` | `invalid-credentials` |
| `TOKEN_REFRESH_REJECTED` | `401` | `refresh-rejected` |
| `LOGIN_ACCOUNT_LOCKED` | `423` | `account-locked` |
| `AUTH_TOO_MANY_ATTEMPTS` | `429` | `too-many-attempts` |
| `AUTH_INTERNAL_UNAUTHORIZED` | `401` | `internal-unauthorized` |
| `AUTH_USER_NOT_FOUND` | `404` | `user-not-found` |
| `AUTH_PASSWORD_UNCHANGED` | `400` | `password-unchanged` |
| `AUTH_PASSWORD_POLICY_VIOLATION` | `400` | `password-policy-violation` |
| `AUTH_NOT_READY` | `503` | `not-ready` |
