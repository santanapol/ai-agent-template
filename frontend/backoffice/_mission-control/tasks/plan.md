# Plan: Phase 4 (Frontend) — Permission-driven Menu & Route Guards

**Branch:** `feature/phase-4-permission-menu` (created from main after Phase 1 merge)  
**Scope:** Replace hardcoded role-based menu (RoleGuard) with permission-driven dynamic menus (PermissionGuard)  
**Acceptance:** All success criteria from SPEC.md + zero regressions  
**Timeline estimate:** 3-4 days (7 vertical slices)

---

## Architecture & Dependency Graph

```
Phase 1 (Auth) ✅
  ├─ POST /auth/login → TokenResponse { access_token, permissions: string[] }
  ├─ POST /auth/refresh → TokenResponse { access_token, permissions: string[] }
  └─ GET /auth/me/menus → MenuNode[] (flat list with parent_key)
  
Phase 4 (Frontend)
  ├─ Slice 1: Types (MenuNode, extend TokenResponse)
  ├─ Slice 2: permissionMatch contract (TS port of backend contract)
  ├─ Slice 3: API layer (authApiClient.getMyMenus)
  ├─ Slice 4: AuthContext (store permissions, menus, refresh on token change)
  ├─ Slice 5: usePermission hook + PermissionGuard component
  ├─ Slice 6: AdminLayout (render dynamic menus, tree assembly)
  ├─ Slice 7: Integration tests + error handling
  └─ Checkpoint: Full flow test (login → menus appear → refresh → menus update)
```

**Critical path:** Slices 1→3→4→5→6→7 (sequential for integration)  
**Parallelizable:** None (each slice depends on types from prior slice)

---

## Slice 1: Types & Contract Definition

**Goal:** Define MenuNode interface, extend TokenResponse with permissions, create contract stubs

**Files to create/modify:**
- `src/types/auth.ts` — ADD MenuNode interface + extend TokenResponse
- `src/lib/permissionMatch.ts` — NEW (contract functions + types)

**Acceptance Criteria:**
1. ✅ TokenResponse has `permissions: string[]` field
2. ✅ MenuNode interface: `{ key, label, type, parent_key, sort_order }`
3. ✅ permissionMatch exports: `isWildcardEntry`, `matchesPermission`, `anyPermissionMatches`
4. ✅ TypeScript compilation passes with strict mode

**Verification:**
```bash
npm run build  # zero TypeScript errors
npm test -- permissionMatch  # contract tests all pass (skeleton/empty for now)
```

**Estimate:** 45 min

---

## Slice 2: Permission Matching Contract & Tests

**Goal:** Implement exact + wildcard `domain:*` matching logic with comprehensive unit tests

**Files to create/modify:**
- `src/lib/permissionMatch.ts` — IMPLEMENT full contract
- `src/lib/permissionMatch.test.ts` — NEW (8 test cases from backend suite)

**Acceptance Criteria:**
1. ✅ `anyPermissionMatches(['profiles:*'], 'profiles:create')` → true
2. ✅ `anyPermissionMatches(['profiles:*'], 'invoice:read')` → false
3. ✅ `anyPermissionMatches(['profiles:create'], 'profiles:create')` → true
4. ✅ All 8 test cases from backend match exactly (exact, wildcard, cross-domain, unsupported forms, null/undefined, multi-entry)
5. ✅ Zero false negatives/positives in matching

**Verification:**
```bash
npm test -- permissionMatch  # 8/8 tests passing
grep -c "it(" src/lib/permissionMatch.test.ts  # expect 8
```

**Estimate:** 1 hour

---

## Slice 3: API Client Enhancement

**Goal:** Add getMyMenus() method to authApiClient, handle MenuNode response

**Files to create/modify:**
- `src/lib/authApiClient.ts` — ADD getMyMenus function

**Acceptance Criteria:**
1. ✅ `getMyMenus()` calls `GET /auth/me/menus` via baseApiClient
2. ✅ Returns `MenuNode[]` (flat list)
3. ✅ Error handling: throws on network/5xx (caller decides fallback strategy)
4. ✅ Uses existing auth token from AuthContext (via baseApiClient interceptor)

**Verification:**
```bash
grep -A 5 "getMyMenus" src/lib/authApiClient.ts
npm run lint  # no errors
```

**Estimate:** 30 min

---

## Slice 4: AuthContext Enhancement

**Goal:** Store permissions & menus, refresh on token change, expose via context

**Files to create/modify:**
- `src/contexts/AuthContext.tsx` — EXTEND interface + add state + refresh logic

**Changes:**
```typescript
// Current:
interface AuthContextValue {
  user: DecodedUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// New:
interface AuthContextValue {
  user: DecodedUser | null;
  permissions: string[];
  menus: MenuNode[];
  menuLoadingError: boolean;  // true if getMyMenus failed
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMenus: () => Promise<void>;  // manual refresh (optional)
}
```

**Acceptance Criteria:**
1. ✅ Login response → extract `permissions` from TokenResponse body, store in state
2. ✅ Refresh response → extract `permissions` from fresh TokenResponse, update state
3. ✅ After successful login/restore: call `getMyMenus()`, store result in `menus` state
4. ✅ After successful token refresh: call `getMyMenus()` again (permissions may have changed)
5. ✅ getMyMenus failure: set `menuLoadingError = true`, keep existing menus visible, don't crash
6. ✅ Session restoration (on mount): fetch menus after token restore completes
7. ✅ TypeScript: all new fields properly typed

**Verification:**
```bash
npm test -- AuthContext  # integration test if exists, or manual verification
npm run build  # zero type errors
```

**Estimate:** 1.5 hours

---

## Slice 5: usePermission Hook & PermissionGuard Component

**Goal:** Create hook for permission checking, PermissionGuard to replace RoleGuard

**Files to create/modify:**
- `src/hooks/usePermission.ts` — NEW hook
- `src/components/PermissionGuard.tsx` — NEW component

**usePermission Hook:**
```typescript
export function usePermission(actionKey: string): boolean {
  const { permissions } = useAuth();
  return anyPermissionMatches(permissions, actionKey);
}
```

**PermissionGuard Component:**
```typescript
export const PermissionGuard: React.FC<{
  required: string;
  children: React.ReactNode;
}> = ({ required, children }) => {
  const { user, loading, permissions } = useAuth();
  if (loading) return <Spin size="large" fullscreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!anyPermissionMatches(permissions, required)) {
    return <Navigate to="/403" replace />;
  }
  return <>{children}</>;
};
```

**Acceptance Criteria:**
1. ✅ `usePermission('profiles:create')` returns true if user has permission
2. ✅ Wildcard matching works: user with `profiles:*` returns true for `profiles:*`, `profiles:create`
3. ✅ PermissionGuard renders children if permission matches
4. ✅ PermissionGuard redirects to `/403` if permission missing
5. ✅ PermissionGuard redirects to `/login` if not logged in
6. ✅ PermissionGuard shows loading spinner during auth check

**Unit Tests:**
- `src/hooks/usePermission.test.ts` (3 tests: has permission, no permission, wildcard)
- `src/components/PermissionGuard.test.ts` (4 tests: render, redirect 403, redirect login, loading)

**Verification:**
```bash
npm test -- usePermission  # 3/3 tests passing
npm test -- PermissionGuard  # 4/4 tests passing
npm run lint  # zero errors
```

**Estimate:** 1.5 hours

---

## Slice 6: Dynamic Menu Rendering in AdminLayout

**Goal:** Replace hardcoded menuItems with dynamic tree built from API response

**Files to create/modify:**
- `src/layouts/AdminLayout.tsx` — EXTEND with menu tree assembly

**Logic:**
1. Get `menus` from AuthContext
2. Build tree from flat list (parent_key → children mapping)
3. Sort by depth + sort_order
4. Map to Ant Menu items using MENU_UI map
5. Filter out unknown keys (not in MENU_UI)
6. Render as hierarchical menu

**MENU_UI Mapping:**
```typescript
const MENU_UI: Record<string, MenuItemUI> = {
  'dashboard': { icon: <DashboardOutlined />, route: '/' },
  'staff': { icon: <TeamOutlined /> },  // no route = menu group
  'profiles:list': { icon: <TeamOutlined />, route: '/staff' },
  'billing': { icon: <DollarOutlined /> },
  'agents:list': { icon: <BotOutlined />, route: '/billing/agents' },
  'invoices:list': { icon: <FileTextOutlined />, route: '/billing/invoices' },
  'reports': { icon: <BarChartOutlined /> },
  'reports:smart': { icon: <BarChartOutlined />, route: '/reports/smart' },
  // Unknown keys: silently skip rendering
};
```

**Acceptance Criteria:**
1. ✅ Menu items render from `menus` (not hardcoded)
2. ✅ Tree structure preserved (parent_key → children visual hierarchy)
3. ✅ Sorted by depth (root items first) then sort_order
4. ✅ Icons/routes from MENU_UI map, unknown keys skipped
5. ✅ Menu group nodes (type='menu') have no clickable route
6. ✅ Menu action nodes (type='action') are clickable, navigate to route
7. ✅ Selected item highlights based on current pathname
8. ✅ If menuLoadingError, show minimal menu + toast (Dashboard, My Profile + "Some menus unavailable")
9. ✅ Remove isStaffAdmin check, remove hardcoded menuItems array

**Verification:**
```bash
# Manual test: Login → menus appear from API
# Manual test: Logout in other window, Admin revokes profiles:create → refresh → Staff menu updates
# Manual test: Network error on /auth/me/menus → minimal menu shown
npm run lint  # zero errors
```

**Estimate:** 2 hours (tree assembly + Ant Menu integration)

---

## Slice 7: Route Guard Replacement & Integration Tests

**Goal:** Replace RoleGuard with PermissionGuard, validate full flow, error handling

**Files to create/modify:**
- `src/App.tsx` — REPLACE RoleGuard with PermissionGuard on /staff route
- `src/pages/StaffManagement.tsx` — (no change, just remove RoleGuard parent)
- Integration test (optional but recommended)

**Changes in App.tsx:**
```typescript
// Before:
{
  path: 'staff',
  element: (
    <RoleGuard allowedRoles={['platform_admin', 'branch_admin']}>
      <StaffManagement />
    </RoleGuard>
  ),
}

// After:
{
  path: 'staff',
  element: (
    <PermissionGuard required="profiles:list">
      <StaffManagement />
    </PermissionGuard>
  ),
}
```

**Acceptance Criteria:**
1. ✅ `/staff` route protected by PermissionGuard (requires `profiles:list`)
2. ✅ User with `profiles:*` can access `/staff`
3. ✅ User with `profiles:list` can access `/staff`
4. ✅ User without `profiles:*` or `profiles:list` → redirect to `/403`
5. ✅ All other routes remain unchanged (Dashboard, MyProfile, Invoices, Agents, SmartReport)
6. ✅ Zero regressions: existing tests pass, no breakage in other flows
7. ✅ RoleGuard component removed (or kept but unused/deprecated)

**Integration Test Scenarios:**
```typescript
// test('full login → menu → permission check → redirect flow')
// 1. Login with branch_admin (has profiles:*)
// 2. GET /auth/me/menus returns staff tree
// 3. Navigate to /staff → PermissionGuard allows
// 4. User without profiles:* → navigate to /staff → redirect /403

// test('menu changes after token refresh')
// 1. Login → menus appear
// 2. Admin changes user's role (mock)
// 3. Click refresh button (or wait for auto-refresh)
// 4. New menus fetched, old menus gone

// test('getMyMenus failure handling')
// 1. Login succeeds, permissions in response
// 2. getMyMenus() fails (network error)
// 3. menuLoadingError = true
// 4. Minimal menu shown (Dashboard, My Profile)
// 5. Toast: "Some menu items unavailable. Please refresh."
```

**Verification:**
```bash
npm run build  # zero TypeScript errors
npm test  # all tests pass including new PermissionGuard tests
npm run lint  # zero lint errors
npm run test:coverage  # ensure no coverage regression
```

**Estimate:** 2 hours

---

## Checkpoint: Full Integration Test

**Objective:** Validate end-to-end flow with all slices integrated

**Pre-requisites:**
- Phase 1 (auth service) merged and running
- Seed catalog includes `dashboard:view`, `staff/*`, `billing/*`, `reports:*`
- Staging environment: full auth service + frontend deployed

**Test Scenarios:**

### Scenario 1: Permission-Driven Menu Display
```
1. Login as branch_admin (has: profiles:*, dashboard:view)
2. Observe: Staff menu visible, Billing/Reports hidden
3. Admin adds reports:smart to branch_admin role
4. User refreshes token
5. Observe: Reports menu now visible
```

**Success:** Menu updates dynamically without page reload

### Scenario 2: Route Guard Protection
```
1. User without profiles:* tries to navigate to /staff
2. PermissionGuard blocks, redirect to /403
3. User with profiles:* navigates to /staff
4. Page loads successfully
```

**Success:** Route guard enforces permission check

### Scenario 3: Menu Fallback on API Error
```
1. Network fails on /auth/me/menus call
2. Minimal menu displayed (Dashboard, My Profile)
3. Toast shown: "Some menu items unavailable"
4. App does not crash
```

**Success:** Graceful degradation on error

### Scenario 4: Menu Persistence on Token Refresh
```
1. Login → menus appear
2. Wait for token auto-refresh (or force refresh)
3. Menus re-fetched and updated
4. Menu selection state preserved
```

**Success:** Menus refresh silently, user experience uninterrupted

---

## Timeline & Sequencing

| Slice | Task | Duration | Blocker | Status |
|-------|------|----------|---------|--------|
| 1 | Types & Contract Definition | 45 min | — | 🔵 Ready |
| 2 | Permission Matching Contract | 1 h | Slice 1 | 🔵 Ready |
| 3 | API Client Enhancement | 30 min | Slice 1 | 🔵 Ready |
| 4 | AuthContext Enhancement | 1.5 h | Slice 1,3 | 🔵 Ready |
| 5 | usePermission Hook & PermissionGuard | 1.5 h | Slice 2,4 | 🔵 Ready |
| 6 | Dynamic Menu Rendering | 2 h | Slice 4,5 | 🔵 Ready |
| 7 | Route Guard Replacement & Tests | 2 h | Slice 5,6 | 🔵 Ready |
| CP | Full Integration Testing | 1.5 h | All | 🔵 Ready |

**Total:** ~11 hours (3-4 days with breaks, code review, testing)

---

## Success Criteria (from SPEC.md)

✅ **S1.** User `branch_admin` (has `profiles:*`) sees Staff menu; user without → menu hidden + `/staff` redirect to `/403`  
✅ **S2.** Menu sidebar matches `GET /auth/me/menus` (structure + order); change permission in DB + refresh token → menu updates without deploy  
✅ **S3.** Buttons (Create/Edit Staff) hide when user lacks `profiles:create`/`profiles:edit`  
✅ **S4.** `getMyMenus` failure → minimal menu + "Some items unavailable" + app doesn't crash  
✅ **S5.** `npm run build && npm test && npm run lint` all pass; contract tests match backend  

---

## Known Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Slow API response on getMyMenus | Low | Menu render delays | Cache in state, show loading spinner |
| Phase 1 seed missing catalog keys | Medium | Menu items not visible | Pre-verify seed catalog before frontend deploy |
| AuthContext state out of sync with JWT | Low | Stale permissions | Fetch fresh on every token refresh |
| TypeScript type mismatches | Low | Build failure | Strict mode enforced during build |
| Network error on getMyMenus | Medium | UX degradation | Minimal menu fallback tested |

---

## Post-Implementation (Future)

- [ ] Add button-level permission checks: `usePermission('profiles:create')` in StaffManagement forms
- [ ] Implement optional `refreshMenus()` manual trigger for urgent permission changes
- [ ] Monitor `menuLoadingError` frequency for ops visibility
- [ ] Consider caching menus in localStorage (post-Phase 4, if needed)
