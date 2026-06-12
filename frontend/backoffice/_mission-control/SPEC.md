# Spec: Permission-driven Menu & Route Guards (Dynamic Permission — Phase F)

> ใช้ความสามารถจาก auth phase ที่ merge แล้ว ([`backend/auth/_mission-control/SPEC.md`](../../../backend/auth/_mission-control/SPEC.md)): ฟิลด์ `permissions` ใน login/refresh response และ `GET /auth/me/menus`
> **ทำขนานกับ phase G/S ได้** — ขึ้นกับ auth service อย่างเดียว ไม่ขึ้นกับ gateway/staff

## Assumptions I'm Making

1. `POST /auth/login` และ `POST /auth/refresh` ตอบ `permissions: string[]` (ค่าดิบรวม wildcard `domain:*`) ใน body แล้ว — frontend ใช้จาก body ไม่ต้อง decode เพิ่ม
2. `GET /auth/me/menus` ตอบ flat list `{ key, label, type, parent_key, sort_order }` เฉพาะโหนดที่ผู้ใช้มีสิทธิ์ พร้อมบรรพบุรุษครบถึง root
3. **icon และ route path เป็นของ frontend** — map จาก `key` ในโค้ด (ตามที่เคาะใน auth SPEC: Resolved Question 4)
4. ผังเมนูกลาง (`auth_menus`) จะถูกขยายให้ครอบเมนูปัจจุบันทั้งหมดของ Backoffice — เป็น **data dependency ฝั่ง auth** (แก้ `scripts/seed-data/permissions.js` + รัน seed ก่อน deploy frontend) ตามร่าง catalog ใน Resolved Questions ข้อ 1
5. หน้า 403/404/Login/My Profile ไม่ผูกกับ permission (ทุกคนที่ login แล้วเข้าได้)

---

## Objective

เปลี่ยนการคุมเมนูและ route จาก role แบบ hardcode (`allowedRoles` ใน `App.tsx`, `menuItems` + `isStaffAdmin` ใน `AdminLayout.tsx`) เป็น permission-driven:

1. **Sidebar** render จาก `GET /auth/me/menus` — ประกอบ tree จาก `parent_key`, เรียง `sort_order`, map `key → { icon, route }` ในโค้ด
2. **Route guard** เช็คจาก `permissions` ใน AuthContext ด้วย matching contract เดียวกับ backend (`PermissionGuard` แทน `RoleGuard`)
3. ปุ่ม/การกระทำราย action (เช่น ปุ่ม Create Staff) ซ่อน-แสดงด้วย hook `usePermission('profiles:create')`

**User story:** แอดมินถอด key `profiles:create` ออกจาก role หนึ่งใน DB → หลังผู้ใช้ refresh token เมนูและปุ่มที่เกี่ยวข้องหายเองโดยไม่ต้อง deploy frontend

---

## Tech Stack

- React + TypeScript + Vite + antd v6 + react-router-dom + axios (ตามที่ติดตั้งอยู่) — ไม่เพิ่ม dependency

## Commands

- **Dev**: `npm run dev` (จาก `frontend/backoffice`)
- **Build + typecheck**: `npm run build`
- **Test**: `npm test` (vitest)
- **Lint**: `npm run lint`

## Project Structure (จุดที่แตะ)

```
frontend/backoffice/src/
  lib/
    permissionMatch.ts          ← [NEW] TS port ของ contract (exact + domain:*) + contract tests
    authApiClient.ts            ← [MODIFY] เพิ่ม getMyMenus(); TokenResponse ใช้ type ที่มี permissions
  types/auth.ts                 ← [MODIFY] TokenResponse + permissions: string[]; เพิ่ม MenuNode
  contexts/AuthContext.tsx      ← [MODIFY] เก็บ permissions จาก response body (login/refresh) + expose ผ่าน context
  hooks/usePermission.ts        ← [NEW] usePermission(actionKey): boolean
  components/PermissionGuard.tsx← [NEW] route guard จาก permission (แทน RoleGuard)
  layouts/AdminLayout.tsx       ← [MODIFY] menuItems จาก GET /auth/me/menus + ICON_MAP/ROUTE_MAP
  App.tsx                       ← [MODIFY] เปลี่ยน RoleGuard → PermissionGuard ที่ /staff
```

## Code Style

### Contract (ต้องตรงกับ `backend/auth/src/lib/permission-match.js` ทุกเคส)

```typescript
// lib/permissionMatch.ts
export function anyPermissionMatches(
  entries: string[],
  actionKey: string,
): boolean;
// 'profiles:*' ครอบ 'profiles:create' | ไม่ครอบ 'profile:create', 'invoice:read'
// exact เท่านั้นนอกเหนือจาก wildcard รูปแบบ 'domain:*'
```

### Menu mapping (icon/route อยู่ในโค้ด — key มาจาก API)

```typescript
// AdminLayout.tsx — โหนดที่ไม่มีใน map = ไม่ render (กัน key ใหม่จาก DB พังเมนู)
const MENU_UI: Record<string, { icon: ReactNode; route?: string }> = {
  dashboard: { icon: <DashboardOutlined />, route: '/' },
  'staff': { icon: <TeamOutlined /> },                 // โหนด menu = กลุ่ม ไม่มี route
  'profiles:list': { icon: <TeamOutlined />, route: '/staff' },
  // ...
}
```

### Guard + hook

```typescript
// ใช้ใน router แทน RoleGuard
<PermissionGuard required="profiles:list"><StaffManagement /></PermissionGuard>

// ใช้ซ่อนปุ่มราย action
const canCreate = usePermission('profiles:create')
```

- `permissions` มาจาก **response body** ของ login/refresh (single source — ไม่ decode JWT เพิ่ม เพราะ `DecodedUser` มีอยู่แล้วสำหรับ identity)
- เรียก `getMyMenus()` หลัง login/restore session สำเร็จ แล้ว cache ใน state ของ layout — refresh เมนูเมื่อ token ถูก refresh (permissions อาจเปลี่ยน)
- **เมนูคือ UX, การ enforce จริงอยู่ backend** — guard ฝั่ง frontend เป็นแค่การนำทาง ไม่ใช่ความปลอดภัย

### พฤติกรรมเมื่อ `getMyMenus` ล้มเหลว (network/5xx)

แสดงเมนูขั้นต่ำที่ไม่ผูก permission (Dashboard, My Profile) + ข้อความ "เมนูบางส่วนไม่พร้อมใช้งาน" — **ห้าม fallback ไปเมนูเต็มแบบ hardcode** (จะกลายเป็นช่องให้เห็นเมนูที่ไม่มีสิทธิ์)

## Testing Strategy

Vitest (โครงเดิม `src/**/*.test.ts`):

1. **Contract test (`permissionMatch.test.ts`)**: ชุดเดียวกับ `backend/auth/test/permission-match.test.js` ทุกเคส
2. **Unit**: `usePermission` (มี/ไม่มี/wildcard); ประกอบ tree จาก flat list + เรียง `sort_order`; โหนดที่ไม่อยู่ใน `MENU_UI` ถูกข้าม
3. **Component**: `PermissionGuard` — มีสิทธิ์ render ลูก / ไม่มี → redirect `/403`; AuthContext เก็บ `permissions` จาก login และอัปเดตเมื่อ refresh
4. `npm run build` ผ่าน (typecheck เข้ม — `TokenResponse` ที่เพิ่มฟิลด์ต้องไม่ทำ type พังที่อื่น)

## Boundaries

- **Always**:
  - การ match ทุกจุดผ่าน `lib/permissionMatch.ts` เท่านั้น
  - ทุก route ที่เคยมี `RoleGuard` ต้องมี guard ทดแทน (ห้ามหลุดเป็น unguarded)
  - คง `ProtectedRoute` (เช็ค login) ไว้ตามเดิม — permission เป็นชั้นที่สอง
- **Ask first**:
  - การเพิ่ม key ใหม่เข้า `MENU_UI` ที่ยังไม่มีใน registry ฝั่ง auth
  - การเปลี่ยน UX ของเมนู (โครงสร้าง/พฤติกรรมพับเก็บ) เกินกว่า map ของเดิมมาแสดง
- **Never**:
  - ห้ามตัดสินใจ authorization จริงฝั่ง frontend (ซ่อน UI ≠ ป้องกัน — backend enforce เสมอ)
  - ห้าม hardcode รายการ permission/เมนูเต็มเป็น fallback
  - ห้ามเก็บ `permissions` ลง localStorage (อยู่ใน memory ตาม access token เดิม)

## Success Criteria

1. ผู้ใช้ `branch_admin` (มี `profiles:*`) เห็นเมนู Staff Management; ผู้ใช้ที่ไม่มี → เมนูไม่แสดง และเข้า `/staff` ตรง ๆ ถูก redirect `/403`
2. เมนู sidebar ตรงกับผล `GET /auth/me/menus` (โครง+ลำดับ) — เปลี่ยนสิทธิ์ใน DB แล้ว refresh token → เมนูเปลี่ยนโดยไม่ deploy
3. ปุ่ม Create/Edit ใน Staff Management ซ่อนเมื่อไม่มี `profiles:create`/`profiles:edit`
4. `getMyMenus` ล้มเหลว → เมนูขั้นต่ำ + แอปไม่ crash
5. `npm run build && npm test && npm run lint` ผ่านครบ; contract test ตรงกับฝั่ง auth

## Resolved Questions

1. **Seed catalog** — draft จากเมนู/route guard จริงแล้วรีวิวผ่าน data-only PR ฝั่ง auth (ไม่ต้องรอ process แยก) ร่างที่เคาะ:

   ```
   dashboard:view                          (root action — ทุก role)
   billing (menu) ├─ agents:list, agents:fees
                  └─ invoices:list, invoices:read
   reports (menu) └─ reports:smart
   staff (มีอยู่แล้วจาก phase auth)
   ```

   **Label ใช้ภาษาอังกฤษตรงกับ UI ปัจจุบัน** ("Dashboard", "Invoices", ...) — งานนี้ต้อง behavior-preserving ห้ามเปลี่ยน UX ปนมา (อยากเปลี่ยนเป็นไทยค่อยแก้ data ทีหลัง ไม่ต้อง deploy)

2. **Rollout** — ใช้ทาง (ก): เมนูทั้งหมดจาก API ในคราวเดียว — hybrid สร้างสอง source of truth ซึ่งคือสภาพที่กำลังกำจัด; เงื่อนไขคือ seed catalog ต้อง merge + รันก่อน deploy frontend และตรวจเมนูครบบน staging ก่อนปล่อย
