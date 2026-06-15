# Phase A Plan: Permission Admin API

ภาพรวมและตรรกะเบื้องหลังการแบ่ง Task ในการพัฒนาโมดูลจัดการสิทธิ์ผ่าน Admin API (`backend/auth`)

## Dependency Graph

```
[src/lib/permission-validation.js] (ย้ายกฎ 7 ข้อ)
       │
       ├── [src/modules/admin/admin.validator.js]
       │
       └── [src/modules/admin/admin.repository.js]
               │
               ├── [src/modules/admin/admin.service.js]
               │       │
               │       └── [src/modules/admin/admin.controller.js]
               │               │
               │               └── [src/modules/admin/admin.route.js]
```

## Vertical Slices & Task Breakdown

### Phase 1: Foundation

- **Task 1: Shared Validation & Concurrency Foundation**
  - ย้าย `validateSeedData` ไปยังไฟล์ใหม่ `src/lib/permission-validation.js`
  - ทำ Unit Test ให้ครอบคลุมกฎ 7 ข้อและกรณีขอบเขต
  - ปรับปรุง `scripts/seed-permissions.js` ให้ดึงโมดูลร่วมนี้ไปใช้งาน โดยคงพฤติกรรมเดิม
- **Task 2: Modular Admin Route & Auth Guard**
  - ติดตั้งโครงสร้างแฟ้มงานใน `src/modules/admin/`
  - พัฒนา Schema และ Authorization Middleware สำหรับตรวจจับ Bearer Token และตรวจสอบสิทธิ์ครอบคลุม `permissions:manage`
  - ผูกเชื่อม Route Plugin เข้ากับ `app.js`

### Checkpoint: Foundation

- Unit Test และการ Register route สำเร็จโดยไม่มีข้อผิดพลาด
- Regression test ของ seed script เก่ายังคงผ่านทั้งหมด (17 tests)

### Phase 2: Core Features

- **Task 3: Menus Management API**
  - พัฒนา Endpoints: `GET`, `POST`, `PATCH`, `DELETE` ของ `/auth/admin/menus`
  - จัดการตรวจสอบสิทธิ์, Optimistic Locking (upd_date), Audit log (`auth.permissions_changed`) และมาตรการป้องกัน Self-Lockout (ห้ามแตะสิทธิ์ `permissions:manage` ผ่าน API)
- **Task 4: Role Permissions Mappings & Urgent Revoke API**
  - พัฒนา Endpoints: `GET`, `PUT`, `DELETE` ของ `/auth/admin/role-permissions`
  - จัดการแปลง URL `:ou_id` จาก string `"null"` -> `null`
  - พัฒนาฟังก์ชัน `revoke_sessions: true` ใน `PUT` สำหรับขยับ `token_gen` ของ user และลบ session ใน Redis ด้วย pipeline (จำกัดการประมวลผลสูงสุด 1,000 users ต่อ batch)

### Checkpoint: Complete

- Integration Test สำหรับ API ทั้งหมดรันผ่าน 100%
- บรรลุ Acceptance criteria ของทุก Task
- รัน `npm run lint` และ `npm run build` สำเร็จโดยไม่มี warning

## Decisions Log

- **`auth_menus` compound index `{type:1, ou_id:1}` — ปิด item, ไม่ทำเพิ่ม (carry มาตั้งแต่ R1/R3-11/R4-8/R5-7)**
  - ที่มา: review รอบ 1 สังเกตว่า `findActionMenusForOu` (`{ type: 'action', ou_id: { $in: [null, ouId] } }` ใน `auth.repository.js`) ไม่มี index ครอบ `type`/`ou_id` ทำให้เป็น collection scan ทุกครั้งที่เรียก `GET /auth/me/menus`
  - การตัดสินใจ: **ไม่เพิ่ม** compound index นี้ เพราะ `auth_menus` เป็น registry ขนาดเล็ก (seed ผ่าน `seed-permissions.js`, อยู่ในระดับสิบ-ร้อยรายการ) — collection scan บน collection ขนาดนี้ไม่มีผลต่อ performance อย่างมีนัยสำคัญ เทียบกับต้นทุนของ index เพิ่มเติม (write amplification ทุกครั้งที่ seed sync รัน) ไม่คุ้มค่า
  - `{ou_id:1, role:1}` (`by_ou_role`) ที่เพิ่มบน `auth_users` ใน round 3 เป็นคนละ index คนละจุดประสงค์ (ใช้กับ `countUsersInScope`/`revoke_sessions` ซึ่งเป็น hot path บน collection ที่โตตามจำนวน user จริง) — ไม่ได้ถูกใช้แทน item นี้ แต่เป็นการแก้ปัญหาคนละข้อที่ถูกหยิบขึ้นมาพร้อมกัน
  - หากในอนาคต `auth_menus` โตขึ้นมาก (เช่นหลายพัน action ต่อ OU) ค่อยพิจารณาเพิ่ม index นี้ใหม่
