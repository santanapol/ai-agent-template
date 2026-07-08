# 5. API Integration

การเชื่อมต่อ Backend/Gateway ใช้ `axios` เป็นหลัก เรียกผ่าน same-origin path (`/auth/*`, `/api/*`) ที่ Next.js rewrite ไปหา service จริง (ดู `next.config.mjs` — ไม่มี dev-server proxy แบบ Vite แล้ว)

## 🔌 API Clients (`lib/`)

- แยกไฟล์ตามโดเมนของการเรียกข้อมูล เช่น `authApiClient.ts`, `staffApiClient.ts`, `branchReportApiClient.ts`
- **Header injection:** ใช้ `setAccessToken` (`lib/baseApiClient.ts`) ตั้งค่า `axios.defaults.headers.common['Authorization']` — ห้ามแนบ token มือในแต่ละ call

## 🛡️ Interceptors & auto refresh token

- ทุก client (ยกเว้น login) ต้องดักจับ `401` ผ่าน Axios interceptor แล้วเรียก refresh callback ที่ผูกไว้ (`setRefreshCallback`)
- **Single-flight refresh:** refresh token cookie เป็น single-use และ rotate ทุกครั้ง — ต้องแชร์ promise เดียวกันข้าม client ที่ยิง 401 พร้อมกัน (ดู `refreshPromiseRef` ใน `AuthContext.tsx`) ห้ามให้แต่ละ client เรียก `/auth/refresh` แยกกัน เพราะ call ที่สองจะถูก reject แล้วอาจ force logout โดยไม่ตั้งใจ
- Error ที่มี `code: "AUTH_NOT_READY"` ระหว่าง branch switch → refresh แล้ว retry request เดิมหนึ่งครั้งก่อน throw ต่อ

## 🧩 Error message mapping

- แปล error code จาก backend เป็นข้อความผู้ใช้อ่านเข้าใจผ่าน `apiErrorMessage()` (`lib/apiError.ts`) — mapping ตาม allowlist ของ code เท่านั้น (ดู 08-error-handling.md)
