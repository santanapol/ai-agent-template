# Security Pentest Report - Q3 2026

**Target:** `api.production.myplatform.com`
**Tool Used:** OWASP ZAP, Burp Suite Professional, SQLMap
**Date:** 2026-10-01
**Tester:** Security Team Alpha

## 🔴 High Severity Issues (ต้องแก้ไขด่วนก่อน Deploy)

### 1. SQL Injection Vulnerability in `/api/v1/search-rolling-setting`
- **Description:** พารามิเตอร์ `keyword` ถูกนำไปต่อสตริง SQL ตรงๆ โดยไม่ผ่านการตรวจสอบ (Sanitization) ทำให้แฮกเกอร์สามารถแก้ไขเงื่อนไขฐานข้อมูลได้
- **Proof of Concept (PoC):** ยิง Request `GET /api/v1/search-rolling-setting?keyword=1' OR '1'='1` ระบบคืนค่าข้อมูลทั้งหมดใน Database ออกมา
- **Recommendation:** ห้ามต่อสตริงตรงๆ ให้ใช้ Parameterized Queries (`?` binding) หรือใช้ ORM (เช่น Prisma, TypeORM) เสมอ

### 2. Broken Authentication in Password Reset Flow
- **Description:** API `/auth/reset-password` ไม่มีการจำกัดจำนวนครั้งการเดา OTP (No Rate Limiting)
- **Proof of Concept (PoC):** ใช้ Burp Suite Intruder ยิงสุ่มเลข OTP 6 หลักรัวๆ 100,000 ครั้ง สามารถเจาะรหัสผ่านผู้ใช้ได้
- **Recommendation:** จำกัดการเดาผิดได้ไม่เกิน 5 ครั้งต่อ 15 นาที และมีระบบ Lockout

## 🟡 Medium Severity Issues

### 1. Missing Security Headers
- **Description:** หน้า Backoffice UI ขาด Header ป้องกันที่สำคัญ
- **Recommendation:** เพิ่ม `Content-Security-Policy` (ป้องกัน XSS), `X-Frame-Options: DENY` (ป้องกัน Clickjacking), และ `Strict-Transport-Security`

## 🟢 Passed Checks (ส่วนที่ปลอดภัยแล้ว)
- ✅ CSRF tokens ถูกสร้างและตรวจสอบถูกต้องในทุกๆ POST/PUT/DELETE request
- ✅ การเก็บรหัสผ่านใน Database ใช้ bcrypt พร้อม Salt ระดับความปลอดภัยเพียงพอ
- ✅ JWT Token หมดอายุภายใน 1 ชั่วโมง และ HttpOnly Cookie ทำงานได้สมบูรณ์
