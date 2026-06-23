# Spec: Permission Admin UI (Dynamic Permission — Phase F2)

> 🗺️ ภาพรวมทุก phase: [ROADMAP](../../../backend/auth/_mission-control/ROADMAP.md)
>
> ต่อยอดจาก:
> - [Phase F — Menu + guards](./SPEC.md) (permission-driven sidebar/route)
> - [Phase A — Permission Admin API](../../../backend/auth/_mission-control/SPEC-permission-admin-api.md) (CRUD registry + role mappings)
>
> **สถานะ:** ✅ อนุมัติแล้ว (2026-06-10) — พร้อมเข้า `/plan`

## Assumptions I'm Making

1. **Phase A API พร้อมใช้งานแล้ว** (`/auth/admin/*`) และ deploy บน environment ที่ backoffice ชี้ไป — F2 เป็น consumer เท่านั้น ไม่แก้ backend
2. ผู้ใช้หน้านี้ต้องมี **`permissions:manage`** (จาก login/refresh `permissions[]`) — route guard + ซ่อนเมนูถ้าไม่มีสิทธิ์
3. **OU-specific ยังไม่เปิด** — UI แสดงเฉพาะ **Global** (`ou_id = null`) ตาม Phase A Resolved 2; ไม่มีตัวเลือก OU ใน UI
4. **ภาษา UI เป็น English** ให้สอดคล้อง Phase F และหน้า admin อื่น (Staff, Invoices) — label เมนูใน registry แก้ได้ผ่าน API (data)
5. หน้าเดียว **`/permissions`** แบ่งเป็น **2 แท็บ**: Menu catalog | Role permissions (ไม่แยก route ย่อย)
6. **Optimistic locking เฉพาะ Menu** — `PATCH/DELETE /auth/admin/menus/:key` ส่ง `If-Match` เป็น **`upd_date` ดิบ (ISO string)** จาก response body — **ไม่ใช้** `W/"..."` และ **ไม่ใช่** `ETag` header (ต่างจาก Staff ที่อ่าน `extractETag`); `role-permissions` PUT เป็น upsert ล้วน (last-write-wins ไม่มี If-Match) ส่วน DELETE ใช้ query `?confirm=true`
7. หลังบันทึก role mapping สำเร็จ **ไม่ auto-refresh** session ของผู้เรียก — แสดงข้อความ staleness; มี checkbox **`revoke_sessions`** (default off) สำหรับเคสเร่งด่วน ตาม Phase A

---

## Objective

ให้แอดมินที่มี `permissions:manage` จัดการ **ผังเมนู/action registry** และ **role → menu_keys mappings** ผ่าน Backoffice (พร้อม Bruno collection สำหรับ SIT/manual smoke) โดย:

| แท็บ | API หลัก | ผู้ใช้ทำอะไร |
| :--- | :--- | :--- |
| **Menu catalog** | `GET/POST/PATCH/DELETE /auth/admin/menus` | ดู tree, เพิ่มโหนด, แก้ label/parent/sort, ลบโหนด |
| **Role permissions** | `GET/PUT/DELETE /auth/admin/role-permissions` | เลือก role → ติ๊กสิทธิ์จาก tree → บันทึก Global mapping |

**User stories**

| # | Story | Acceptance (สรุป) |
| :--- | :--- | :--- |
| US-1 | แอดมินเปิดเมนู Settings → Permissions | เห็นหน้า `/permissions` เมื่อมี `permissions:manage` |
| US-2 | แอดมินเพิ่ม action key ใหม่ | POST สำเร็จ → tree อัปเดต; validation error แสดงรายการจาก API |
| US-3 | แอดมินแก้ label/parent ของโหนด | PATCH สำเร็จ; ห้ามแก้ `key`/`type` ใน UI |
| US-4 | แอดมินลบโหนดที่มีลูก | API 409 → แสดงข้อความชัดเจน ไม่ลบ |
| US-5 | แอดมิน map สิทธิ์ให้ `branch_admin` | PUT สำเร็จ; ติ๊กตรงกับ `menu_keys` ที่ส่ง |
| US-6 | แอดมินติ๊ก revoke sessions | PUT พร้อม `revoke_sessions: true` → success message ระบุผล |
| US-7 | ผู้ไม่มีสิทธิ์เข้า `/permissions` ตรง | `PermissionGuard` → `/403` |

---

## Tech Stack

- React 19 + TypeScript + Vite + antd v6 + react-router-dom + axios (ตาม backoffice — ไม่เพิ่ม dependency)
- Client: `authApiClient` (proxy `/auth` เหมือน login/refresh)

## Commands

```bash
cd frontend/backoffice
npm run dev          # http://localhost:5173 (proxy /auth)
npm run test
npm run lint
npm run build
```

## Data dependency (ก่อน deploy F2)

ต้องมีใน **auth seed** + รัน seed ก่อน deploy frontend:

```
settings (menu)                    [NEW — group]
└─ permissions:manage (action)     [NEW — route /permissions]
```

และ map ให้ **`platform_admin`** อย่างน้อย (Phase A กำหนดไว้แล้วสำหรับ API; F2 เพิ่ม **เมนูนำทาง**)

**`MENU_UI` (Phase F)** — เพิ่มใน `AdminLayout.tsx`:

```typescript
'settings': { icon: <SettingOutlined /> },
'permissions:manage': { icon: <SafetyCertificateOutlined />, route: '/permissions' },
```

**`App.tsx`** — route + guard:

```typescript
{
  path: 'permissions',
  element: (
    <PermissionGuard required="permissions:manage">
      <PermissionAdmin />
    </PermissionGuard>
  ),
},
```

---

## Project Structure

```
backend/_bruno/auth/
  admin/                           ← [NEW] Bruno collection — Permission Admin API (OQ-5)
    folder.yml
    List menus.yml
    Create menu node.yml
    Update menu node.yml
    Delete menu node.yml
    List role permissions.yml
    Upsert role permissions.yml
    Delete role permission override.yml

frontend/backoffice/src/
  types/
    permissionAdmin.ts           ← [NEW] AdminMenuNode, RolePermissionRow, DTOs

  lib/
    authApiClient.ts             ← [MODIFY] admin menu + role-permission methods
    authApiClient.test.ts        ← [MODIFY] mock CRUD + If-Match (menus only) + ?confirm
    apiError.ts                  ← [MODIFY] map AUTH_* codes (400 detail string, 409, 412)

  pages/
    PermissionAdmin/
      index.tsx                  ← [NEW] page shell + Tabs
      MenuCatalogTab.tsx         ← [NEW] tree + modals
      RolePermissionsTab.tsx     ← [NEW] role select + checkbox tree + save
      MenuNodeFormModal.tsx      ← [NEW] create/edit menu (shared fields)
      permissionAdminUtils.ts    ← [NEW] flat→tree, sort, collect keys
      permissionAdminUtils.test.ts
      PermissionAdmin.test.tsx   ← [NEW] smoke + guard scenarios

  layouts/AdminLayout.tsx        ← [MODIFY] MENU_UI entries
  App.tsx                        ← [MODIFY] route /permissions
```

---

## API Mapping

Base: `authApiClient` → `/auth/admin/*` (Bearer จาก `AuthContext`)

| UI action | Method | Path | Notes |
| :--- | :--- | :--- | :--- |
| โหลด registry | `GET` | `/auth/admin/menus` | response `{ menus: AdminMenuNode[] }` → build tree ฝั่ง client |
| เพิ่มโหนด | `POST` | `/auth/admin/menus` | body: `key`, `label`, `type`, `parent_key`, `sort_order`; คืน `201` พร้อม node |
| แก้โหนด | `PATCH` | `/auth/admin/menus/:key` | body: `label`/`parent_key`/`sort_order` (อย่างใดอย่างหนึ่งขึ้นไป) + **`If-Match: <upd_date ISO ดิบ>`** (required → ไม่ส่ง = `412`) |
| ลบโหนด | `DELETE` | `/auth/admin/menus/:key` | **`If-Match: <upd_date ISO ดิบ>`** (required → ไม่ส่ง = `412`); คืน `204` |
| โหลด mappings | `GET` | `/auth/admin/role-permissions?role={role}` | response `{ role_permissions: RolePermissionMapping[] }`; Global filter ส่ง `ou_id=null` ได้ (service map `'null'`→`null`) |
| บันทึก mapping | `PUT` | `/auth/admin/role-permissions/null/{role}` | body: `{ menu_keys: string[], revoke_sessions?: boolean }` — **ไม่มี If-Match** (upsert); คืน `{ ou_id, role, menu_keys, revoked_sessions, revoked_users_count }` |
| ลบ override | `DELETE` | `/auth/admin/role-permissions/null/{role}` | **query `?confirm=true`** เมื่อมี active users (มิฉะนั้น `409`); **ไม่มี If-Match**; คืน `204` |

> **หมายเหตุ path:** segment `null` เป็น literal สำหรับ Global ตาม Phase A — client ต้อง encode ถูกต้อง
> **หมายเหตุ If-Match:** เฉพาะ `menus` PATCH/DELETE; ค่าเป็น `upd_date` ISO **ดิบ** (เช่น `2026-06-10T12:00:00.000Z`) ไม่ห่อ `W/"..."` ไม่มี quote — API เทียบ `existing.upd_date.toISOString() === ifMatch` ตรงๆ

### Type sketch

```typescript
export interface AdminMenuNode {
  key: string;
  label: string;
  type: 'menu' | 'action';
  parent_key: string | null;
  sort_order: number;
  upd_date: string; // ISO — ใช้เป็น If-Match (raw) บน PATCH/DELETE menus
}

export interface RolePermissionMapping {
  ou_id: null;
  role: string;
  menu_keys: string[];
  upd_date: string; // ไม่ใช้ทำ If-Match (PUT เป็น upsert)
}

export interface UpsertRolePermissionResult {
  ou_id: string | null;
  role: string;
  menu_keys: string[];
  revoked_sessions: boolean;
  revoked_users_count: number;
}
```

---

## UX & Behavior

### แท็บ Menu catalog

- แสดง **Tree** (antd `Tree` หรือ `Table` แบบ indent) เรียง `sort_order`
- ปุ่ม **Add node** → Modal: `key` (create only), `label`, `type` (`menu`|`action`), `parent_key` (Select จากโหนด `type=menu`), `sort_order`
- แถว/โหนด: **Edit** (PATCH fields ที่อนุญาต), **Delete** (Popconfirm)
- **ห้าม** UI แก้ `key` / `type` หลังสร้าง — แสดง read-only ใน edit mode
- **Self-lockout guard (UI):** โหนด `permissions:manage` — **ทั้ง Edit และ Delete disabled** + tooltip (backend คืน `400` ทั้ง PATCH/DELETE สำหรับ key นี้ — UI ช่วยลดความผิดพลาด)
- Error `400`: `detail` เป็น **string เดียว** (errors join ด้วย `, ` เช่น `"Menu validation failed: ..."`) — แสดงข้อความตรงๆ หรือ split `", "` เป็น bullet list ฝั่ง client
- Error `409`: ข้อความเฉพาะจาก `detail` (code `AUTH_MENU_IN_USE` — มีลูก / ถูกอ้างใน mapping)
- Error `412`: code `AUTH_PRECONDITION_FAILED` — แสดงข้อความให้ refresh แล้วลองใหม่

### แท็บ Role permissions

- **Role** `Select` — ค่าเริ่มจากรายการที่รู้จัก: `platform_admin`, `branch_admin`, `staff` (constant ในโค้ด; ขยายได้เมื่อมี role ใหม่)
- โหลด `GET role-permissions` + `GET menus` → **Checkbox tree** ของ `menu_keys` ทั้ง registry
- ปุ่ม **Save** → `PUT .../null/{role}` พร้อม `menu_keys` ที่ติ๊ก (ไม่มี If-Match — upsert)
- Checkbox **Revoke active sessions for users with this role** → `revoke_sessions: true` (default **unchecked**; แสดงคำเตือนก่อนบันทึก)
- **Self-lockout guard:** สำหรับ `platform_admin` ไม่ให้ untick `permissions:manage` **และนับ `permissions:*` (wildcard) เป็นว่ามีสิทธิ์แล้ว** (สะท้อนกฎ backend ที่ยอมรับทั้ง `permissions:manage` หรือ `permissions:*`) — disabled checkbox + tooltip; ถ้า mapping ปัจจุบันถือ `permissions:*` ไม่ต้องบังคับติ๊ก `permissions:manage`
- หลัง save สำเร็จ: `message.success` — ถ้า `revoked_users_count > 0` ระบุ *"Revoked N active session(s)."*; มิฉะนั้น *"Users must refresh their session to see permission changes."* (ใช้ `revoked_users_count` จาก response)

### Loading / empty / error

- Skeleton ขณะโหลด tree
- Empty state เมื่อ registry ว่าง (ไม่ควรเกิดบน prod หลัง seed)
- 403 จาก API → แสดง Result 403 ในหน้า (ไม่ crash)

---

## Code Style

- ใช้ `useAppFeedback` (`message`/`modal`) เหมือน `StaffManagement.tsx`
- ขยาย `apiErrorMessage` ให้ map code ของ auth admin (ดูตารางด้านล่าง) — **ไม่ใช่** `VERSION_CONFLICT` (โค้ดของ staff)
- ไม่เก็บ admin data ใน `localStorage` — โหลดใหม่ทุกครั้งเปิดแท็บ
- Form: antd `Form` + `Modal`; destructive actions ต้องมี `Popconfirm`
- **ห้าม** duplicate permission matching logic — ใช้ `usePermission('permissions:manage')` สำหรับปุ่มย่อยภายในหน้า (ถ้ามี)

**Error codes จาก Phase A (เพิ่มใน `apiErrorMessage`):**

| status | code | ความหมาย |
| :--- | :--- | :--- |
| 400 | `AUTH_INVALID_REQUEST` | validation 7 กฎ / self-lockout / OU ≠ null — `detail` เป็น string |
| 409 | `AUTH_MENU_IN_USE` | ลบโหนดที่มีลูกหรือถูกอ้างใน mapping |
| 409 | `AUTH_ROLE_PERMISSION_IN_USE` | ลบ mapping ที่มี active users (ต้อง `?confirm=true`) |
| 412 | `AUTH_PRECONDITION_FAILED` | If-Match ไม่ตรง/หาย (เฉพาะ menus) |
| 404 | `AUTH_MENU_NOT_FOUND` / `AUTH_ROLE_PERMISSION_NOT_FOUND` | ไม่พบ resource |

```typescript
// If-Match = upd_date ISO ดิบ (ไม่ห่อ W/"...") — เฉพาะ menus PATCH/DELETE
// อ่านจาก response body ไม่ใช่ ETag header → ห้ามใช้ extractETag()
function ifMatchFromUpdDate(updDate: string): string {
  return updDate;
}
```

---

## Testing Strategy

Vitest + Testing Library (ตามโครงเดิม):

| ระดับ | ไฟล์ | ครอบคลุม |
| :--- | :--- | :--- |
| Unit | `permissionAdminUtils.test.ts` | flat→tree, sort, key collection |
| Unit | `authApiClient.test.ts` | admin methods ส่ง path/body ถูก; menus PATCH/DELETE แนบ `If-Match` (ISO ดิบ); role PUT/DELETE **ไม่มี** If-Match; DELETE role แนบ `?confirm=true`; unwrap `{menus}`/`{role_permissions}` |
| Unit | `apiError.test.ts` | map `AUTH_PRECONDITION_FAILED`/`AUTH_MENU_IN_USE`/`AUTH_ROLE_PERMISSION_IN_USE`/`AUTH_INVALID_REQUEST`; `detail` เป็น string เดียว |
| Component | `PermissionAdmin.test.tsx` | 403 without permission; tab render; save calls PUT |
| Component | `PermissionGuard.test.tsx` | (existing) เพิ่มเคส route `/permissions` ถ้าจำเป็น |

**ไม่ทำ E2E** ใน phase นี้ — manual smoke หลัง deploy ตาม Success Criteria

### Bruno collection (`backend/_bruno/auth/admin/`)

- ขยาย collection `auth` ที่มีอยู่แล้ว — รูปแบบ `.yml` ให้สอดคล้องโฟลเดอร์เดิม
- ใช้ environment `Local.yml` (`{{baseUrl}}`, `{{access_token}}`) — login ผ่าน `auth/Login.yml` ก่อน
- ครอบคลุม endpoint ทั้ง 7 ตัวใน API Mapping โดย **If-Match เฉพาะ `menus` PATCH/DELETE** (ค่า ISO ดิบ); `role-permissions` PUT ไม่มี If-Match; DELETE role ใช้ `?confirm=true`
- ห้าม hardcode credentials — ใช้ `{{username}}` / `{{password}}` ตาม `bruno-generator` skill
- Post-response script บน Login set `{{access_token}}` แล้ว — request ใน `admin/` ใส่ `Authorization: Bearer {{access_token}}` (auth: inherit)
- แนะนำให้ capture `upd_date` จาก response ของ Create/List menu ลง env var เพื่อใช้ต่อใน PATCH/DELETE (post-response script)

---

## Boundaries

### Always

- ทุก mutation ผ่าน Phase A API เท่านั้น (ไม่เรียก mongosh/seed จาก UI)
- Route `/permissions` มี `PermissionGuard required="permissions:manage"`
- ส่ง `If-Match` (ISO ดิบ) เฉพาะ `menus` PATCH/DELETE; `role-permissions` DELETE ใช้ `?confirm=true` เมื่อมี active users
- แสดง validation errors จาก API ตรงๆ ไม่เดา business rules ซ้ำฝั่ง client (ยกเว้น self-lockout disable ที่สะท้อนกฎ API)
- ส่งมอบ Bruno collection ครบทุก admin endpoint ใน `backend/_bruno/auth/admin/`

### Ask first

- เพิ่ม OU selector / multi-tenant UI
- รองรับ rename `key` หรือ bulk import/export
- เปลี่ยนจาก 2 แท็บเป็นหลายหน้า/route
- เพิ่มภาษาไทยทั้งหน้า

### Never

- ห้าม bypass API ไปแก้ MongoDB
- ห้ามให้ role ที่ไม่มี `permissions:manage` เข้าถึงหน้านี้
- ห้าม untick `permissions:manage` จาก `platform_admin` ผ่าน UI
- ห้าม hardcode รายการ `menu_keys` ทั้งระบบเป็น source of truth — **API registry เป็นแหล่งเดียว**

---

## Success Criteria

| # | เกณฑ์ | วิธีตรวจ |
| :--- | :--- | :--- |
| SC-1 | ผู้มี `permissions:manage` เห็นเมนู Settings → Permissions และเปิด `/permissions` ได้ | manual + component test |
| SC-2 | สร้าง action key ใหม่ผ่าน UI → ปรากฏใน tree และใน Role tab | manual |
| SC-3 | แก้ mapping `branch_admin` → refresh token ของ test user → เมนู sidebar เปลี่ยนตาม Phase F | manual (staging) |
| SC-4 | ลบโหนดที่มีลูก → 409 + ไม่ลบ | manual / component mock |
| SC-5 | Concurrent edit โหนดเมนู (If-Match เก่า) → `412` → ข้อความ refresh (เฉพาะแท็บ Menu; role PUT เป็น last-write-wins ไม่มี 412) | manual |
| SC-6 | `npm run build && npm test && npm run lint` ผ่าน | CI/local |
| SC-7 | ผู้ไม่มีสิทธิ์ → `/403` | PermissionGuard test |
| SC-8 | Bruno `admin/*` รันผ่าน Bruno GUI ครบ 7 requests (login → CRUD smoke) | manual SIT |

---

## Rollout (F2)

1. Merge + deploy **Phase A** API
2. **Data PR (auth):** เพิ่ม `settings` + `permissions:manage` ใน seed + map `platform_admin`
3. รัน `seed-permissions.js` บน target environment
4. Deploy **frontend F2**
5. Smoke: login เป็น `platform_admin` → เปิด `/permissions` → แก้ label โหนด → save role mapping → refresh token test user

**Rollback:** ซ่อน route + ลบ `MENU_UI` entry (หรือถอด key จาก role mapping) — API ยังอยู่ได้ ไม่กระทบผู้ใช้ทั่วไป

---

## Resolved Questions

| # | คำถาม | การตัดสินใจ |
| :--- | :--- | :--- |
| OQ-1 | ชื่อเมนูกลุ่ม | **`settings`** |
| OQ-2 | Route path | **`/permissions`** |
| OQ-3 | Role list ใน Select | **hardcode** `platform_admin`, `branch_admin`, `staff` |
| OQ-4 | Invalidate `getMyMenus()` หลัง save menu registry | **ไม่** — admin tooling; ผู้เรียก refresh เอง |
| OQ-5 | Bruno collection | **บังคับ** — เพิ่ม `backend/_bruno/auth/admin/` ครบ 7 endpoints สำหรับ SIT |

---

## Approval

- [x] เบียร์อนุมัติ Spec นี้ (2026-06-10)
- [x] Open Questions ยืนยัน — OQ-1–4 ตาม default; OQ-5 ต้องมี Bruno collection

**พร้อมเข้า `/plan`**
