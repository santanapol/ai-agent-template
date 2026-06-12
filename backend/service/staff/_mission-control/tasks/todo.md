# Todo: Dynamic Permission (Phase 3 — Staff Permission Checks & Dual-Check)

รายการงานและเกณฑ์การยอมรับ (Acceptance Criteria) ในแต่ละ Task สำหรับการพัฒนาตรวจสอบสิทธิ์ใน `staff-service`

---

## Tasks

### Phase 1: Foundation (การสร้างรากฐานและฐานข้อมูล)

#### Task 1: อัปเดตและ Seed สิทธิ์ `roles:assign` ใน `auth-service`
- **Description**: เพิ่มสิทธิ์ `roles:assign` เข้าไปในระบบเพื่อเตรียมพร้อมสำหรับการจัดการบทบาทพนักงาน
- **Acceptance criteria**:
  - [x] เพิ่มสิทธิ์ `roles:assign` ใน `seedMenus` ของ `permissions.js` ใน auth-service โดยมี `parent_key: 'staff:profiles'`
  - [x] กำหนดให้สิทธิ์ `roles:assign` อยู่ใน `menu_keys` ของ `platform_admin` เท่านั้น (ใน `seedRolePermissions`)
- **Verification**:
  - [x] รันคำสั่ง seed ใน `backend/auth`:
    ```bash
    node --env-file=.env scripts/seed-permissions.js --prune
    ```
  - [x] คิวรีใน MongoDB หรือเช็ค Log ว่าซิงค์ข้อมูลสิทธิ์สำเร็จและไม่มี error
- **Files likely touched**:
  - [permissions.js](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/backend/auth/scripts/seed-data/permissions.js)
- **Estimated scope**: เล็ก (Small)
- **Dependencies**: None

#### Task 2: พอร์ตและสร้าง Permission Matcher ใน `staff-service`
- **Description**: สร้างระบบเปรียบเทียบสิทธิ์ (Exact และ Wildcard `domain:*`) ใน staff-service
- **Acceptance criteria**:
  - [x] สร้างไฟล์ `permission-match.js` ใน staff-service โดยยึดตาม Contract และ Logic ของ auth-service ทุกประการ
  - [x] สร้างชุดทดสอบ `permission-match.test.js` เพื่อตรวจสอบความถูกต้องตาม Contract
- **Verification**:
  - [x] รันการทดสอบใน `backend/service/staff`:
    ```bash
    node --test src/lib/permission-match.test.js # หรือ path ที่สร้าง
    ```
- **Files likely touched**:
  - [NEW] [permission-match.js](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/backend/service/staff/src/lib/permission-match.js)
  - [NEW] [permission-match.test.js](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/backend/service/staff/tests/unit-test/permission-match.test.js)
- **Estimated scope**: เล็ก (Small)
- **Dependencies**: Task 1

---

### Phase 2: Core Refactoring (การปรับปรุงระบบตรวจสอบสิทธิ์)

#### Task 3: ปรับปรุง middleware เพื่อดึงและกรอง Header `x-user-permissions`
- **Description**: อัปเดต middleware/plugin เพื่อให้ระบบรับรู้สิทธิ์ของผู้ใช้ผ่าน header
- **Acceptance criteria**:
  - [x] ปรับปรุง `user-context.js` ให้แยกสตริง `x-user-permissions` ด้วย comma และเก็บไว้ in `request.userContext.permissions`
  - [x] เพิ่ม `x-user-permissions` ใน `CRITICAL_HEADERS` ของ `duplicate-header.js`
- **Verification**:
  - [x] รันการทดสอบ Unit Tests และประเมินผล
- **Files likely touched**:
  - [user-context.js](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/backend/service/staff/src/plugins/user-context.js)
  - [duplicate-header.js](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/backend/service/staff/src/plugins/duplicate-header.js)
- **Estimated scope**: เล็ก (Small)
- **Dependencies**: Task 2

#### Task 4: เพิ่มการตั้งค่า `PERMISSION_MODE` และ `PERMISSION_DENIED` code
- **Description**: เพิ่ม config และ error response code เพื่อรองรับ dual-check และ permission denied
- **Acceptance criteria**:
  - [x] เพิ่ม `permissionMode` ใน `env.js` (ดึงจาก `PERMISSION_MODE` env, default `dual`)
  - [x] ประกาศ `PERMISSION_DENIED` ใน `error-codes.js`
- **Verification**:
  - [x] ตรวจสอบว่าระบบสามารถอ่านค่า Config ได้จาก fastify start-up
- **Files likely touched**:
  - [env.js](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/backend/service/staff/src/config/env.js)
  - [runtime-env.js](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/backend/service/staff/src/config/runtime-env.js)
  - [error-codes.js](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/backend/service/staff/src/lib/error-codes.js)
- **Estimated scope**: เล็ก (Small)
- **Dependencies**: Task 3

#### Task 5: ปรับปรุง profiles.service.js และฟังก์ชันเช็คสิทธิ์
- **Description**: แทนที่การเช็คบทบาทแบบ static ด้วย `assertPermission` และปรับปรุง `assertProfileScope`
- **Acceptance criteria**:
  - [/] สร้างฟังก์ชัน `assertPermission(userContext, actionKey, options)` ที่รองรับ dual-check และ warning fallback log
  - [/] อัปเดต `assertProfileScope` เพื่อเช็คสิทธิ์ตาม `actionKey` ที่ต้องการเข้าถึง
  - [/] นำ `assertPermission` ไปแทนที่ `assertAdminRole` และ `assertPlatformAdmin` และการเช็คบทบาทใน `resolveListScope`/`resolveLookupScope`
- **Verification**:
  - [ ] ปรับปรุง unit test ใน `rbac.test.js` และทดสอบว่า pure logic ทำงานถูกต้อง
- **Files likely touched**:
  - [profiles.service.js](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/backend/service/staff/src/modules/profiles/profiles.service.js)
  - [rbac.test.js](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/backend/service/staff/src/modules/profiles/tests/unit-test/rbac.test.js)
- **Estimated scope**: กลาง (Medium)
- **Dependencies**: Task 4

---

### Phase 3: Integration & Documentation (การบูรณาการและการจดบันทึก)

#### Task 6: ปรับปรุงคำอธิบายและ Schema ใน OpenAPI
- **Description**: อัปเดตเอกสาร API ให้ระบุ 403 `PERMISSION_DENIED` และอธิบายสิทธิ์ที่เกี่ยวข้องในแต่ละ Endpoint
- **Acceptance criteria**:
  - [ ] เพิ่ม `PermissionDenied` ใน `openapi.yaml` และ `openapi-via-gateway.yaml`
  - [ ] เพิ่มการตอบกลับ `403` อิง `PermissionDenied` ในทุกๆ Protected Endpoint
- **Verification**:
  - [ ] รันคำสั่งตรวจสอบ:
    ```bash
    npm run spec:lint
    ```
- **Files likely touched**:
  - [openapi.yaml](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/backend/service/staff/openapi.yaml)
  - [openapi-via-gateway.yaml](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/backend/service/staff/openapi-via-gateway.yaml)
- **Estimated scope**: เล็ก (Small)
- **Dependencies**: Task 5

#### Task 7: เพิ่ม Integration tests และตรวจสอบ Code Coverage
- **Description**: เขียนและปรับปรุงการทดสอบ Integration tests เพื่อทดสอบการส่ง Header `x-user-permissions` ใน Fastify
- **Acceptance criteria**:
  - [ ] ตรวจสอบ endpoint map ครบถ้วน (200/201/204/403) ทั้งโหมด `dual` และ `enforce`
  - [ ] มี test ตรวจสอบ warning fallback logging ในโหมด `dual`
  - [ ] ผ่าน coverage gate ที่กำหนดของโปรเจกต์
- **Verification**:
  - [ ] รันการทดสอบภาพรวม:
    ```bash
    npm run ci:with-coverage
    ```
- **Files likely touched**:
  - ไฟล์ต่างๆ ใน [integration-test](file:///home/santanapol/Documents/Workspace/Sandbox/agent-skill/code-base/zero-platform/backend/service/staff/src/modules/profiles/tests/integration-test/)
- **Estimated scope**: กลาง (Medium)
- **Dependencies**: Task 6
