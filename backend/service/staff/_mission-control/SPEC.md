# Spec: Permission-based Authorization from Header (Dynamic Permission — Phase S)

> ต่อจาก phase G ([`backend/gateway/_mission-control/SPEC.md`](../../../gateway/_mission-control/SPEC.md)) — phase นี้ทำให้ staff service เช็คสิทธิ์ราย action จาก `x-user-permissions` แทนตาราง role แบบ static
> **Dependency แข็ง: ต้อง deploy หลัง gateway phase G เท่านั้น** (ไม่งั้น header ไม่มีวันมาถึง)

## Assumptions I'm Making

1. Gateway ส่ง `x-user-permissions` (comma-separated, ค่าดิบรวม wildcard `domain:*`, อาจเป็น string ว่าง) มากับทุก request ที่ผ่าน protected route และ spoofing ถูกปิดที่ gateway แล้ว
2. Action keys ที่ staff service ใช้ตรงกับ registry ใน auth: `profiles:list`, `profiles:lookup`, `profiles:read`, `profiles:create`, `profiles:edit` และ **`roles:assign`** (ตัวหลังต้อง seed เพิ่มฝั่ง auth ก่อนเริ่ม phase นี้ — ดู `scripts/seed-data/permissions.js`)
3. ช่วงเปลี่ยนผ่านต้องรองรับ token เก่าที่ยังไม่มีเคลม (header ว่าง) — ใช้กลยุทธ์ **dual-check** ควบคุมด้วย env
4. กฎ "lookup/read ตัวเองได้เสมอ" (self-access) เป็น business rule แยกจาก permission — คงพฤติกรรมเดิมไว้ ไม่ผูกกับ permission key

---

## Objective

แทนที่การเช็คบทบาทแบบ static (`isAdminRole` / `assertAdminRole` / `ADMIN_ROLES` ใน `profiles.service.js`) ด้วยการเช็ค permission ราย action จาก header `x-user-permissions` ตาม **Permission Matching Contract** (exact หรือ `domain:*`) โดยมีโหมดเปลี่ยนผ่านแบบ dual-check เพื่อไม่ break token เก่าและถอยกลับได้โดยไม่ต้อง deploy ใหม่

| Endpoint (profiles)        | Action key ที่ต้องมี | หมายเหตุ                                           |
| -------------------------- | -------------------- | -------------------------------------------------- |
| `GET /profiles` (list)     | `profiles:list`      |                                                    |
| `GET /profiles/lookup`     | `profiles:lookup`    | lookup ตัวเอง: ผ่านเสมอ (พฤติกรรมเดิม)             |
| `GET /profiles/:id`        | `profiles:read`      | อ่านของตัวเอง: ผ่านเสมอ (พฤติกรรมเดิม)             |
| `POST /profiles`           | `profiles:create`    |                                                    |
| `PATCH /profiles/:id`      | `profiles:edit`      |                                                    |
| `PATCH /profiles/:id/role` | `roles:assign`       | domain แยกจาก `profiles` — กัน wildcard escalation |

---

## Tech Stack

- **Runtime**: Node.js (>=24 <25), Fastify (ตามที่ติดตั้งอยู่) — ไม่เพิ่ม dependency
- **Env ใหม่**: `PERMISSION_MODE` = `dual` (default) | `enforce`

## Commands

- **Dev**: `npm run dev` (จาก `backend/service/staff`)
- **Test**: `npm test`
- **Coverage gate**: `npm run ci:with-coverage`
- **Lint**: `npm run lint`

## Project Structure (จุดที่แตะ)

```
backend/service/staff/
  src/
    lib/
      permission-match.js           ← [NEW] implement ตาม contract ของ auth เป๊ะ ๆ (exact + domain:*)
    plugins/
      user-context.js               ← [MODIFY] parse x-user-permissions → userContext.permissions (string[])
      duplicate-header.js           ← [MODIFY] เพิ่ม 'x-user-permissions' ใน CRITICAL_HEADERS
    modules/profiles/
      profiles.service.js           ← [MODIFY] แทน assertAdminRole/isAdminRole ด้วย assertPermission(userContext, actionKey)
    config/ (env)                   ← [MODIFY] เพิ่ม PERMISSION_MODE
```

## Code Style

### Parse header (ใน `user-context.js`)

```javascript
// header ว่าง = ไม่มีสิทธิ์ (deny by default) — ไม่ใช่ error
const rawPermissions = readHeader(request, "x-user-permissions");
const permissions = rawPermissions === "" ? [] : rawPermissions.split(",");
request.userContext = { ...เดิม, permissions };
```

**ไม่บังคับว่า header ต้องมี** (ต่างจาก `x-user-id`/`x-user-role` ที่ขาดแล้ว 403) — เพราะช่วง rollout request จาก gateway เวอร์ชันเก่าจะไม่มี header นี้ การบังคับจะ break ลำดับ deploy

### Permission guard (แทนที่ assertAdminRole)

```javascript
/** Dual-check: permission ผ่าน หรือ (โหมด dual) role เดิมผ่าน — enforce = permission เท่านั้น */
export function assertPermission(
  userContext,
  actionKey,
  { legacyRoleCheck } = {},
) {
  if (anyPermissionMatches(userContext.permissions, actionKey)) return;
  if (PERMISSION_MODE === "dual" && legacyRoleCheck?.(userContext)) return;
  throw new HttpError(
    403,
    CODES.PERMISSION_DENIED,
    `Requires permission: ${actionKey}`,
  );
}

// การใช้: แทน assertAdminRole(userContext) เดิม
assertPermission(userContext, "profiles:create", {
  legacyRoleCheck: (ctx) => isAdminRole(ctx.role),
});
```

- `lib/permission-match.js` ต้อง**เหมือน contract ฝั่ง auth ทุกประการ** (exact equality; `domain:*` ครอบ `domain:<action>`; ไม่รองรับ `*` รูปแบบอื่น) — copy test cases จาก `backend/auth/test/permission-match.test.js` มาเป็น contract test
- เพิ่ม error code `PERMISSION_DENIED` ใน `lib/error-codes.js` (HTTP 403, envelope format เดิมของ service)
- `isAdminRole`/`ADMIN_ROLES` **ยังไม่ลบ** ใน phase นี้ — ใช้เป็น `legacyRoleCheck` จนกว่าจะสลับ `enforce` แล้วค่อยลบใน phase cleanup
- **หลักการตั้ง key**: action ที่ยกระดับสิทธิ์ได้ (เช่นเปลี่ยน role) **ห้ามอยู่ใน domain ที่นิยมแจกเป็น wildcard** — จึงใช้ `roles:assign` ไม่ใช่ `profiles:set_role` (เพราะ `branch_admin` ถือ `profiles:*` จะครอบโดยไม่ตั้งใจ)
- **Fallback-hit logging**: ทุกครั้งที่ request ผ่านด้วย `legacyRoleCheck` (permission ไม่มีแต่ role เดิมผ่าน) ต้อง `log.warn({ action_key, role }, 'permission dual-check fallback used')` — เป็นทั้งสัญญาณว่า seed ตกหล่น key ไหน และเกณฑ์การถอด dual

## Testing Strategy

Node test runner ตามโครงเดิม (`src/**/tests/unit-test`, `src/**/tests/integration-test`):

1. **Contract test (`permission-match`)**: ชุดเดียวกับ auth ทุกเคส — exact, wildcard, ไม่ข้าม domain, ไม่รับ `*` รูปแบบอื่น
2. **Unit (`user-context`)**: header ปกติ → array; header ว่าง/ไม่มี → `[]`; header ซ้ำ → reject โดย duplicate-header guard
3. **Integration ต่อ endpoint × ต่อโหมด**:
   - `enforce`: มี `profiles:create` → 201; ไม่มี → 403 `PERMISSION_DENIED`; wildcard `profiles:*` → ผ่านทุก action
   - `dual`: ไม่มี permission แต่ role เดิมผ่าน (`branch_admin`) → ผ่าน; ทั้งคู่ไม่ผ่าน → 403
   - self lookup/read โดยไม่มี permission → ผ่าน (พฤติกรรมเดิมคงอยู่)
   - dual fallback ถูกใช้ → มี warn log พร้อม `action_key` (mock logger)
4. Coverage ไม่ต่ำกว่า gate เดิมของ service

## Boundaries

- **Always**:
  - การ match สิทธิ์ทุกจุดเรียกผ่าน `lib/permission-match.js` เท่านั้น (จุดเดียว — เหมือนกฎฝั่ง auth)
  - default `PERMISSION_MODE=dual` — เปิด `enforce` ผ่าน env หลังยืนยันบน production แล้วว่า permission ทำงานถูก
  - คง self-access rules เดิมทุกข้อ
- **Ask first**:
  - ก่อนสลับ production เป็น `enforce` (ต้องยืนยันว่า token เก่าหมดอายุครบ + ไม่มี 403 ผิดปกติใน log)
  - หากต้องเพิ่ม action key ใหม่ที่ยังไม่มีใน registry ฝั่ง auth (ต้อง seed ฝั่ง auth ก่อน)
- **Never**:
  - ห้าม implement matching เองนอก `lib/permission-match.js` หรือดัดแปลง contract ฝ่ายเดียว
  - ห้ามลบ role-check เดิมใน phase นี้ (ลบใน phase cleanup หลัง `enforce` นิ่งแล้ว)
  - ห้ามเชื่อ `x-user-permissions` ใน route ที่ไม่ได้ผ่าน gateway-secret guard

## Success Criteria

1. โหมด `enforce`: ทุก endpoint ในตารางถูกคุมด้วย action key ที่กำหนด — มีสิทธิ์ผ่าน / ไม่มี → 403 `PERMISSION_DENIED` / wildcard ครอบทั้ง domain
2. โหมด `dual` (default): token เก่าที่ไม่มีเคลม + role เดิมผ่าน → ใช้งานได้ปกติ (ไม่มี regression ช่วง rollout)
3. Contract test ของ `permission-match` ตรงกับฝั่ง auth ทุกเคส
4. Self lookup/read ทำงานเหมือนเดิมทุกกรณี
5. `npm run ci:with-coverage` ผ่าน; `openapi.yaml` ระบุ 403 `PERMISSION_DENIED` ที่ endpoint ที่เกี่ยวข้อง

## Resolved Questions

1. **`PATCH /profiles/:id/role`** — ใช้ key `roles:assign` ใน domain แยก (ไม่ใช่ `profiles:set_role`) seed ให้เฉพาะ `platform_admin`: ถ้าอยู่ใต้ `profiles` wildcard `profiles:*` ของ `branch_admin` จะครอบถึง = privilege escalation — ตั้งเป็นหลักการ "escalating action ห้ามอยู่ใน wildcard domain"
2. **แผนถอด dual** — ใช้สัญญาณจริงจาก fallback-hit log: hit = 0 ติดต่อกัน 7 วันบน production → สลับ `PERMISSION_MODE=enforce` → release ถัดไปลบโค้ด dual + `isAdminRole`/`ADMIN_ROLES`
