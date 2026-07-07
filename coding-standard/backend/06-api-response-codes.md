# 5. API Response Codes

> * ใช้ HTTP Status Code **ของจริงเสมอ** ผ่าน `res.status()` (ห้ามส่ง 200 แต่ Code เป็น Error 500)
> * `code` ใน Response Body ต้องเป็นฟอร์แมต **UPPER_SNAKE_CASE** เท่านั้น โดยอ้างอิงจาก `codes.yaml`

| HTTP Status | Result Code | Meaning |
| :--- | :--- | :--- |
| 200 | **SUCCESS** | Operation successful |
| 201 | **CREATED** | Resource created successfully |
| 400 | **INVALID_HEADER** | Invalid or duplicate request header |
| 400 | **INVALID_JSON_BODY** | Request body is not valid JSON |
| 400 | **INVALID_PARAM** | Request validation failed |
| 400 | **MISSING_CONTENT_TYPE** | Request body present but Content-Type header missing |
| 401 | **GATEWAY_SECRET_REJECTED**| Authentication failed |
| 403 | **INVALID_USER_CONTEXT** | User or tenant context is invalid |
| 403 | **MISSING_GATEWAY_USER_CONTEXT** | Required user context is missing |
| 404 | **NO_MATCHING_API_PATH** | No matching resource for this path |
| 404 | **RESOURCE_NOT_FOUND** | The requested resource was not found |
| 409 | **DUPLICATE** | A resource with this identifier already exists |
| 412 | **VERSION_CONFLICT** | Resource was modified by another request. Refresh and retry. |
| 415 | **UNSUPPORTED_MEDIA_TYPE** | Request Content-Type is not supported |
| 428 | **PRECONDITION_REQUIRED** | If-Match header is required for this operation. |
| 429 | **TOO_MANY_REQUESTS** | Too many requests, please try again later. |
| 500 | **DATASTORE_CREDENTIAL_REJECTED**| Data store credentials rejected or misconfigured |
| 500 | **INTERNAL_ERROR** | An internal error occurred |
| 503 | **SERVICE_UNAVAILABLE** | Service is temporarily unavailable |

---

**ลำดับฟิลด์:** `success` → `code` → `message` → `data` → (`pagination` หรือ `requestId`)

* **List (ชุดข้อมูล):** `data` เป็น **Array** (ต้องมี `pagination` ถ้าแบ่งหน้า)
* **Detail (รายการเดียว):** `data` เป็น **Object**
* **Error / No Data:** `data` ต้องเป็น **null** เสมอ (ต้องมี `requestId` จาก `x-request-id` สำหรับ Error)
* **Field Naming:** ตั้งชื่อสื่อความหมายใน JSON (เช่น `id` แทน `_id`) **ยกเว้น** โปรเจกต์ระบุให้ใช้ตาม DB ฟิลด์ ต้องระบุใน OpenAPI ให้ตรงกันทั้งระบบ
