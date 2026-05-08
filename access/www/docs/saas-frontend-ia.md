# SaaS Frontend IA (B2B Multi-Tenant ด้วย `ouId` และ `branchId`)

## เป้าหมาย

กำหนด Frontend IA ระดับ production สำหรับ B2B SaaS ที่ควบคุมขอบเขตการเข้าถึงข้อมูลด้วย `ouId` และ `branchId` อย่างชัดเจน

## Tenant Model

- **OU (`ouId`)**: ขอบเขตหน่วยธุรกิจระดับบนสุด
- **Branch (`branchId`)**: หน่วยปฏิบัติการภายใต้ OU
- **Membership**: ผู้ใช้ระบุด้วย `userId` และ 1 `userId` ผูกกับ 1 คู่ `ouId` + `branchId` เท่านั้น

Identity scope ที่แนะนำใน Frontend state:

- `userId`
- `currentOuId`
- `currentBranchId`
- `currentRole`
- `permissions[]`

## Route Strategy

ทุกหน้า business ควรระบุ tenant scope ใน URL ให้ชัดเจน

### OU-level routes

- `/ou/:ouId/dashboard`
- `/ou/:ouId/settings/account`
- `/ou/:ouId/settings/roles`
- `/ou/:ouId/admin/audit-logs`
- `/ou/:ouId/help/docs`

### Branch-level routes

- `/ou/:ouId/branches/:branchId/items`
- `/ou/:ouId/branches/:branchId/items/:itemId`
- `/ou/:ouId/branches/:branchId/settings`
- `/ou/:ouId/branches/:branchId/members`
- `/ou/:ouId/branches/:branchId/billing/plan`
- `/ou/:ouId/branches/:branchId/billing/invoices`
- `/ou/:ouId/branches/:branchId/reports`

## Sidebar Menu (แนะนำ)

- `Dashboard`
- `Items`
- `Reports` (เมื่อมี analytics use case)
- `Billing` (Owner/Admin)
- `Admin` (Admin)
- `Help`
- `Settings`

## Topbar (Tenant-safe)

- OU switcher (required)
- Branch switcher (required ถ้าผู้ใช้มีหลาย Branch)
- Global search ที่ scoped ตาม OU/Branch
- Notifications
- User menu:
  - `Profile`
  - `Preferences`
  - `Sign out`

## Settings IA

- `/ou/:ouId/settings/account` - ข้อมูล OU และ branding
- `/ou/:ouId/settings/roles` - RBAC และ custom roles
- `/ou/:ouId/settings/security` - SSO, MFA, session policy
- `/ou/:ouId/settings/integrations` - API/webhook/OAuth apps

## Branch Members IA

- `/ou/:ouId/branches/:branchId/members` - list members ใน branch
- `/ou/:ouId/branches/:branchId/members/create` - เพิ่มสมาชิกเข้า branch โดยตรง (ไม่ใช้ invite flow)
- `/ou/:ouId/branches/:branchId/members/:userId/edit` - แก้ไขข้อมูล/บทบาทสมาชิกโดยตรง
- `/ou/:ouId/branches/:branchId/members/:userId` - remove/suspend member ใน branch

## Billing IA

- `/ou/:ouId/branches/:branchId/billing/plan`
- `/ou/:ouId/branches/:branchId/billing/usage`
- `/ou/:ouId/branches/:branchId/billing/invoices`
- `/ou/:ouId/branches/:branchId/billing/payment-methods`

## Admin IA

- `/ou/:ouId/admin/users`
- `/ou/:ouId/admin/roles`
- `/ou/:ouId/admin/audit-logs`
- `/ou/:ouId/admin/api-keys`

## Access Control Model

### Public routes

- `/login`
- `/forgot-password`

### Authenticated routes

- ทุก route ภายใต้ `/ou/:ouId/*`

### Baseline roles

- `Owner`
- `Admin`
- `Manager`
- `Member`
- `Billing`

### Role scope policy (ล็อกใช้งาน)

- OU-level routes เข้าได้เฉพาะ `Owner` และ `Admin`
- ผู้ใช้ทั่วไปอยู่ Branch-level (`Manager`, `Member`, `Billing`)
- ผู้ใช้ 1 คนผูกกับ 1 `branchId` และจัดการได้เฉพาะ branch ของตัวเอง

### Owner/Admin capabilities (Branch management)

| Action | Owner | Admin | หมายเหตุ |
| --- | --- | --- | --- |
| สร้าง Branch (`branch:create`) | ✅ | ✅ | ภายใต้ OU ที่มีสิทธิ์ |
| แก้ไข Branch (`branch:update`) | ✅ | ✅ | เช่น name/status/config พื้นฐาน |
| ปิดใช้งาน Branch (`branch:deactivate`) | ✅ | ✅ | แนะนำเป็น default ก่อนลบจริง |
| ลบ Branch แบบถาวร (`branch:delete`) | ✅ | ❌ | จำกัด Owner เท่านั้น |
| จัดการสมาชิกใน Branch (`branch:member:manage`) | ✅ | ✅ | create/edit/remove/suspend ตาม policy |
| จัดการ Billing ของ Branch (`billing:manage`) | ✅ | ✅ | เปิดเป็น default สำหรับ `Admin` ทุก OU |

### Role Matrix (OU-level vs Branch-level)

| Role | Scope | Dashboard | Items | Members (branch) | Billing (branch) | OU Settings/Roles | Audit Logs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Owner` | OU | ✅ | ✅ (ทุก branch ใน OU) | ✅ | ✅ | ✅ | ✅ |
| `Admin` | OU | ✅ | ✅ (ทุก branch ใน OU) | ✅ | ✅ | ✅ | ✅ |
| `Manager` | Branch | ✅ (branch ตัวเอง) | ✅ Read/Write | ✅ Create/Edit/Remove | ✅ Read | ❌ | ❌ |
| `Member` | Branch | ✅ (branch ตัวเอง) | ✅ Read/Write | ❌ | ❌ | ❌ | ❌ |
| `Billing` | Branch | ✅ (branch ตัวเอง) | ✅ Read | ❌ | ✅ Read | ❌ | ❌ |

หมายเหตุ:

- `Reports` ใน MVP เป็น placeholder menu ยังไม่ผูก API จริง
- `Admin` มี `billing:manage` เป็นค่า default ทุก OU
- Members ใช้ direct management (`create/edit/remove`) และไม่มี invite flow

### Permission examples

- `ou:read`, `ou:manage`
- `branch:read`, `branch:manage`
- `branch:create`, `branch:update`, `branch:deactivate`, `branch:delete`
- `items:read`, `items:write`
- `branch:member:create`, `branch:member:update`, `branch:member:remove`
- `billing:read`, `billing:manage`
- `audit:read`
- `apikeys:manage`

### Guard rules

- Require authenticated session สำหรับ `/ou/:ouId/*`
- Validate membership ของผู้ใช้กับ `:ouId`
- Validate ว่า `:branchId` อยู่ภายใต้ `:ouId`
- Enforce permission checks ทั้งระดับ page และ action
- Unauthorized -> `/403`
- Not found -> `/404`

## URL และ State Conventions

- ใช้ `kebab-case` ใน path segments
- ใช้ชื่อ resource แบบพหูพจน์ (`/items`, `/users`, `/invoices`)
- เก็บ OU/Branch scope ไว้ใน path ไม่ใช่เก็บแค่ใน state
- Persist OU/Branch ล่าสุดที่ผู้ใช้เลือกเพื่อความสะดวก
- Reset scoped caches ทุกครั้งที่สลับ OU/Branch

## API Matrix (Menu -> Route -> API -> Permission)

| Menu | Frontend Route | API Endpoint (MVP) | Permission ตัวอย่าง |
| --- | --- | --- | --- |
| `Dashboard` | `/ou/:ouId/branches/:branchId/dashboard` | `GET /api/v1/ou/:ouId/branches/:branchId/dashboard` | `branch:read` |
| `Items` (list) | `/ou/:ouId/branches/:branchId/items` | `GET /api/v1/ou/:ouId/branches/:branchId/items` | `items:read` |
| `Items` (detail) | `/ou/:ouId/branches/:branchId/items/:itemId` | `GET /api/v1/ou/:ouId/branches/:branchId/items/:itemId` | `items:read` |
| `Members` | `/ou/:ouId/branches/:branchId/members` | `GET /api/v1/ou/:ouId/branches/:branchId/members` | `branch:member:read` |
| `Members` (create) | `/ou/:ouId/branches/:branchId/members/create` | `POST /api/v1/ou/:ouId/branches/:branchId/members` | `branch:member:create` |
| `Members` (edit) | `/ou/:ouId/branches/:branchId/members/:userId/edit` | `PATCH /api/v1/ou/:ouId/branches/:branchId/members/:userId` | `branch:member:update` |
| `Members` (remove) | `/ou/:ouId/branches/:branchId/members/:userId` | `DELETE /api/v1/ou/:ouId/branches/:branchId/members/:userId` | `branch:member:remove` |
| `Billing` (plan) | `/ou/:ouId/branches/:branchId/billing/plan` | `GET /api/v1/ou/:ouId/branches/:branchId/billing/plan` | `billing:read` |
| `Billing` (invoices) | `/ou/:ouId/branches/:branchId/billing/invoices` | `GET /api/v1/ou/:ouId/branches/:branchId/billing/invoices` | `billing:read` |
| `Reports` (placeholder) | `/ou/:ouId/branches/:branchId/reports` | N/A (MVP ยังไม่เปิด API) | `reports:read` (future) |
| `Admin` | `/ou/:ouId/admin/audit-logs` | `GET /api/v1/ou/:ouId/admin/audit-logs` | `audit:read` |
| `Help` | `/ou/:ouId/help/docs` | static/docs service | public/authenticated ตาม policy |
| `Settings` | `/ou/:ouId/settings/account` | `GET /api/v1/ou/:ouId/settings/account` | `ou:read` |

## UX Guidance สำหรับ Tenant Safety

- แสดง OU และ Branch ปัจจุบันให้เห็นชัดใน header
- ใน destructive-confirm dialog ให้ระบุชื่อ OU/Branch เสมอ
- แสดง breadcrumbs แบบมี scope:
  - `OU / Branch / Items`
  - `OU / Settings / Members`
- ควรแสดง disabled state พร้อมเหตุผล แทนการซ่อน action แบบเงียบๆ
- บน mobile ใช้ drawer navigation พร้อม quick actions

## Current Backend Mapping

อ้างอิง known gateway routes ปัจจุบัน:

- Frontend items pages <-> API `/api/v1/items`
- Frontend profile/me pages <-> API `/api/v1/me`

ฝั่ง Backend ต้อง enforce tenant isolation ที่ server-side โดยใช้ authenticated user context และ OU/Branch authorization policy

## MVP (Phase 1)

- OU switcher
- Branch switcher
- Tenant-scoped dashboard
- Items list/detail
- Branch-level member management (create/edit/list/remove)
- Basic RBAC guard
- Branch-level billing read-only pages

## Phase 2

- Fine-grained custom roles และ permissions
- Audit logs
- API keys และ integrations
- Usage-based billing และ quotas

## API Contract Checklist

Checklist นี้ใช้ตรวจความพร้อมของ API ก่อนเชื่อม Frontend จริงในบริบท B2B multi-tenant (`userId`, `ouId`, `branchId`)

### 1) Identity และ Auth Context

- Token/session ต้องมี `userId` ชัดเจน (identifier หลักของผู้ใช้)
- ระบบต้องระบุ OU/Branch context ที่ผู้ใช้เข้าถึงได้ตามสิทธิ์
- ทุก request ที่เป็น protected route ต้องผ่าน authentication ก่อนเสมอ

### 2) Tenant Scope Enforcement

- Endpoint ที่เป็นข้อมูลธุรกิจต้องผูก scope ด้วย `ouId` และ/หรือ `branchId`
- ฝั่ง Backend ต้อง validate ว่า `branchId` อยู่ภายใต้ `ouId` จริง
- ห้ามเชื่อ tenant scope จาก Frontend state เพียงอย่างเดียว ต้องตรวจจาก auth context ที่ server-side
- ป้องกัน cross-tenant data leakage ทุก endpoint

### 3) Authorization และ Permission

- ตรวจ role/permission ระดับ endpoint และระดับ action
- แยกสิทธิ์ OU-level กับ Branch-level ให้ชัด
- ตัวอย่าง permission ที่ควรใช้:
  - `ou:read`, `ou:manage`
  - `branch:read`, `branch:manage`
  - `items:read`, `items:write`
  - `branch:member:create`, `branch:member:update`, `branch:member:remove`
  - `billing:read`, `billing:manage`
  - `audit:read`

### 4) Request Contract

- Path params ต้องใช้ชื่อมาตรฐานเดียวกัน: `:ouId`, `:branchId`, `:itemId`
- Validation ต้องชัดเจนทั้ง required fields, format, และ business rules
- ในกรณี list endpoint ให้รองรับ pagination/filter/sort อย่างสม่ำเสมอ
- ระบุ idempotency policy สำหรับ write operations ที่เสี่ยงถูก retry

### 5) Response Contract

- กำหนด response envelope ให้คงที่ทุก service (เช่น `data`, `meta`, `error`)
- List response ต้องมี `meta` ที่จำเป็น (`page`, `pageSize`, `total`)
- ชื่อ field ใน payload ต้องคงรูปแบบเดียวกันทั้งระบบ
- Timestamp ควรใช้มาตรฐานเดียวกัน (เช่น ISO 8601)

### 6) Error Contract

- Error shape ต้องคงที่และ parse ได้ง่ายจาก Frontend
- ใช้ HTTP status code ให้ถูกต้อง (`400`, `401`, `403`, `404`, `409`, `422`, `500`)
- ระบุ machine-readable `error.code` ที่ stable
- ข้อความ error ต้องไม่เผยข้อมูล sensitive หรือข้อมูลข้าม tenant

### 7) Observability และ Audit

- ทุก request ควรมี `requestId`/`traceId` สำหรับ tracing
- งานสำคัญด้านสิทธิ์ (เช่น create/edit/remove member, role change) ต้องมี audit log
- Audit event ควรเก็บอย่างน้อย: `userId`, `ouId`, `branchId` (ถ้ามี), action, timestamp

### 8) Frontend Integration Readiness

- มีตัวอย่าง API payload สำหรับ success และ error cases
- มี contract test หรือ schema validation เพื่อกัน regression
- มี fallback behavior ที่ชัดเจนบน Frontend:
  - `401` -> ไปหน้า login
  - `403` -> ไปหน้า forbidden
  - `404` -> ไปหน้า not found

### 9) Versioning และ Change Policy

- กำหนด API versioning strategy ให้ชัด (เช่น `/api/v1`)
- หลีกเลี่ยง breaking change แบบเงียบๆ
- ทุก breaking change ต้องมี deprecation window และ migration note
