# Spec: Permission Admin API (Dynamic Permission — Phase A)

> ต่อยอดจาก [`SPEC.md`](./SPEC.md) (Dynamic Permission in DB — merge แล้ว) — phase นี้เพิ่ม API จัดการ `auth_menus` / `auth_role_permissions` แทนการแก้ผ่าน seed script/mongosh
> **Phase สุดท้ายของชุด** — ควรทำหลัง G/S/F เพื่อให้หน้าจอจัดการสิทธิ์ใน Backoffice ใช้ guard จาก permission ของตัวเองได้
> ⚠️ Spec นี้มี Open Questions ที่ต้องเคาะมากกว่า phase อื่น — รีวิวให้จบก่อน `/plan`

## Assumptions I'm Making

1. ผู้ใช้งาน API คือแอดมินผ่าน Backoffice (เรียกผ่าน gateway ด้วย access token ปกติ) — ไม่ใช่ service-to-service จึง**ไม่ใช้** pattern `/internal/*` + `AUTH_INTERNAL_SERVICE_SECRET`
2. สิทธิ์ในการจัดการสิทธิ์เป็น permission key ใหม่: `permissions:manage` (seed ให้ `platform_admin` เท่านั้นเป็นค่าตั้งต้น) — กันตัวเองด้วยระบบตัวเอง
3. Validation rules ชุดเดียวกับ seed script ทุกข้อ (7 กฎ) — **ต้อง refactor `validateSeedData` จาก `scripts/seed-permissions.js` ไปไว้ที่ `src/lib/permission-validation.js`** แล้วให้ทั้ง script และ API ใช้ร่วมกัน (ห้าม implement ซ้ำ)
4. การแก้สิทธิ์มีผลเมื่อผู้ใช้ refresh token (ตาม Staleness decision เดิม) — API มี option ให้ bump `token_gen` ของผู้ใช้ที่ได้รับผลกระทบสำหรับเคสเร่งด่วน

---

## Objective

ให้แอดมิน (ผู้ถือ `permissions:manage`) จัดการผังเมนูและ role mappings ผ่าน API ได้อย่างปลอดภัย ตรวจสอบย้อนหลังได้ และคงความถูกต้องของ registry เท่าระดับ seed script:

| Method   | Path                                        | หน้าที่                                                                                            |
| -------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `GET`    | `/auth/admin/menus`                         | ผังเมนูทั้งระบบ (flat list + hierarchy fields) — ต่างจาก `/auth/me/menus` ที่กรองตามสิทธิ์ผู้เรียก |
| `POST`   | `/auth/admin/menus`                         | เพิ่มโหนดเมนู/action (validate ครบ 7 กฎเทียบกับสถานะปัจจุบัน)                                      |
| `PATCH`  | `/auth/admin/menus/:key`                    | แก้ `label` / `parent_key` / `sort_order` — **ห้ามแก้ `key` และ `type`**                           |
| `DELETE` | `/auth/admin/menus/:key`                    | ลบโหนด — ปฏิเสธถ้ายังมีลูก หรือยังถูกอ้างใน `menu_keys` ใด ๆ                                       |
| `GET`    | `/auth/admin/role-permissions`              | mappings ทั้งหมด (filter `?ou_id=` / `?role=`)                                                     |
| `PUT`    | `/auth/admin/role-permissions/:ou_id/:role` | upsert `menu_keys` ของคู่ (ใช้ `null` ใน path เป็น literal สำหรับ Global)                          |
| `DELETE` | `/auth/admin/role-permissions/:ou_id/:role` | ลบ override ของ OU (คู่กลับไปใช้ Global fallback)                                                  |

ทุกการเขียนบันทึก audit event (`auth.permissions_changed`) ตามกลไก `insertAudit` เดิม

---

## Tech Stack

- Node.js (>=24 <25), Fastify v5, MongoDB, `jose` (ตามที่ติดตั้งอยู่) — ไม่เพิ่ม dependency

## Commands

- **Dev**: `npm run dev` / **Test**: `npm test` / **Lint**: `npm run lint` / **CI**: `npm run ci`
- **OpenAPI**: `npm run spec:lint && npm run spec:codes`

## Project Structure (จุดที่แตะ)

```
backend/auth/
  scripts/seed-permissions.js     ← [MODIFY] ย้าย validation ออกไป lib (พฤติกรรม script คงเดิม)
  src/
    lib/permission-validation.js  ← [NEW] กฎ 7 ข้อ (ย้ายจาก seed script) ใช้ร่วม script + API
    modules/
      auth/auth.route.js          ← [MODIFY] requireAccessBearer ใช้ซ้ำกับ scope /auth/admin
      admin/                      ← [NEW] โมดูลใหม่ตามแบบแผน modular (route/controller/service/repository/validator)
        admin.route.js
        admin.controller.js
        admin.service.js
        admin.repository.js
        admin.validator.js
  openapi.yaml                    ← [MODIFY] paths /auth/admin/* + schemas
```

## Code Style

### Authorization ของตัว API (สองชั้น)

```javascript
// ชั้น 1: requireAccessBearer (JWT + token_gen เดิม)
// ชั้น 2: เช็คเคลม permissions ของผู้เรียกต้องครอบ 'permissions:manage'
//         (ใช้ lib/permission-match.js — resolve สดจาก DB เหมือน getMyMenus เพื่อกัน claim ค้าง)
```

### Validation = กฎเดียวกับ seed เสมอ

ทุก mutation ตรวจกับ**สถานะรวมหลังแก้** (เอกสารปัจจุบันใน DB + การแก้ที่ขอ) ด้วย `permission-validation.js` — ผิดข้อใด → `400` RFC 7807 พร้อมรายการ error ทั้งหมดใน `detail`

### Concurrency

PATCH/PUT/DELETE ใช้ **optimistic locking ด้วย `upd_date`** ตาม standard auth/12 (client ส่ง `If-Match` เป็น `upd_date` เดิม; ไม่ตรง → `412`)

### Audit + การเขียน

- ทุก mutation: `$set` ชุด `upd_*` (actor = user id ผู้เรียก, `_prog` = route), `$setOnInsert` ชุด `cr_*`
- audit event: `auth.permissions_changed` พร้อม `detail_safe` ระบุ collection, key/คู่ที่แก้, สรุป diff (เฉพาะ key ไม่ใส่ข้อมูลอ่อนไหว)

### Urgent revoke option

`PUT /auth/admin/role-permissions/...` รับ `revoke_sessions: boolean` (default `false`) — เมื่อ `true`: หา user ทุกคนใน scope (ou_id+role) แล้วเรียก `bumpAccessTokenGenAndRevokeSessions` รายคน + sync Redis ตามกลไก `revokeSessionsByUser` เดิม (ดู Open Questions ข้อ 3 เรื่องจำนวนผู้ใช้มาก)

## Testing Strategy

1. **Unit**: `permission-validation.js` (ย้าย test เดิมของ seed มาด้วย — พฤติกรรมต้องไม่เปลี่ยน), authorization guard (`permissions:manage` มี/ไม่มี/wildcard `permissions:*`)
2. **Integration (`admin.integration.test.js`)**: CRUD ครบทุก endpoint; validate fail → 400 พร้อมรายการ error; DELETE โหนดที่มีลูก/ถูกอ้าง → 409; If-Match ไม่ตรง → 412; ไม่มี `permissions:manage` → 403; audit ถูกบันทึกทุก mutation; `revoke_sessions: true` → `token_gen` ของ user ใน scope ขยับ
3. **Regression**: seed script ทำงานเหมือนเดิมหลัง refactor (test เดิม 17 ข้อต้องผ่านโดยไม่แก้)

## Boundaries

- **Always**:
  - ทุก mutation ผ่าน `permission-validation.js` + audit + optimistic locking
  - หลังแก้สำเร็จ registry ต้อง valid ตามกฎ 7 ข้อเสมอ (ไม่มีสถานะกลางที่ผิด)
  - seed script ยังใช้ได้เสมอ (เป็นเครื่องมือ disaster recovery / bootstrap)
- **Ask first**:
  - เปลี่ยนกฎ validation ใด ๆ (กระทบ seed + contract ทั้งระบบ)
  - เพิ่ม endpoint rename key (ตอนนี้ห้ามโดยดีไซน์ — ถ้าจำเป็นต้องออกแบบ migration ข้าม service)
- **Never**:
  - ห้ามแก้ `key`/`type` ของโหนดผ่าน API
  - ห้ามให้ role ที่ไม่มี `permissions:manage` เข้าถึง (รวมถึงห้ามตั้ง default seed ให้ role อื่นนอกจาก `platform_admin`)
  - ห้ามลบ Global Default (`ou_id: null`) ของ role ที่ยังมีผู้ใช้ active โดยไม่มี confirmation flag

## Success Criteria

1. แอดมินที่มี `permissions:manage` ทำ CRUD ได้ครบตามตาราง; ผู้ไม่มี → 403 ทุก endpoint
2. ทุกความพยายามทำให้ registry ผิดกฎ (ลึกเกิน 3, อ้าง key ผี, wildcard ศูนย์ match, ลบโหนดที่ถูกอ้าง) → ถูกปฏิเสธพร้อมรายการ error ครบ
3. `revoke_sessions: true` ทำให้ผู้ใช้ใน scope ใช้ token เก่าไม่ได้ทันที (ตรวจผ่าน `token_gen`)
4. Seed script + test เดิมผ่านโดยไม่แก้พฤติกรรม (validation อยู่ lib เดียว)
5. `npm run ci` + `spec:lint`/`spec:codes` ผ่าน; ทุก mutation มี audit event

## Open Questions (ต้องเคาะก่อนเริ่ม)

1. **Path + การผ่าน gateway**: `/auth/admin/*` ต้องเพิ่ม route ใน gateway `routes.json` ไหม หรือ auth ถูก expose ตรง? (ขึ้นกับ topology ปัจจุบันของ `/auth/*` ใน gateway)
2. **จัดการเมนูระดับ OU-specific ใน phase นี้เลยไหม** หรือจำกัด API ที่ Global (`ou_id: null`) ก่อน? _ข้อเสนอ: จำกัด Global ก่อน — use case OU-specific ยังไม่เกิดจริง_
3. **`revoke_sessions` กับ OU ใหญ่**: ถ้า scope มีผู้ใช้หลักพัน การ bump รายคนใน transaction เดียวอาจช้า — ยอมรับ synchronous ไปก่อน หรือต้องเป็น batch/async? _ข้อเสนอ: synchronous + จำกัด timeout, วัดจริงก่อน optimize_
4. **หน้าจอจัดการสิทธิ์ใน Backoffice** เป็น phase F2 แยกต่างหาก (spec ใหม่ฝั่ง frontend) — ยืนยันว่าไม่รวมใน phase นี้?
