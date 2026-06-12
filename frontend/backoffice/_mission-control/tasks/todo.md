# TODO: Phase 4 (Frontend) Implementation Tasks

## Slice 1: Types & Contract Definition
- [ ] **T1.1** Modify `src/types/auth.ts` — extend TokenResponse with `permissions: string[]`
- [ ] **T1.2** Define MenuNode interface in `src/types/auth.ts`
- [ ] **T1.3** Create `src/lib/permissionMatch.ts` with contract function stubs
- [ ] **T1.4** Verify TypeScript compilation passes

**Estimate:** 45 min | **Owner:** Frontend lead | **Status:** 🔵 Waiting for Phase 1 merge

---

## Slice 2: Permission Matching Contract & Tests
- [ ] **T2.1** Implement `isWildcardEntry(entry)` in permissionMatch.ts
- [ ] **T2.2** Implement `matchesPermission(entry, actionKey)` in permissionMatch.ts
- [ ] **T2.3** Implement `anyPermissionMatches(entries, actionKey)` in permissionMatch.ts
- [ ] **T2.4** Create `src/lib/permissionMatch.test.ts` with 8 contract test cases
- [ ] **T2.5** Verify all contract tests pass (exact, wildcard, cross-domain, etc.)

**Estimate:** 1 hour | **Owner:** Frontend lead | **Status:** 🔵 Depends on T1

---

## Slice 3: API Client Enhancement
- [ ] **T3.1** Add `getMyMenus()` function to `src/lib/authApiClient.ts`
- [ ] **T3.2** Type response as `MenuNode[]`
- [ ] **T3.3** Ensure error handling propagates (caller decides fallback)
- [ ] **T3.4** Lint & verify no errors

**Estimate:** 30 min | **Owner:** Frontend lead | **Status:** 🔵 Depends on T1, T3

---

## Slice 4: AuthContext Enhancement
- [ ] **T4.0** (CRITICAL) Verify Phase 1 response includes `permissions: string[]` field
      └─ Check login/refresh response structure from auth service
      └─ Add test assertion: `TokenResponse.permissions` is array of strings
- [ ] **T4.1** Add `permissions: string[]` to AuthContextValue interface
- [ ] **T4.2** Add `menus: MenuNode[]` to AuthContextValue interface
- [ ] **T4.3** Add `menuLoadingError: boolean` to AuthContextValue interface
- [ ] **T4.4** Extend `applyToken()` to extract permissions from TokenResponse body
- [ ] **T4.5** Add state management for `permissions`, `menus`, `menuLoadingError`
- [ ] **T4.6** Call `getMyMenus()` after successful login, store result
- [ ] **T4.7** Call `getMyMenus()` after successful token refresh
- [ ] **T4.8** Handle getMyMenus failure (set menuLoadingError = true, log error)
- [ ] **T4.9** Fetch menus on session restore (mount)
- [ ] **T4.10** Verify TypeScript strict mode compilation
- [ ] **T4.11** Test AuthContext integration (manual or unit test)

**Estimate:** 1.5 hours | **Owner:** Frontend lead | **Status:** 🔵 Depends on T1, T3

---

## Slice 5: usePermission Hook & PermissionGuard Component
- [ ] **T5.1** Create `src/hooks/usePermission.ts` — hook implementation
- [ ] **T5.2** Create `src/hooks/usePermission.test.ts` (3 test cases)
- [ ] **T5.3** Create `src/components/PermissionGuard.tsx` — component implementation
- [ ] **T5.4** Create `src/components/PermissionGuard.test.ts` (4 test cases)
- [ ] **T5.5** Verify all tests pass
- [ ] **T5.6** Lint & verify no errors

**Estimate:** 1.5 hours | **Owner:** Frontend dev | **Status:** 🔵 Depends on T2, T4

---

## Slice 6: Dynamic Menu Rendering in AdminLayout
- [ ] **T6.1** Remove hardcoded `menuItems` array from AdminLayout
- [ ] **T6.2** Remove `isStaffAdmin` role check from AdminLayout
- [ ] **T6.3** Create `MENU_UI` mapping in AdminLayout (dashboard, staff, billing, reports, etc.)
- [ ] **T6.4** Implement `buildMenuTree()` helper — flat list → nested tree structure
      └─ Algorithm: Group by parent_key, build nested structure
      └─ Example: [A(parent=null), B(parent=A)] → {key:A, children:[{key:B}]}
      └─ Handle edge cases: orphaned parent_key (not in list), circular refs (caught by depth), unknown keys
- [ ] **T6.5** Implement `sortMenuItems()` helper — sort by depth + sort_order
- [ ] **T6.6** Get `menus` from AuthContext, render via buildMenuTree
- [ ] **T6.7** Implement error state: if `menuLoadingError`, show minimal menu + toast
- [ ] **T6.8** Filter unknown keys (not in MENU_UI) from rendering
- [ ] **T6.9** Verify menu icons/routes render correctly
- [ ] **T6.10** Verify selected item highlighting works
- [ ] **T6.11** Edge case testing (IMPORTANT):
      └─ **T6.11.1** Orphaned parent_key (parent not in menus) — no crash
      └─ **T6.11.2** Circular parent_key (A→B→A) — no infinite loop (depth limit catches)
      └─ **T6.11.3** Unknown keys (not in MENU_UI) — silently skip, no crash
      └─ **T6.11.4** Empty menus array — show minimal menu + toast
      └─ **T6.11.5** Single root node (no children) — renders as standalone item
- [ ] **T6.12** Lint & verify no errors
- [ ] **T6.13** Button-level permission checks in StaffManagement
      └─ Add: <Button disabled={!usePermission('profiles:create')}>Create Staff</Button>
      └─ Add: <Button disabled={!usePermission('profiles:edit')}>Edit Staff</Button>
      └─ (Explicit S3 compliance: "ปุ่มซ่อน-แสดง")
- [ ] **T6.14** Manual testing: login → menus appear

**Estimate:** 2 hours | **Owner:** Frontend dev | **Status:** 🔵 Depends on T4, T5

---

## Slice 7: Route Guard Replacement & Integration Tests
- [ ] **T7.1** Replace `RoleGuard` with `PermissionGuard` on `/staff` route in App.tsx
- [ ] **T7.2** Update PermissionGuard props: `required="profiles:list"`
- [ ] **T7.3** Remove `allowedRoles` from `/staff` route definition
- [ ] **T7.4** Create integration test scenarios (4 test cases):
  - [ ] **T7.4a** Full login → menu → permission check → redirect flow
  - [ ] **T7.4b** Menu changes after token refresh
  - [ ] **T7.4c** getMyMenus failure handling
  - [ ] **T7.4d** Route guard enforcement (403 redirect)
- [ ] **T7.5** Verify all tests pass
- [ ] **T7.6** Verify no regressions in existing tests
- [ ] **T7.7** Run TypeScript strict mode build
- [ ] **T7.8** Run linter
- [ ] **T7.9** Manual testing: permission-based routing works

**Estimate:** 2 hours | **Owner:** Frontend lead + dev | **Status:** 🔵 Depends on T5, T6

---

## Checkpoint: Full Integration Test
- [ ] **CP.1** Deploy Phase 1 seed catalog (dashboard:view, staff/*, billing/*, reports:*)
- [ ] **CP.2** Run full login flow on staging
- [ ] **CP.3** Verify Scenario 1: Permission-driven menu display (add role, refresh, menus update)
- [ ] **CP.4** Verify Scenario 2: Route guard protection (no permission → 403)
- [ ] **CP.5** Verify Scenario 3: Menu fallback on API error (network fail → minimal menu + toast)
- [ ] **CP.6** Verify Scenario 4: Menu persistence on token refresh (menus re-fetch, UI intact)
- [ ] **CP.7** Sign off: all 5 success criteria met

**Estimate:** 1.5 hours | **Owner:** QA + Frontend lead | **Status:** 🔵 Depends on all slices

---

## Summary by Role

### Frontend Lead
- Slices 1, 2, 3, 7 (types, contract, API, final integration)
- Code review on slices 4, 5, 6
- Verify T4.0 (permissions field from Phase 1)

### Frontend Dev(s)
- Slices 4, 5, 6 (AuthContext, hook/guard, AdminLayout menu)
- Pair with lead on integration tests
- Focus on T6.11 edge cases (critical for robustness)

### QA / Testing
- Checkpoint scenarios (manual + automated)
- Regression test suite
- Verify T6.11 edge cases pass

### Note on Parallelization
- T2 (Contract tests) and T3 (API client) can run in parallel after T1
- Saves ~30 min if two devs available
- Otherwise, sequential as planned (11-12 hours)

---

## Notes

**Blockers before start:**
- [ ] Phase 1 merge to main ✅ (ready after ship decision)
- [ ] Seed catalog finalized (dashboard:view, staff/*, roles:assign, billing/*, reports/*)
- [ ] Staging environment: auth service + frontend deployable

**Code Review Checkpoints:**
- After Slice 3: API types match backend contract
- After Slice 5: permission matching logic identical to backend
- After Slice 6: menu tree assembly handles all edge cases (no orphans, cycles, etc.)
- After Slice 7: full integration test scenarios passing

**Known Tricky Areas:**
- Menu tree assembly from flat list (handle parent_key lookups, cycles)
- Error state in AuthContext (menuLoadingError vs. permissions)
- Minimal menu fallback design (Dashboard + My Profile hardcoded)
- Toast/notification on getMyMenus failure (decide UI pattern)
- TypeScript strict mode on TokenResponse changes (ensure no regression on callers)

**Testing Strategy:**
- Unit: contract, hook, guard component tests
- Integration: AuthContext + full flow
- Manual: permission changes in DB, menu refresh on token refresh, error scenarios
- Build: TypeScript + lint clean
