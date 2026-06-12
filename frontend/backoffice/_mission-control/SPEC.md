# Spec: Permission-driven Menu & Route Guards (Dynamic Permission — Phase F)

> 🗺️ ภาพรวมทุก phase: [ROADMAP](../../../backend/auth/_mission-control/ROADMAP.md)
>
> ใช้ความสามารถจาก auth phase ที่ merge แล้ว ([`backend/auth/_mission-control/SPEC.md`](../../../backend/auth/_mission-control/SPEC.md)): ฟิลด์ `permissions` ใน login/refresh response และ `GET /auth/me/menus`
> **ทำขนานกับ phase G/S ได้** — ขึ้นกับ auth service อย่างเดียว ไม่ขึ้นกับ gateway/staff

## Assumptions I'm Making

1. `POST /auth/login` และ `POST /auth/refresh` ตอบ `permissions: string[]` (ค่าดิบรวม wildcard `domain:*`) ใน body แล้ว — frontend ใช้จาก body ไม่ต้อง decode เพิ่ม
2. `GET /auth/me/menus` ตอบ flat list `{ key, label, type, parent_key, sort_order }` เฉพาะโหนดที่ผู้ใช้มีสิทธิ์ พร้อมบรรพบุรุษครบถึง root
3. **icon และ route path เป็นของ frontend** — map จาก `key` ในโค้ด (ตามที่เคาะใน auth SPEC: Resolved Question 4)
4. ผังเมนูกลาง (`auth_menus`) จะถูกขยายให้ครอบเมนูปัจจุบันทั้งหมดของ Backoffice — เป็น **data dependency ฝั่ง auth** (แก้ `scripts/seed-data/permissions.js` + รัน seed ก่อน deploy frontend) ตามร่าง catalog ใน Resolved Questions ข้อ 1
5. หน้า 403/404/Login/My Profile ไม่ผูกกับ permission (ทุกคนที่ login แล้วเข้าได้)
6. **Menu refresh timing:** เรียก `getMyMenus()` ครั้งแรกหลังจาก login/restore session สำเร็จ, cache ใน AuthContext; refresh เมนูใหม่เมื่อ `POST /auth/refresh` สำเร็จ (permissions อาจเปลี่ยน). ไม่ต้อง auto-detect เมื่อ admin เปลี่ยน permission ใน tab อื่น (staleness เป็นเจตนา — ต้อง refresh token ก่อน)

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
  types/
    auth.ts                   ← [MODIFY] TokenResponse + permissions: string[]; เพิ่ม MenuNode
    # MenuNode interface:
    #   interface MenuNode {
    #     key: string
    #     label: string
    #     type: 'menu' | 'action'
    #     parent_key: string | null
    #     sort_order: number
    #   }
  
  lib/
    permissionMatch.ts        ← [NEW] TS port ของ contract (exact + domain:*) + contract tests
    authApiClient.ts          ← [MODIFY] เพิ่ม getMyMenus(): Promise<MenuNode[]>; TokenResponse มี permissions: string[]
  
  contexts/AuthContext.tsx    ← [MODIFY] เก็บ permissions + menus จาก response body (login/refresh/getMyMenus)
  hooks/usePermission.ts      ← [NEW] usePermission(actionKey): boolean
  
  components/PermissionGuard.tsx ← [NEW] route guard จาก permission (แทน RoleGuard)
  layouts/AdminLayout.tsx     ← [MODIFY] render menus จาก GET /auth/me/menus + MENU_UI map; tree assembly logic
  
  App.tsx                     ← [MODIFY] เปลี่ยน RoleGuard → PermissionGuard ที่ /staff
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
interface MenuItemUI {
  icon: ReactNode
  route?: string  // undefined = menu group (no route)
  disabled?: boolean
}

const MENU_UI: Record<string, MenuItemUI> = {
  'dashboard': { icon: <DashboardOutlined />, route: '/' },
  'staff': { icon: <TeamOutlined /> },                 // โหนด menu = กลุ่ม ไม่มี route
  'profiles:list': { icon: <TeamOutlined />, route: '/staff' },
  'billing': { icon: <DollarOutlined /> },              // group
  'agents:list': { icon: <BotOutlined />, route: '/billing/agents' },
  'invoices:list': { icon: <FileTextOutlined />, route: '/billing/invoices' },
  'reports': { icon: <BarChartOutlined /> },            // group
  'reports:smart': { icon: <BarChartOutlined />, route: '/reports/smart' },
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

แสดงเมนูขั้นต่ำที่ไม่ผูก permission:
```typescript
const minimalMenuItems: MenuNode[] = [
  { key: 'dashboard', label: 'Dashboard', type: 'action', parent_key: null, sort_order: 0 },
  { key: 'my_profile', label: 'My Profile', type: 'action', parent_key: null, sort_order: 100 }
]
// + Toast/Banner: "Some menu items unavailable. Please refresh."
```

**ห้าม fallback ไปเมนูเต็มแบบ hardcode** (จะกลายเป็นช่องให้เห็นเมนูที่ไม่มีสิทธิ์)

**Retry strategy:** Fail immediately (no retry) → show minimal menu. If users need full menu they must refresh page/token.

## Testing Strategy

Vitest (โครงเดิม `src/**/*.test.ts`):

1. **Contract test (`permissionMatch.test.ts`)**: ชุดเดียวกับ `backend/auth/test/permission-match.test.js` ทุกเคส (exact, wildcard, cross-domain, null/undefined)
2. **Unit tests**:
   - `usePermission(actionKey)`: true/false ตาม permissions array + wildcard matching
   - **Tree assembly**: flat list + parent_key pointers → nested tree structure (via AdminLayout)
     - Input: `[{key:'staff', parent_key:null}, {key:'profiles:list', parent_key:'staff'}]`
     - Output: tree with `staff.children = [{key: 'profiles:list'}]`
   - Menu filtering: โหนดที่ไม่อยู่ใน `MENU_UI` ถูกข้าม (return undefined)
   - Sorting: เรียงตาม `sort_order` ภายในแต่ละ level
3. **Component test (`PermissionGuard.test.ts`)**:
   - มี permission → render children
   - ไม่มี permission → redirect to `/403`
4. **Integration test (`AuthContext.test.ts`)**:
   - login response (มี `permissions`) → ต้องบันทึกใน AuthContext
   - refresh response (มี `permissions` อัปเดต) → อัปเดต AuthContext
   - getMyMenus API response → update menu state
5. **Build verification**: `npm run build` ผ่าน typecheck (TypeScript strict mode — `TokenResponse` ต้องเข้ากับ login/refresh callers)

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

1. **Seed catalog** — Finalized in Phase 1 (auth service). ต้องรัน `scripts/seed-permissions.js` ก่อน deploy frontend. Full catalog:

   ```
   dashboard:view                (root action — ทุก role)
   
   staff (menu)                  [already in Phase 1 seed]
   ├─ profiles:list              (action)
   ├─ profiles:create            (action)
   └─ profiles:edit              (action)
   
   roles:assign                  (standalone action — domain separate from profiles:*)
   
   billing (menu)                [NEW in frontend catalog extension]
   ├─ agents:list                (action)
   ├─ agents:fees                (action)
   ├─ invoices:list              (action)
   └─ invoices:read              (action)
   
   reports (menu)                [NEW in frontend catalog extension]
   └─ reports:smart              (action)
   ```

   **Implementation order:**
   - Phase 1 seed: `dashboard:view`, `staff/*`, `roles:assign` (done ✓)
   - Phase 4 pre-merge: Frontend team adds `billing/*`, `reports:*` to auth seed (data-only PR)
   - Phase 4 deploy: Run seed script on production, then deploy frontend
   
   **Label conventions**: Use English labels matching current Backoffice UI ("Dashboard", "Staff", "Invoices", ...) — behavior-preserving, no UX change. Thai labels can be added later via data-only change.

2. **Rollout** — Strategy (ก): All menus from API in one pass (no hybrid fallback). Prerequisites:
   - ✅ Phase 1 seed merged + running (dashboard:view, staff/*, roles:assign)
   - ✅ `billing/*` and `reports:*` keys added to Phase 1 seed (data-only PR)
   - ✅ Seed script run on production **before** deploying frontend code
   - ✅ Staging validation: all menus render, permission changes reflected on token refresh
   - ✅ Rollback plan: revert to phase 1 seed (staff-only menus) until frontend fix ready
