# Plan: Dynamic Permission (Phase 3 — Staff Permission Checks & Dual-Check)

แผนการทำงานนี้มุ่งเน้นการปรับปรุงระบบตรวจสอบสิทธิ์ของ `staff-service` ให้รองรับการทำงานแบบ Dynamic Permissions ผ่าน HTTP Header `x-user-permissions` เพื่อแทนที่ระบบ Static Role-based เดิม โดยใช้กระบวนการหั่นงานแนวตั้ง (Vertical Slice) และกำหนดจุดตรวจสอบ (Checkpoints) เพื่อความปลอดภัยสูงสุด

## Architecture Decisions

1. **Permission Matching Contract Alignment**:
   - พอร์ต logic ของการหาค่า Permission matching มาจาก `auth-service` และทำให้เป็น library `src/lib/permission-match.js` ภายใน `staff-service` เพื่อให้มั่นใจว่าการคำนวณสิทธิ์มีความสม่ำเสมอและสอดคล้องกันทุกบริการ (Idempotent authorization logic)

2. **Transition Strategy (Dual-Check)**:
   - ใช้ `PERMISSION_MODE=dual` เป็นค่าเริ่มต้น ซึ่งจะยินยอมให้ใช้งานได้ทั้งสิทธิ์ใน Permission หรือบทบาทแบบ Static เดิม (เช่น สำหรับ Token รุ่นเก่าที่ไม่มี Permissions claim)
   - หากมีการยอมรับผ่านเงื่อนไขเดิม (Fallback) ระบบจะสร้าง warning logs เพื่อให้ทีมงานนำข้อมูลไปปรับปรุง seed data และสามารถสลับเป็น `enforce` เมื่อพร้อม

3. **Wildcard & Privilege Escalation Protection**:
   - การแก้ไขบทบาท (`PATCH /profiles/:id/role`) จะถูกย้ายไปใช้สิทธิ์ `roles:assign` (ซึ่งอยู่คนละ domain กับ `profiles`) เพื่อไม่ให้พนักงานที่ถือสิทธิ์ wildcard `profiles:*` (เช่น `branch_admin`) สามารถแอบแก้ไขบทบาทของตัวเองหรือคนอื่นเพื่อยกระดับสิทธิ์ตัวเองได้

---

## Task List

### Phase 1: Foundation (การสร้างรากฐานและฐานข้อมูล)

- [ ] **Task 1**: อัปเดตและ Seed สิทธิ์ `roles:assign` ใน `auth-service`
  - *Files*: `backend/auth/scripts/seed-data/permissions.js`
  - *Verification*: รัน `node --env-file=.env scripts/seed-permissions.js --prune` ใน `backend/auth` แล้วตรวจเช็ค collection `auth_menus` และ `auth_role_permissions` ใน MongoDB
- [ ] **Task 2**: พอร์ตและสร้าง Permission Matcher ใน `staff-service`
  - *Files*: `backend/service/staff/src/lib/permission-match.js`, `backend/service/staff/tests/unit-test/permission-match.test.js`
  - *Verification*: เขียน test case ครอบคลุม exact match, wildcard `domain:*`, invalid inputs และรัน `npm test` ผ่าน

### Checkpoint: Foundation
- [ ] สิทธิ์ `roles:assign` ถูกบันทึกลงใน MongoDB เรียบร้อย
- [ ] Library `permission-match.js` ทำงานได้อย่างแม่นยำและมี test ครอบคลุม 100%

### Phase 2: Core Refactoring (การปรับปรุงระบบตรวจสอบสิทธิ์)

- [ ] **Task 3**: ปรับปรุง middleware เพื่อดึงและกรอง Header `x-user-permissions`
  - *Files*: `backend/service/staff/src/plugins/user-context.js`, `backend/service/staff/src/plugins/duplicate-header.js`
  - *Verification*: ตรวจสอบว่า `userContext.permissions` ได้รับค่าอย่างถูกต้องจาก request header และปฏิเสธการส่ง header ซ้ำ
- [ ] **Task 4**: เพิ่มการตั้งค่า `PERMISSION_MODE` และ `PERMISSION_DENIED` code
  - *Files*: `backend/service/staff/src/config/env.js`, `backend/service/staff/src/config/runtime-env.js`, `backend/service/staff/src/lib/error-codes.js`
  - *Verification*: สภาพแวดล้อมระบบสามารถดึงค่า mode ได้และมีโค้ดตอบรับกรณี 403
- [ ] **Task 5**: ปรับปรุง profiles.service.js และฟังก์ชันเช็คสิทธิ์
  - *Files*: `backend/service/staff/src/modules/profiles/profiles.service.js`
  - *Verification*: สร้าง `assertPermission` พร้อม logic fallback + logging และอัปเดต signature `assertProfileScope(profile, userContext, actionKey)`

### Checkpoint: Core Features
- [ ] โครงสร้างระบบรองรับการแกะสิทธิ์และกำหนดค่า environment variables ได้สมบูรณ์
- [ ] Logic ใน service ถูกปรับเปลี่ยนมาใช้ Permission check และการรัน unit tests เดิมสามารถรันผ่านโดยไม่มี regression

### Phase 3: Integration & Documentation (การบูรณาการและการจดบันทึก)

- [ ] **Task 6**: ปรับปรุงคำอธิบายและ Schema ใน OpenAPI
  - *Files*: `backend/service/staff/openapi.yaml`, `backend/service/staff/openapi-via-gateway.yaml`
  - *Verification*: รัน `npm run spec:lint` ผ่านอย่างสะอาดเรียบร้อย
- [ ] **Task 7**: เพิ่ม Integration tests และตรวจสอบ Code Coverage
  - *Files*: `backend/service/staff/src/modules/profiles/tests/integration-test/*.js`
  - *Verification*: เขียนเทสจำลอง injection ทั้งโหมด `dual` และ `enforce` และรัน `npm run ci:with-coverage` ผ่านตาม gate ที่กำหนด

### Checkpoint: Complete
- [ ] บรรลุเกณฑ์การยอมรับทั้งหมดใน Spec
- [ ] ผ่านเกณฑ์ Coverage gate และ CI linting ทั้งหมด
- [ ] พร้อมจัดทำ Walkthrough ส่งให้เบียร์ตรวจสอบเพื่อ Deploy

---

## Risks and Mitigations

| ความเสี่ยง | ผลกระทบ | วิธีรับมือ |
| :--- | :--- | :--- |
| ลูกค้าหรือระบบที่มี Token รุ่นเก่าใช้งานไม่ได้เมื่อปิด dual-check | สูง | ระบบจะเก็บ warning logs เมื่อมีการเรียก fallback เพื่อตรวจสอบให้แน่ใจว่า token เก่าหมดอายุหรือได้รับการ seed สิทธิ์ครบถ้วนก่อนปิด dual-check |
| Wildcard Escalation (การแอบยกระดับสิทธิ์ผ่าน profiles:*) | สูง | ออกแบบแยก domain สิทธิ์สำหรับการเปลี่ยนบทบาทออกจาก profiles โดยสิ้นเชิง (ใช้ `roles:assign`) |
| การแก้ไขโค้ดผิดพลาดกระทบต่อ tenant-scoping เดิม | สูง | รักษาพฤติกรรมเดิมใน `assertProfileScope` สำหรับ self-access และมี integration tests คอยดักจับ |
