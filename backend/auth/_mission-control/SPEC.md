# Spec: Dynamic Permission in DB (Approach B)

> 🗺️ ภาพรวมทุก phase และผลกระทบอนาคต: [ROADMAP](./ROADMAP.md)

## Assumptions I'm Making

1. ระบบทั้งหมดใช้ฐานข้อมูล MongoDB ร่วมกันใน local development (`zero-platform-mongodb`).
2. Gateway มีหน้าที่เพียง Verify JWT และส่งต่อ (Forward) ข้อมูลไปยัง Upstream Service ผ่าน HTTP headers โดยจะแกะเคลม `permissions` ใน JWT แล้วแปลงเป็น header `x-user-permissions` ส่งต่อไปให้ `staff` service **แบบไม่ expand wildcard** (ส่งต่อค่าตามเคลมตรง ๆ — ผู้บริโภคปลายทางเป็นคน match ตาม "Permission Matching Contract")
3. หน้าบ้าน (Frontend Backoffice) นำฟิลด์ `permissions` จาก Response Body ตอน Login ไปบันทึกใน State/Context ได้เลย ส่วนโครงเมนูสำหรับ render UI ดึงจาก Endpoint `GET /auth/me/menus` (ตอบเป็น flat list พร้อม `parent_key` — frontend เป็นผู้ประกอบ tree เอง รวมถึง icon/route ที่เป็นเรื่องของ frontend ล้วน ๆ)
4. หาก `(ou_id, role)` คู่ใด ๆ ยังไม่มีการระบุสิทธิ์เฉพาะของตัวเองในคอลเลกชัน `auth_role_permissions` ระบบจะ Fallback ไปใช้เอกสาร Global Default (`ou_id: null`) ของ role นั้น (ดูรายละเอียดใน "Permission Resolution Logic")

---

## Objective

ขยายความสามารถของระบบ `auth` (Authentication Service) ให้รองรับการจัดการสิทธิ์การเข้าถึงเมนูและ API Actions แบบไดนามิกผ่านฐานข้อมูล (Dynamic Permission in DB - Approach B) แทนการใช้ตารางสิทธิ์แบบ Static ใน Memory ของแต่ละ Service

โดยเมื่อผู้ใช้ทำการ Login หรือ Refresh Token ตัว `auth` service จะดึงรายการสิทธิ์ (`menu_keys`) ที่ผูกไว้กับบทบาท (`role`) และองค์กร (`ou_id`) ของผู้ใช้คนนั้นขึ้นมาจาก MongoDB แล้วนำไป:

1. ฝังเข้าไปใน **Access JWT Payload** (ภายใต้เคลม `permissions`) เพื่อให้ Gateway ถอดรหัสและส่งต่อไปยัง Upstream Services
2. แนบไปใน **HTTP Response Body** ของ Endpoint `/auth/login` และ `/auth/refresh` เพื่อให้ Frontend Backoffice นำไปซ่อน/แสดงเมนูและปุ่มต่าง ๆ ได้ทันที

ดีไซน์รอบนี้รองรับโจทย์อนาคต 3 เรื่องตั้งแต่ต้น:

1. **เพิ่ม/ลดเมนูแบบ data-driven** — `auth_menus` เป็น**ผังเมนูกลาง (Central Menu Registry)** แหล่งความจริงหนึ่งเดียวว่าระบบมีเมนู/Action key อะไรบ้าง และ seed script ทำหน้าที่ sync เต็มรูปแบบ (upsert + prune)
2. **โครงเมนูหลายระดับ (สูงสุด 3 ระดับ)** — `auth_menus` เก็บลำดับชั้นผ่าน `parent_key` + `sort_order` + `type` และมี Endpoint **`GET /auth/me/menus`** ให้ Frontend ดึงโครงเมนูเฉพาะที่ผู้ใช้มีสิทธิ์
3. **คุมขนาด JWT เมื่อเมนูโตขึ้น** — รองรับ **wildcard permission** (`domain:*`) ที่เก็บและส่งต่อแบบไม่ expand พร้อม soft-limit ขนาด token

---

## Tech Stack

- **Runtime**: Node.js (version >=24 <25)
- **Framework**: Fastify (v5.1.0)
- **Database**: MongoDB (v8.x / Docker image mongo:8)
- **JWT Standard**: RFC 7519 (Asymmetric RS256 signing using `jose` library)

---

## Commands

- **Dev**: `npm run dev` (จากโฟลเดอร์ `backend/auth`)
- **Test**: `npm test`
- **Lint**: `npm run lint`
- **Lint Fix**: `npm run lint:fix`
- **Seed Data**: `node scripts/seed-permissions.js` (upsert อย่างเดียว)
- **Seed + Prune**: `node scripts/seed-permissions.js --prune` (sync เต็มรูปแบบ — ลบส่วนเกินที่ไม่อยู่ในไฟล์ seed)

---

## Project Structure

```
backend/auth/
  _mission-control/
    SPEC.md                     ← [NEW] เอกสารรายละเอียด Spec นี้
  scripts/
    seed-permissions.js         ← [NEW] สคริปต์ Seed/Sync ข้อมูลสิทธิ์ (idempotent, รองรับ --prune)
  src/
    config/
      mongo-collections.js      ← [MODIFY] เพิ่มชื่อคอลเลกชันใหม่ (auth_menus, auth_role_permissions)
    lib/
      jwt-access.js             ← [MODIFY] เพิ่มพารามิเตอร์ permissions ใน signAccessJwt (lib เป็น pure function — size guard อยู่ที่ service)
      permission-match.js       ← [NEW] ฟังก์ชัน match สิทธิ์ (exact + wildcard) ใช้ร่วมกันใน auth
    modules/
      auth/
        auth.repository.js      ← [MODIFY] เพิ่มฟังก์ชันดึงสิทธิ์และเมนูจาก Database
        auth.service.js         ← [MODIFY] แก้ไขส่วนสร้าง JWT, Response Payload, เพิ่ม getMyMenus
        auth.controller.js      ← [MODIFY] เพิ่ม handler ของ GET /auth/me/menus
        auth.route.js           ← [MODIFY] ลงทะเบียน GET /auth/me/menus (ใช้ requireAccessBearer เดิม)
        auth.validator.js       ← [ไม่แก้] โค้ดเดิมไม่มี response schema (Fastify response schema = serializer ที่ strip field — เพิ่มเฉพาะจุดเสี่ยงพังเงียบ) contract อยู่ที่ openapi.yaml
```

---

## Code Style

### MongoDB Schema

#### 1. คอลเลกชัน `auth_menus` (ผังเมนูกลาง — เก็บโครงเมนู/การกระทำทั้งหมดในระบบ)

```javascript
{
  _id: ObjectId,
  key: "profiles:create",       // identifier ถาวร — type "action" ใช้รูปแบบ 'domain:action'
  label: "สร้างโปรไฟล์พนักงาน",      // ชื่อเมนูหรือสิทธิ์ที่จะแสดงใน UI
  type: "action",               // "menu" = โหนดโครงเมนู (จัดกลุ่ม/พับเก็บ) | "action" = สิทธิ์จริง (leaf เสมอ)
  parent_key: "staff",          // key ของโหนดแม่ (null = root) — ความลึกรวมสูงสุด 3 ระดับ
  sort_order: 20,               // ลำดับการแสดงผลภายในชั้นเดียวกัน (น้อย → มาก)
  ou_id: ObjectId | null,       // ระบุองค์กรหากเป็นเมนูเฉพาะของ OU นั้นๆ (null = เมนูสากล)
  cr_by: "system",              // Audit fields ตาม coding-standard/auth/12-data-management
  cr_date: Date,                //   ชุด cr_* เขียนครั้งเดียวตอนสร้าง ($setOnInsert)
  cr_prog: "scripts/seed-permissions.js",
  upd_by: "system",             //   ชุด upd_* อัปเดตทุกครั้งที่เขียน ($set)
  upd_date: Date,
  upd_prog: "scripts/seed-permissions.js"
}
```

**Index**: unique ที่ `key`, ธรรมดาที่ `parent_key`

ตัวอย่างโครง 3 ระดับ:

```javascript
{ key: "staff",            label: "จัดการพนักงาน",    type: "menu",   parent_key: null,    sort_order: 10 }
{ key: "staff:profiles",   label: "โปรไฟล์",          type: "menu",   parent_key: "staff", sort_order: 10 }
{ key: "profiles:list",    label: "รายชื่อพนักงาน",    type: "action", parent_key: "staff:profiles", sort_order: 10 }
{ key: "profiles:create",  label: "สร้างโปรไฟล์พนักงาน", type: "action", parent_key: "staff:profiles", sort_order: 20 }
```

**กฎของลำดับชั้น (Hierarchy Rules)**:

- ความลึกรวมไม่เกิน **3 ระดับ** (root → ลูก → หลาน) — บังคับโดย seed script
- `type: "action"` ต้องเป็น **leaf เสมอ** (ห้ามมีโหนดอื่นชี้ `parent_key` มาที่ action)
- `parent_key` (ถ้าไม่ null) ต้องชี้ไปยัง key ที่มีอยู่จริงและเป็น `type: "menu"` เท่านั้น และห้ามมี cycle
- **`key` คือ identifier ถาวร — ห้ามฝังโครงสร้างเมนูลงใน key**: การย้ายเมนูไปอยู่ใต้ parent อื่นทำโดยแก้ `parent_key` เท่านั้น ห้าม rename key (เพราะ key ฝังอยู่ใน JWT, `menu_keys`, และโค้ดของ service ปลายทาง — rename = breaking change ทั้งระบบ)
- โหนด `type: "menu"` **ไม่ใช่สิทธิ์** — ห้ามปรากฏใน `menu_keys` การมองเห็นของมันคำนวณจากการมี action ลูกหลานที่ผู้ใช้มีสิทธิ์อย่างน้อย 1 ตัว

> `auth_menus` คือ Registry กลาง: ทุก key ที่ปรากฏใน `auth_role_permissions.menu_keys` **ต้อง match กับ action ที่มีอยู่จริง**ในคอลเลกชันนี้ (บังคับโดย seed script — ดู "Seed Script Behavior")

#### 2. คอลเลกชัน `auth_role_permissions` (จับคู่ Role กับสิทธิ์เมนู)

```javascript
{
  _id: ObjectId,
  ou_id: ObjectId | null,       // ID ขององค์กร — ใช้ null สำหรับเอกสาร Global Default
  role: "branch_admin",         // ชื่อบทบาท (เช่น branch_admin, support, platform_admin, staff)
  menu_keys: [                  // อาเรย์เก็บสิทธิ์ — exact action key หรือ wildcard 'domain:*'
    "profiles:*",               //   wildcard: ทุก action ที่ key ขึ้นต้นด้วย 'profiles:'
    "invoice:read"              //   exact key
  ],
  cr_by: "system",              // Audit fields ตาม coding-standard/auth/12-data-management
  cr_date: Date,                //   ชุด cr_* เขียนครั้งเดียวตอนสร้าง ($setOnInsert)
  cr_prog: "scripts/seed-permissions.js",
  upd_by: "system",             //   ชุด upd_* อัปเดตทุกครั้งที่เขียน ($set)
  upd_date: Date,
  upd_prog: "scripts/seed-permissions.js"
}
```

**Index**: unique compound ที่ `(ou_id, role)` — ป้องกันเอกสารซ้ำต่อคู่ OU/Role

> **Tenant scoping (จงใจ deviate จาก standard 12):** ทั้งสองคอลเลกชัน scope ด้วย `ou_id` อย่างเดียว ไม่มี `branch_id` เพราะสิทธิ์เป็นข้อมูลระดับ OU โดยดีไซน์ — บันทึกไว้เพื่อกัน reviewer ทักเรื่องกฎ query ต้องมี `branch_id`

### Permission Matching Contract (สัญญากลางของทั้งระบบ)

สิทธิ์หนึ่งรายการ (`entry`) ถือว่าครอบคลุม action key (`k`) เมื่อ:

1. **Exact**: `entry === k` เช่น `"profiles:create"` ครอบคลุม `profiles:create`
2. **Wildcard**: `entry` ลงท้ายด้วย `:*` และ `k` ขึ้นต้นด้วย prefix เดียวกัน เช่น `"profiles:*"` ครอบคลุม `profiles:create`, `profiles:list` (wildcard มีรูปแบบเดียวคือ `domain:*` — ไม่รองรับ `*` กลาง string หรือ `*` เดี่ยว)

สัญญานี้ implement เป็นฟังก์ชันกลางใน `lib/permission-match.js` (ฝั่ง auth) และเป็น **contract ที่ Gateway / Upstream Services ต้อง implement ตรงกัน** เมื่อถึงงานของฝั่งนั้น (out of scope รอบนี้ แต่กำหนดสัญญาไว้เลยเพื่อไม่ให้รูปแบบเคลมเปลี่ยนภายหลัง)

**ค่าในเคลม `permissions` และ header `x-user-permissions` เก็บ/ส่งต่อตามที่อยู่ใน `menu_keys` แบบไม่ expand** — นี่คือกลไกคุมขนาด JWT: role ที่มีสิทธิ์ทั้ง domain ใช้ 1 entry (`"profiles:*"`) แทนการ list ทุก action

### Permission Resolution Logic

การดึงสิทธิ์ทำที่ระดับคู่ `(ou_id, role)` เสมอ:

1. Query `{ ou_id: <ou_id ของ user>, role: <role ของ user> }` ใน `auth_role_permissions`
2. ถ้า**ไม่พบเอกสารของคู่นี้** ให้ Fallback ไป Query `{ ou_id: null, role: <role ของ user> }` (Global Default)
3. ถ้าไม่พบทั้งสองระดับ ให้คืน `[]` (Deny by Default)

หมายเหตุสำคัญ:

- Fallback ตัดสิน**ต่อคู่ `(ou_id, role)`** ไม่ใช่ต่อ OU — OU ที่ override สิทธิ์ของ role หนึ่งไว้ จะไม่กระทบ role อื่นใน OU เดียวกัน (role อื่นยังได้ Global Default ตามปกติ)
- กรณีต้องการ "ห้าม role นี้ใน OU นี้โดยสิ้นเชิง" ให้ insert เอกสาร `(ou_id, role)` ที่มี `menu_keys: []` อย่างชัดเจน — ห้ามอาศัยพฤติกรรม Fallback
- ค่าที่ resolve ได้คือ `menu_keys` ดิบ (exact + wildcard ปะปนกันได้) — ไม่ expand ณ จุดนี้
- **กรณี Query ผิดพลาด (DB error)** ให้ปล่อย error ออกไปตามทางปกติ (Login/Refresh ล้มเหลวเป็น 5xx) — **ห้าม**ตีความ error เป็น `[]` เพราะจะได้ token ที่ดู valid แต่ใช้งานอะไรไม่ได้แบบเงียบ ๆ ("หาไม่เจอ" = คำตอบจาก DB, "query พัง" = เราไม่รู้คำตอบ)

### JWT Signing Payload

ในไฟล์ `lib/jwt-access.js` (เรียกผ่าน `auth.service.js`), เราจะแนบเคลม `permissions` เพิ่มเข้าไป:

```javascript
// Payload ของ JWT — permissions เก็บค่าดิบจาก menu_keys (ไม่ expand wildcard)
{
  sub: "user_id_hex_string",
  role: "branch_admin",
  ou_id: "ou_id_hex_string",
  branch_id: "branch_id_hex_string",
  token_gen: 0,
  permissions: [
    "profiles:*",
    "invoice:read"
  ],
  iat: 1718164800,
  exp: 1718165700
}
```

**JWT Size Guard**: ใน `issueAccess` (service) หลังเรียก `signAccessJwt` ให้วัดความยาว token — หากเกิน soft limit (env `ACCESS_JWT_SOFT_LIMIT_BYTES`, default `4096`) ให้ log warning พร้อมจำนวน permissions entries เพื่อให้ ops เห็นแนวโน้มก่อนชนเพดาน header ของ proxy (~8KB) การแก้ที่ถูกคือยุบสิทธิ์เป็น wildcard ฝั่งข้อมูล ไม่ใช่ขยาย limit

### Permission Staleness (Design Decision)

สิทธิ์ใน Access JWT จะ stale ได้สูงสุดเท่าอายุของ access token (`ACCESS_TOKEN_TTL_SECONDS`) — การแก้ไข `auth_role_permissions` จะมีผลเมื่อผู้ใช้ Refresh Token ครั้งถัดไป **ยอมรับ trade-off นี้** เพราะ access token อายุสั้นโดยออกแบบ

กรณี**ลดสิทธิ์เร่งด่วน** (เช่น ถอดสิทธิ์พนักงานทันที) ให้ใช้กลไกที่มีอยู่เดิมคือ `revokeSessionsByUser` (bump `access_token_gen`) เพื่อบังคับให้ token เก่าใช้ไม่ได้ทันที — ไม่ต้องสร้างกลไกใหม่

### Endpoint ใหม่: `GET /auth/me/menus`

ให้ Frontend Backoffice ดึงโครงเมนูที่ผู้ใช้คนปัจจุบันมีสิทธิ์ สำหรับ render เมนูหลายระดับใน UI

- **Auth**: ต้องส่ง `Authorization: Bearer <access JWT>` — ใช้ `requireAccessBearer` (preHandler เดิม pattern เดียวกับ `POST /auth/me/password`) และตรวจ `token_gen` ผ่าน `assertAccessTokenGenMatches` ก่อนตอบ
- **Logic**:
  1. Resolve effective permissions ของผู้ใช้**สดจาก DB** (ใช้ Resolution Logic เดียวกับ Login — ไม่อ่านจากเคลมใน JWT เพื่อให้ได้ข้อมูลล่าสุดเสมอ)
  2. **Expand wildcard** กับ `auth_menus`: คัด action ทั้งหมด (ที่ `ou_id: null` หรือตรงกับของผู้ใช้) ที่ match สิทธิ์ตาม Permission Matching Contract
  3. เติม**โหนดบรรพบุรุษ** (`type: "menu"`) ของทุก action ที่ผ่านการคัด ขึ้นไปจนถึง root เพื่อให้ frontend ประกอบ tree ได้ครบ
  4. ตอบเป็น **flat list** เรียงตาม (ระดับชั้น, `sort_order`) — frontend ประกอบ tree จาก `parent_key` เอง
  5. ตอบเฉพาะโหนดที่เกี่ยวกับสิทธิ์ของผู้ใช้เท่านั้น — ไม่เปิดเผยผังเมนูทั้งระบบให้ผู้ใช้ทั่วไป
- **Response `200`**:

```javascript
{
  menus: [
    { key: 'staff', label: 'จัดการพนักงาน', type: 'menu', parent_key: null, sort_order: 10 },
    { key: 'staff:profiles', label: 'โปรไฟล์', type: 'menu', parent_key: 'staff', sort_order: 10 },
    {
      key: 'profiles:list',
      label: 'รายชื่อพนักงาน',
      type: 'action',
      parent_key: 'staff:profiles',
      sort_order: 10
    },
    {
      key: 'profiles:create',
      label: 'สร้างโปรไฟล์พนักงาน',
      type: 'action',
      parent_key: 'staff:profiles',
      sort_order: 20
    }
  ]
}
```

- **Error**: `401` เมื่อ token หาย/ผิด/`token_gen` ไม่ตรง (รูปแบบ RFC 7807 ตามมาตรฐานเดิมของ service — ใช้ code `TOKEN_REFRESH_REJECTED` ที่ลงทะเบียนใน `codes.yaml` อยู่แล้ว ไม่เพิ่ม code ใหม่)
- **Rate limit**: 60 requests / 1 minute ต่อ IP (ระดับเดียวกับ logout)

### Seed Script Behavior (`scripts/seed-permissions.js`)

สคริปต์ต้องเป็น **idempotent** — รันซ้ำกี่ครั้งก็ได้ผลลัพธ์เหมือนเดิม และเป็นเครื่องมือจัดการข้อมูลสิทธิ์หลักจนกว่าจะมี Admin API:

1. **Validate ก่อนเขียนเสมอ** (fail ทั้งสคริปต์ถ้าผิดแม้ข้อเดียว พร้อมรายงานรายการที่ผิด):
   - `key` ไม่ซ้ำกันในไฟล์ seed
   - `parent_key` ทุกตัวชี้ไปยัง key ที่มีจริง, เป็น `type: "menu"`, ไม่มี cycle, ความลึกรวมไม่เกิน 3 ระดับ
   - `type: "action"` ต้องไม่ถูกใครอ้างเป็น parent
   - ทุก entry ใน `menu_keys`: ถ้าเป็น exact ต้อง match action ที่มีจริง; ถ้าเป็น wildcard (`domain:*`) ต้อง match action อย่างน้อย 1 ตัว (wildcard ที่ match ศูนย์ตัว = น่าจะ typo → fail); ห้ามอ้าง key ที่เป็น `type: "menu"`
2. **Upsert** `auth_menus` ตาม `key` (unique) — audit fields ตาม standard 12: `$setOnInsert` ชุด `cr_*`, `$set` ชุด `upd_*` ทุกครั้ง (`_by` = `"system"`, `_prog` = `"scripts/seed-permissions.js"`)
3. **Upsert** `auth_role_permissions` ตามคู่ `(ou_id, role)` (unique compound) — audit fields แบบเดียวกัน
4. **Prune (เมื่อส่ง `--prune`)**: ลบเอกสาร `auth_menus` ที่ `key` ไม่อยู่ในไฟล์ seed และลบเอกสาร `auth_role_permissions` ที่คู่ `(ou_id, role)` ไม่อยู่ในไฟล์ seed — ทำให้ไฟล์ seed เป็น source of truth เต็มรูปแบบ (default ไม่ prune เพื่อกันลบพลาด; ก่อนลบให้แสดงรายการที่จะถูกลบ)
5. สร้าง index ทั้งหมดหากยังไม่มี (`createIndex` เป็น idempotent อยู่แล้ว)

---

## Testing Strategy

1. **Unit Test (`auth.service.test.js` หรือสร้างไฟล์ทดสอบใหม่)**:
   - ทดสอบจำลองการดึงสิทธิ์จาก Repository โดยส่ง Role และ OU ต่าง ๆ เข้าไป แล้วเช็คว่าได้รับ Permissions ตรงตามที่กำหนด
   - ทดสอบ Fallback: คู่ `(ou_id, role)` ไม่มีเอกสารเฉพาะ → ได้สิทธิ์จากเอกสาร `ou_id: null` ของ role เดียวกัน
   - ทดสอบ OU override บาง role ไม่กระทบ role อื่น: OU มีเอกสารของ `branch_admin` แต่ user เป็น `support` → `support` ยังได้ Global Default
   - ทดสอบกรณีที่หาคู่แมปสิทธิ์ไม่เจอทั้งสองระดับ ว่าระบบคืนค่าเป็นอาเรย์ว่าง (Empty Array)
   - ทดสอบกรณี Repository โยน error → Login/Refresh ล้มเหลว (ไม่ใช่ได้ token ที่มี `permissions: []`)
   - ทดสอบ `lib/permission-match.js`: exact match, wildcard match, ไม่ match ข้าม domain (`profiles:*` ต้องไม่ครอบคลุม `profile:create` หรือ `invoice:read`)
   - ทดสอบ JWT Size Guard: token ที่เกิน soft limit → มี warning log (mock logger)
2. **Integration Test (`auth.integration.test.js`)**:
   - ทดสอบเรียก API `POST /auth/login` และเช็คว่าข้อมูลที่ตอบกลับมีโครงสร้าง `permissions: [...]` ถูกต้อง และ wildcard ในเคลม**ไม่ถูก expand**
   - แกะกล่อง Access Token (JWT) ที่ได้จากการ Login/Refresh มาตรวจสอบว่ามีฟิลด์ `permissions` ฝังอยู่ข้างในจริงและถูกต้อง
   - ทดสอบ `GET /auth/me/menus`:
     - ผู้ใช้ที่มี wildcard (`profiles:*`) → ได้ทุก action ใต้ `profiles:` พร้อมโหนดบรรพบุรุษครบถึง root และเรียงตาม `sort_order`
     - ผู้ใช้ที่มีสิทธิ์บางส่วน → ไม่เห็นโหนด menu ของกิ่งที่ตัวเองไม่มี action เลย
     - ไม่ส่ง token หรือ token ผิด → `401`
3. **Seed Script Test**:
   - รันซ้ำสองครั้งแล้วจำนวนเอกสารเท่าเดิม (idempotent)
   - ใส่ `menu_keys` ที่ไม่ match action ใด (ทั้ง exact ผิดและ wildcard ที่ match ศูนย์ตัว) → fail พร้อมรายงาน key ที่ผิด
   - ใส่โครงที่ลึกเกิน 3 ระดับ / `parent_key` ชี้ action / มี cycle → fail
   - รันด้วย `--prune` หลังลบเมนูออกจากไฟล์ seed → เอกสารส่วนเกินถูกลบ; รันโดยไม่มี `--prune` → ไม่ลบ

---

## Boundaries

- **Always**:
  - เมื่อผู้ใช้ Login ผ่าน ต้องเช็คสิทธิ์ในคอลเลกชัน `auth_role_permissions` เสมอ ตาม Permission Resolution Logic
  - หากหาข้อมูลสิทธิ์ไม่เจอ (ทั้งระดับ OU และ Global) ให้ส่งค่ากลับเป็นอาเรย์ว่าง `[]` เสมอ (Deny by Default)
  - หาก Query สิทธิ์เกิด DB error ให้ Login/Refresh ล้มเหลว — ห้ามออก token ด้วย `permissions: []` แบบเงียบ ๆ
  - เคลม `permissions` เก็บค่าดิบจาก `menu_keys` เสมอ (ไม่ expand wildcard) — การ expand ทำเฉพาะใน `/auth/me/menus`
  - ทุก entry ใน `menu_keys` ต้อง match action ใน `auth_menus` (บังคับที่ seed script)
  - การ match สิทธิ์ทุกจุดในโปรเจกต์ `auth` ต้องเรียกผ่าน `lib/permission-match.js` เท่านั้น (ห้าม implement ซ้ำกระจัดกระจาย)
  - รันการทดสอบและจัดรูปแบบโค้ด (Lint/Prettier) ทุกครั้งก่อนส่งมอบงาน
- **Ask first**:
  - หากต้องการเปลี่ยนโครงสร้างการฝัง Payload ใน JWT นอกเหนือจากฟิลด์ `permissions`
  - หากต้องการเปลี่ยน Permission Matching Contract (รูปแบบ wildcard) — เพราะเป็นสัญญาข้าม service
  - หากพบว่า JWT เกิน soft limit ระหว่างพัฒนา (ต้องตัดสินใจยุบสิทธิ์เป็น wildcard ฝั่งข้อมูล)
- **Never**:
  - ห้าม Hardcode รายชื่อ Permissions ลงไปในตัวแปรคงที่ (Static Variable) ภายในตัวโปรเจกต์ `auth` เป็นอันขาด (ต้องอ่านจาก DB เสมอ)
  - ห้าม rename `key` ใน `auth_menus` เพื่อย้ายตำแหน่งเมนู — ย้ายโครงทำผ่าน `parent_key` เท่านั้น
  - ห้ามปิดข้ามขั้นตอนการทำงานของ JWT Revocation หรือฟีเจอร์ความปลอดภัยที่มีอยู่เดิม

---

## Out of Scope (Phase นี้)

- **Admin CRUD API** สำหรับจัดการ `auth_menus` / `auth_role_permissions` — ช่วงแรกแก้ไขข้อมูลผ่าน seed script (ซึ่ง sync ได้เต็มรูปแบบด้วย `--prune`) หรือ mongosh โดยตรง; API จัดการสิทธิ์ (พร้อมคำถามเรื่องผู้มีสิทธิ์แก้, audit, validation) แยกเป็น Spec ถัดไป
- **การแก้ไข Gateway** ให้แกะเคลม `permissions` → header `x-user-permissions` และ **การแก้ไข `staff` service** ให้เช็คสิทธิ์จาก header — เป็นงานคนละ service (ดู Assumption ข้อ 2) แต่ต้อง implement ตาม Permission Matching Contract ที่กำหนดใน Spec นี้
- **การ bump `token_gen` อัตโนมัติเมื่อแก้สิทธิ์** — ใช้ `revokeSessionsByUser` ที่มีอยู่แล้วแบบ manual สำหรับเคสเร่งด่วน
- **icon / route path ของเมนู** — เป็นข้อมูลฝั่ง frontend ล้วน ๆ ไม่เก็บใน `auth_menus` (frontend map จาก `key` เอง)

---

## Success Criteria

1. รันสคริปต์ `node scripts/seed-permissions.js` แล้วพบข้อมูลในคอลเลกชัน `auth_menus` (พร้อมโครง `parent_key`/`sort_order`/`type`) และ `auth_role_permissions` บน MongoDB ครบถ้วน พร้อม unique index ที่ `auth_menus.key` และ `auth_role_permissions(ou_id, role)` — รันซ้ำได้โดยไม่เกิดข้อมูลซ้ำ และ `--prune` ลบส่วนเกินได้ถูกต้อง
2. Seed script ปฏิเสธข้อมูลผิดทุกแบบ: key ซ้ำ, โครงลึกเกิน 3 ระดับ, parent ชี้ action, cycle, `menu_keys` ที่ไม่ match action ใด
3. เมื่อเรียก API Login หรือ API Refresh สำเร็จ จะมีออปเจกต์ `permissions` (อาเรย์ของสตริง — ค่าดิบรวม wildcard) ส่งกลับมาใน JSON Body (อัปเดตเอกสาร OpenAPI ให้ตรงกัน — ไม่เพิ่ม response schema ใน validator ดูหมายเหตุใน Project Structure)
4. Access Token ที่สร้างขึ้นมาเป็น JWT ที่มีฟิลด์ `permissions` ถูกต้อง ถอดรหัสออกมาตรวจดูได้ และมี warning log เมื่อขนาดเกิน `ACCESS_JWT_SOFT_LIMIT_BYTES`
5. เรียก `GET /auth/me/menus` ด้วย access token ที่ valid แล้วได้โครงเมนูเฉพาะที่ผู้ใช้มีสิทธิ์ (action ที่ match + บรรพบุรุษครบถึง root, เรียงตาม `sort_order`) — และได้ `401` เมื่อ token หาย/ผิด
6. การทดสอบ (Unit & Integration Tests) ใน `auth` service รันผ่าน 100%

---

## Resolved Questions

1. **Default Global Tenant Mapping** — ตัดสินใจใช้ `ou_id: null` เป็น Global Default ตามข้อเสนอของมีนา โดย Fallback ตัดสินที่ระดับคู่ `(ou_id, role)`: ค้นด้วย `(ou_id ของ user, role)` ก่อน ไม่พบจึง Fallback ไป `(null, role)` — รายละเอียดและเหตุผลอยู่ในหัวข้อ "Permission Resolution Logic"
2. **เมนูหลายระดับ** — ใช้ adjacency list (`parent_key` + `sort_order` + `type`) ใน `auth_menus` จำกัด 3 ระดับ; โครงสร้างอยู่ในข้อมูล (`parent_key`) ไม่อยู่ใน identifier (`key`) เพื่อให้ย้ายเมนูได้โดยไม่ break สิทธิ์ — แทนที่ฟิลด์ `group` เดิม (โหนด root `type: "menu"` ทำหน้าที่จัดกลุ่มแทน)
3. **ขนาด JWT เมื่อเมนูโต** — ใช้ wildcard `domain:*` ใน `menu_keys` เก็บและส่งต่อแบบไม่ expand ตาม Permission Matching Contract + soft-limit warning ที่ `issueAccess` หลังเรียก `signAccessJwt`; การ expand เกิดที่เดียวคือ `/auth/me/menus`
4. **ใครเป็นเจ้าของโครงเมนู** — `auth_menus` เป็นเจ้าของ "โครง + label + สิทธิ์" ส่วน frontend เป็นเจ้าของ "icon + route + การ render" โดยประกอบ tree จาก flat list ของ `/auth/me/menus`
5. **Wildcard ที่ match ศูนย์ action** — ตัดสินใจให้ seed script **fail ทันที** (ไม่ใช่ warn) เพราะเคสที่พบจริงส่วนใหญ่คือ typo (เช่น `invoce:*`) ซึ่งถ้าปล่อยผ่านจะกลายเป็น silent permission loss ที่ debug แพง — error ที่โผล่เร็วและเสียงดังถูกกว่า error ที่เงียบและโผล่ช้าเสมอ ส่วน workflow "เตรียมสิทธิ์ล่วงหน้าก่อนมี action จริง" ยังไม่มี use case ตอนนี้ หากต้องการในอนาคตให้เพิ่ม flag `--allow-empty-wildcard` (เปลี่ยน fail เป็น warn เฉพาะการรันที่ประกาศเจตนาชัด) แทนการลดความเข้มของ default
