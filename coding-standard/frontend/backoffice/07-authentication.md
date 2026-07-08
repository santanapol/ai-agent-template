# 7. Authentication Flow

ระบบ Auth ฝั่ง frontend อยู่ที่ `src/contexts/AuthContext.tsx` — กฎที่ต้องปฏิบัติ:

## 🔐 การเก็บรักษา Token

- Access token ที่ได้จาก `/auth/login` หรือ `/auth/refresh` เก็บไว้ **ใน memory เท่านั้น** ผ่าน `setAccessToken` (`lib/baseApiClient.ts`)
- **[Forbidden]** ห้ามเก็บ access token ใน `localStorage`/`sessionStorage` เด็ดขาด (ป้องกัน XSS)
- Refresh token ส่งเป็น **HttpOnly cookie** เท่านั้น — frontend ไม่แตะ token นี้โดยตรง

## 🔄 Silent refresh (single-flight)

- ตอน mount, `AuthContext` เรียก `refreshFn()` เพื่อแลก access token ใหม่จาก refresh cookie แบบเงียบ — สำเร็จถึงปล่อยเข้าแอป ไม่สำเร็จ → เคลียร์ session แล้วให้ `MainLayoutClient` redirect ไป `/login`
- **Route guard ต่างหากจาก AuthContext:** การ redirect ไป `/login` ทำที่ `MainLayoutClient` (`src/app/(main)/main-layout-client.tsx`) โดยเช็ค `user`/`loading` จาก `useAuth()` — ไม่ทำใน `AuthContext` เอง
- ทุก API client แชร์ refresh callback เดียวกัน (`refreshPromiseRef`) เพื่อกัน concurrent 401 ยิง `/auth/refresh` ซ้อนกัน (ดู 05-api-integration.md)

## 👤 Decode JWT

- Decode payload เองฝั่ง client ด้วย `atob`/`JSON.parse` (ไม่ยิง API ขอ profile ซ้ำ) — ต้องเช็ค `exp` หมดอายุและ validate `token_gen` เป็นจำนวนเต็มไม่ติดลบก่อนเชื่อ payload
