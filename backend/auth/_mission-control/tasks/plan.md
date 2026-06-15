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
* **Task 1: Shared Validation & Concurrency Foundation**
  - ย้าย `validateSeedData` ไปยังไฟล์ใหม่ `src/lib/permission-validation.js`
  - ทำ Unit Test ให้ครอบคลุมกฎ 7 ข้อและกรณีขอบเขต
  - ปรับปรุง `scripts/seed-permissions.js` ให้ดึงโมดูลร่วมนี้ไปใช้งาน โดยคงพฤติกรรมเดิม
* **Task 2: Modular Admin Route & Auth Guard**
  - ติดตั้งโครงสร้างแฟ้มงานใน `src/modules/admin/`
  - พัฒนา Schema และ Authorization Middleware สำหรับตรวจจับ Bearer Token และตรวจสอบสิทธิ์ครอบคลุม `permissions:manage`
  - ผูกเชื่อม Route Plugin เข้ากับ `app.js`

### Checkpoint: Foundation
* Unit Test และการ Register route สำเร็จโดยไม่มีข้อผิดพลาด
* Regression test ของ seed script เก่ายังคงผ่านทั้งหมด (17 tests)

### Phase 2: Core Features
* **Task 3: Menus Management API**
  - พัฒนา Endpoints: `GET`, `POST`, `PATCH`, `DELETE` ของ `/auth/admin/menus`
  - จัดการตรวจสอบสิทธิ์, Optimistic Locking (upd_date), Audit log (`auth.permissions_changed`) และมาตรการป้องกัน Self-Lockout (ห้ามแตะสิทธิ์ `permissions:manage` ผ่าน API)
* **Task 4: Role Permissions Mappings & Urgent Revoke API**
  - พัฒนา Endpoints: `GET`, `PUT`, `DELETE` ของ `/auth/admin/role-permissions`
  - จัดการแปลง URL `:ou_id` จาก string `"null"` -> `null`
  - พัฒนาฟังก์ชัน `revoke_sessions: true` ใน `PUT` สำหรับขยับ `token_gen` ของ user และลบ session ใน Redis ด้วย pipeline (จำกัดการประมวลผลสูงสุด 1,000 users ต่อ batch)

### Checkpoint: Complete
* Integration Test สำหรับ API ทั้งหมดรันผ่าน 100%
* บรรลุ Acceptance criteria ของทุก Task
* รัน `npm run lint` และ `npm run build` สำเร็จโดยไม่มี warning
