# API Network Audit — backoffice-next (2026-07-09)

**Scope:** All 14 routes + shell bootstrap (`AuthContext`, `AdminLayout`)  
**Environment:** Local harness (`./scripts/dev/dev-up.sh --with-frontend`), `platform_admin` / `1234`, branch **777WW** (`5f4fb5bb3156af7a2db9e5a0`)  
**Constraint:** Report only — no production code changes in this pass  
**Reference:** [COMPREHENSIVE-AUDIT-2026-07-08.md](./COMPREHENSIVE-AUDIT-2026-07-08.md) route table

---

## 1. Executive summary

| Metric | Value |
|--------|-------|
| Routes inventoried | **14/14** (static + runtime spot-check) |
| Shell bootstrap API calls (client first load) | **5–6** unique endpoints (+ refresh on full reload) |
| Sidebar first-visit incremental calls | **1–5** per route (see §4, §7) |
| Duplicate findings (NET) | **6** confirmed / suspected |
| Over-fetch findings (PAY) | **5** |
| Prod spot-check routes | **3/3** (smart-reports, permissions, agent fees) |

### Top NET findings

| ID | Route | Issue | Class |
|----|-------|-------|-------|
| NET-001 | `/smart-reports` | `listHistory(limit=100)` + `listReports` each fire **×2 on mount** — **confirmed in prod** (`localhost:3006`) | Dup-1 |
| NET-002 | `/permissions` | Tab unmount remounts `MenuCatalogTab` → **`GET /auth/admin/menus` refetch** every tab switch | Dup-2 |
| NET-003 | Shell (dev) | Strict Mode double-mount: bootstrap calls **×2** (`listProfiles` counts, `getProfileByUserId`, `getMyBranch`, `listMyBranches`) | Dup-3 |
| NET-004 | `/invoices` | `GET /api/v1/invoices/agent` **×4 on mount** (dev full reload) | Dup-1 (dev ×2 → prod verify pending) |
| NET-005 | `/` Dashboard | `listProfiles` active + archived count queries — **2 calls** where 1 count endpoint would suffice | Dup-4 (intentional parallel, not same URL) |
| NET-006 | Branch switch | `AdminLayout` `key={user.branch_id}` **remounts page** → route effects refetch (e.g. `/staff` `listProfiles`) | Dup-4 |

### Top PAY findings

| ID | Endpoint | Size | Issue |
|----|----------|------|-------|
| PAY-001 | `GET /auth/me/branches` | **19.9 KB** | 197 branches for switcher; UI shows code+name only |
| PAY-002 | `GET /api/v1/invoices/agent` | **19.8 KB** | Full branch catalog on every invoice list mount |
| PAY-003 | `GET /api/v1/branch-report/invite-links` | **22.0 KB** | Large list; channel-performance uses `id`, `inviteCode`, `username` only |
| PAY-004 | `GET /api/v1/agent-invoice/master-data/game-companies` | **16.6 KB** | Matrix renders `provider_name.en` / `_id`; many metadata fields unused |
| PAY-005 | `GET /api/v1/staff/profiles?limit=1` | **453 B** each | Dashboard uses `pagination.total` only but receives **full profile document** |

---

## 2. Methodology + limitations

### Layers

1. **Static map** — Grep/Read of `src/views/**`, `AuthContext.tsx`, `AdminLayout.tsx`, `*ApiClient.ts`
2. **Dev runtime** — cursor-ide-browser MCP + CDP `Network.enable` + `performance.getEntriesByType('resource')` on `localhost:3005` (Next dev, React Strict Mode **on** by default)
3. **Payload sizing** — Authenticated curl via frontend proxy (`localhost:3005`) with cookie jar after branch switch to 777WW
4. **Prod spot-check** — `npm run build && npx next start -p 3006` for Dup-1 vs Dup-3 on 3 hotspot routes

### Duplicate taxonomy

| ID | Definition | Count as bug? |
|----|------------|---------------|
| Dup-1 | Same URL+method ≥2× within single navigation, no user action | Yes (if prod too) |
| Dup-2 | Refetch from tab/conditional unmount remount | Yes |
| Dup-3 | Dev-only Strict Mode double-mount | No |
| Dup-4 | Waterfall / intentional parallel / remount cascade | Log separately |
| Dup-5 | `baseApiClient` 401 `_retry` after refresh | Separate from component dup |

### Thresholds (payload)

| Metric | Flag |
|--------|------|
| Response body | > 50 KB for list showing < 20 rows |
| `limit` param | ≥ 100 but UI shows matrix/filter subset |
| Unused list fields | e.g. audit fields, scripts not rendered in list |
| Count-only query | Full row returned when only `pagination.total` used |

### Limitations

- **Full-page reload capture** (browser navigate) re-runs shell bootstrap; sidebar first-visit counts in §7 assume shell already warm (client-side nav).
- **branch-report** royalty query returned 400 without valid date params in curl probe; invite-links captured.
- **401 interceptor Dup-5** not triggered in this session (no expired-token scenario).
- **My Profile refresh button** — `reloadKey` not wired to `useEffect` (UI bug, out of scope for NET).
- Prod permissions duplicate count (admin menus ×2) may include navigation timing; smart-reports dup **confirmed** in prod.

---

## 3. Shell bootstrap map (every page pays this cost)

Loaded once per session after login (client-side). **Full page reload** adds `POST /auth/refresh`.

| # | Method | Path | Caller | Trigger | Dedup guard | Dev dup |
|---|--------|------|--------|---------|-------------|---------|
| 1 | POST | `/auth/refresh` | `AuthContext` L114 | Mount (cookie session) | Shared `refreshPromiseRef` | — |
| 2 | GET | `/auth/me/menus` | `AuthContext` L138 | `user.sub` / permissions change | `cancelled` flag | Dup-3 ×2 dev |
| 3 | GET | `/api/v1/staff/profiles?user_id={sub}` | `AdminLayout` L190 | `user.sub` | `cancelled` | Dup-3 ×2 dev |
| 4 | GET | `/auth/me/branch` | `AdminLayout` L227 | `user.sub`, `user.branch_id` | cache + `cancelled` | Dup-3 ×2 dev |
| 5 | GET | `/auth/me/branches` | `AdminLayout` L262 | `showBranchSwitcher`, `user.ou_id` | cache + `cancelled` | Dup-3 ×2–3 dev |

**Dev bootstrap sample** (post-login dashboard, performance API):  
`refresh`, `me/menus`, `profiles?user_id=`, `me/branch`, `me/branches` — each shell endpoint seen **×2** except `me/branches` **×3** (Strict Mode + `activeBranch` effect re-run).

**Branch switch additional cost:**

| Method | Path | Caller |
|--------|------|--------|
| POST | `/auth/me/active-branch` | `AuthContext.switchBranch` |
| — | Page remount | `AdminLayout` L416 `key={user.branch_id}` → all route `useEffect`s re-fire |

**Interceptor (`baseApiClient.ts` L32–51):** On 401, sets `_retry=true`, calls shared refresh, replays original request. Excludes `/auth/refresh` and `/auth/me/menus`. **Dup-5** attribution: check `_retry` on replayed config.

---

## 4. Per-route request inventory

*Incremental calls after shell warm (sidebar client navigation). Full reload = shell + incremental.*

| # | Route | View | Mount triggers | Method + path | Caller | Params | Dedup | Runtime (dev) |
|---|-------|------|----------------|---------------|--------|--------|-------|---------------|
| 1 | `/login` | `Login` | submit | POST `/auth/login` | `authApiClient` | — | — | 1× login |
| 2 | `/` | `Dashboard.tsx` | mount | GET `/api/v1/staff/profiles` ×2 | L41–42 | `status=active\|archived`, `limit=1` | `cancelled` | ×2 each dev |
| 3 | `/profile` | `MyProfile.tsx` | mount | GET `/api/v1/staff/profiles?user_id=` | L70 | — | `cancelled` | 1× |
| 4 | `/smart-reports` | `SmartReport.tsx` | mount | GET `/api/v1/smart-reports/history` | L149 | `limit=100` | none | **×2 dev, ×2 prod** |
| | | | mount | GET `/api/v1/smart-reports` | L159 | `page`, `limit=20` | none | **×2 dev, ×2 prod** |
| | | | tab History | GET `.../history` | L172 | `limit=20` | — | 1× per switch |
| | | | drawer | GET `.../history` | L523 | `limit=100` | — | on demand |
| 5 | `/staff` | `StaffManagement.tsx` | mount/filter | GET `/api/v1/staff/profiles` | L123 | `page`, `limit`, `q`, `status` | `cancelled` | 1× (+ dup dev) |
| 6 | `/agents` | `AgentsList` + `useAgents` | mount | GET `/api/v1/agent-invoice/agents` | `useAgents` L20 | `page`, `limit` | — | 1× |
| 7 | `/agents/:id/fees` | `AgentFeesPage.tsx` | mount waterfall | GET `.../agents/:id` | L68 | — | AbortController | 1× |
| | | | mount | GET `.../agents?limit=100` | L86 | dropdown | AbortController | 1× prod |
| | | | mount | GET `.../agents/:id/fees?limit=100` | L97 | matrix | AbortController | 1× |
| | | | after agent | GET master-data companies | L104 | `ou_id` | AbortController | 1× |
| | | | after agent | GET master-data categories | L104 | `ou_id` | AbortController | 1× |
| 8 | `/invoices` | `InvoiceList` + `useInvoices` | mount | GET `/api/v1/invoices` | L170 | filters | AbortController | 1× |
| | | | mount | GET `/api/v1/invoices/agent` | L175 | — | — | **×4 dev** |
| 9 | `/invoices/:id` | `InvoiceDetail.tsx` | mount | GET `.../invoices/:id` | L75 | — | — | 1× |
| | | | mount | GET `.../transactions` | L76 | — | — | 1× |
| 10 | `/permissions` | `PermissionAdmin` | menus tab | GET `/auth/admin/menus` | `MenuCatalogTab` L41 | — | — | ×2 tab remount |
| | | | roles tab | GET `/auth/admin/menus` + `/auth/admin/role-permissions` | `RolePermissionsTab` L81, L65 | `role` | — | menus dup |
| 11 | `/branch-report/.../channel-performance` | `ChannelPerformancePage` | mount | GET `/api/v1/branch-report/invite-links` | L99 | — | AbortController | 1× |
| | | | search | GET `/api/v1/branch-report/royalty-21-times` | L122 | date range | AbortController | user action |
| 12–14 | `/403`, `/404`, `/500` | error pages | — | — | — | — | — | 0 API |

---

## 5. Duplicate request findings

### NET-001 — Smart Reports mount double-fetch (Dup-1, **prod confirmed**)

**Repro:** Navigate to `/smart-reports` (777WW).  
**Observed (dev):** `history?limit=100` ×4, `smart-reports?page=1&limit=20` ×4 (Strict Mode amplifies).  
**Observed (prod `:3006`):** Each endpoint **×2** — not Strict Mode.  
**Static cause:** Two independent `useEffect`s (`fetchEnrichmentHistory`, `fetchReports`) in `SmartReport.tsx` L190–196; likely **unstable `message` callback** from `useAppFeedback` re-triggers effects.  
**Impact:** 2× history enrichment traffic on every visit.

### NET-002 — Permissions tab remount (Dup-2)

**Repro:** `/permissions` → Role permissions tab → Menu catalog tab (×2 cycles).  
**Observed:** Each switch to Menu catalog: `GET /auth/admin/menus` **×2** (dev). Role tab: `admin/menus` ×2 + `role-permissions?role=platform_admin` ×1.  
**Static cause:** `PermissionAdmin.tsx` L39–44 conditional `{activeTab === "menus" ? <MenuCatalogTab /> : null}` unmounts tab → `useEffect` in `MenuCatalogTab` L54–56 refetches. Roles tab **also** calls `listAdminMenus` independently (`RolePermissionsTab` L81).  
**Impact:** Redundant 7.4 KB menu catalog payload on every tab switch.

### NET-003 — Shell Strict Mode duplicates (Dup-3)

**Repro:** Login → dashboard (dev `:3005`).  
**Observed:** `listProfiles` (active/archived), `getProfileByUserId`, `getMyBranch`, `listMyBranches` all **×2** (branches ×3).  
**Prod expectation:** Single fire per effect (not re-verified exhaustively; agent-fees prod showed ×1 per endpoint).

### NET-004 — Invoice list `invoices/agent` repeat (Dup-1)

**Repro:** Full reload `/invoices?branch_id=all&billing_month=2026-07`.  
**Observed:** `GET /api/v1/invoices/agent` **×4** in dev.  
**Static cause:** `useInvoices.fetchInvoiceAgents` in `useEffect` L174–176; investigate Strict Mode + parent re-render. **Prod spot-check:** not isolated (needs dedicated prod reload test).

### NET-005 — Dashboard dual count queries (Dup-4)

**Repro:** Mount `/` as admin.  
**Observed:** Parallel `listProfiles` with `limit=1` for active and archived.  
**Verdict:** Not same-URL duplicate; documented as **parallel count pattern** — over-fetch (PAY-005).

### NET-006 — Branch switch page remount (Dup-4)

**Repro:** On `/staff` (777WW) → switch Zero HQ → back 777WW.  
**Static cause:** `AdminLayout` L416 remounts `{children}` on `branch_id` change → `StaffManagement` L117 effect refetches `listProfiles`. Plus `POST /auth/me/active-branch`.  
**Impact:** Expected UX reset; cost = 1 list query + shell branch endpoints.

### Bulk export (not NET — intentional N×)

**Repro:** Select `IV-202607-001` → Export PDF.  
**Observed:** `GET /invoices/6a2000040000000000000001` + `GET .../transactions` — **1× each** for 1 row (scales N× for N selections per `bulkExport.ts` L54–60).

---

## 6. Payload / over-fetch findings

| ID | Endpoint | Size | UI uses | API returns (unused) | Verdict |
|----|----------|------|---------|----------------------|---------|
| PAY-001 | `GET /auth/me/branches` | 19.9 KB | Switcher label (`branch_code`, `branch_name`) | 197 `{branch_id, branch_code, branch_name, active}` — all used minimally; **volume** is the issue | Over-fetch (volume) |
| PAY-002 | `GET /api/v1/invoices/agent` | 19.8 KB | Branch filter dropdown | Same branch catalog as switcher; fetched **on every invoice list mount** | Over-fetch |
| PAY-003 | `GET /api/v1/branch-report/invite-links` | 22.0 KB | Filter `{id, inviteCode, username}` | Full invite link documents | Over-fetch |
| PAY-004 | `GET .../master-data/game-companies` | 16.6 KB | Matrix provider column | Full company metadata | Over-fetch |
| PAY-005 | `GET /api/v1/staff/profiles?limit=1` | ~453 B | Dashboard stat **`pagination.total` only** | Full `StaffProfile` incl. `user` nested object | Over-fetch |

### Smart Reports list fields (OK)

List columns (`report-columns.tsx`): `name`, `description`, schedule, `outputFormat`, derived status — **no `script`/`compiledScript` in list response** (those only on `getReport` for editor). List includes audit fields (`cr_by`, `upd_date`, etc.) not shown in table — minor unused fields, small size.

### Agent fees `limit=100`

Local seed has 1 fee row; prod matrix uses `limit=100` for full matrix — acceptable pattern but flags when fee count grows.

---

## 7. Per-menu map (sidebar vs deep-link)

**22 DB menu keys** → sidebar groups per COMPREHENSIVE-AUDIT §3.2.

### Sidebar first-visit (shell warm + incremental)

| Menu / route | DB key | Incremental API count | Notes |
|--------------|--------|----------------------|-------|
| Dashboard `/` | `dashboard:view` | **2** | active + archived count |
| Staff `/staff` | `profiles:list` | **1** | listProfiles |
| Agents `/agents` | `agents:list` | **1** | listAgents |
| Invoices `/invoices` | `invoices:list` | **2** | listInvoices + listInvoiceAgents |
| Smart Reports `/smart-reports` | `reports:smart` | **2** (+dup) | history100 + listReports |
| Channel Performance | `branch-report:marketing:channel-performance:read` | **1** | invite-links |
| Permissions `/permissions` | `permissions:manage` | **1** | admin menus (catalog tab) |

**Typical sidebar hop total:** shell (5) + route (1–2) ≈ **6–8 requests** first visit from cold session.

### Deep-link only

| Route | Permission | Incremental | Total (cold load) |
|-------|------------|-------------|-------------------|
| `/agents/:id/fees` | `agents:fees` | **5** waterfall | shell + 5 |
| `/invoices/:id` | `invoices:read` | **2** | shell + 2 |
| `/profile` | `my_profile` | **1** | shell + 1 (account menu) |

### Permission-gated hidden

Detail routes and `my_profile` — not sidebar leaves; listed above.

### Branch-switch probe (`/staff`, 777WW)

| Action | Extra requests |
|--------|----------------|
| Switch branch | `POST /auth/me/active-branch` |
| Page remount | `GET /api/v1/staff/profiles` (full list refetch) |
| Shell | May re-hit `getMyBranch` if cache invalidated |

---

## 8. Recommendations (fix later — not implemented)

**Execution plans (2026-07-09):**

- Frontend: [`docs/exec-plans/active/api-network-audit-frontend-2026-07-09.md`](../../../docs/exec-plans/active/api-network-audit-frontend-2026-07-09.md)
- Backend: [`docs/exec-plans/active/api-network-audit-backend-2026-07-09.md`](../../../docs/exec-plans/active/api-network-audit-backend-2026-07-09.md)

1. **NET-001:** Stabilize Smart Report mount effects — empty deps + refs, or single `refresh()` on mount; investigate `useAppFeedback` identity.
2. **NET-002:** Lift `listAdminMenus` to `PermissionAdmin` parent; pass registry to both tabs; stop conditional unmount or use `forceMount` on tabs.
3. **NET-004:** Add ref guard / module cache for `fetchInvoiceAgents`; dedupe with `branchOptions` cache already used post-fetch.
4. **PAY-001/002:** Shared branch catalog SWR cache keyed by `ou_id` (switcher + invoice filter); consider paginated/typeahead for 197 branches.
5. **PAY-005:** Backend `GET /staff/profiles/count?status=` or return total-only when `limit=1&fields=count`.
6. **PAY-003:** Invite-links summary projection or server-side search.
7. **NET-006:** Evaluate softer branch switch (reset filters via context vs full remount) if refetch cost becomes painful.

---

## 9. Decision log

| Decision | Rationale |
|----------|-----------|
| Dev `:3005` primary capture | Plan default; React Strict Mode on in Next dev |
| Prod `:3006` for Dup-1 validation | `next start -p 3006`; smart-reports dup survives → **real Dup-1** |
| Branch **777WW** for billing/staff | Seed `IV-202607-001`, agent `6a2000010000000000000001` |
| curl via `:3005` proxy + cookies | Direct gateway token breaks after `active-branch` (refresh rotation) |
| Dup-3 excluded from NET count | Shell ×2 dev-only per prod agent-fees control (×1 each) |
| No code changes | Audit-only pass per plan constraint |
| Interceptor Dup-5 not observed | No forced 401 during session |

---

## 10. Appendix

### A. Raw dev network samples (performance API)

**Post-login dashboard (dev):**  
`/auth/refresh`, `/auth/login`, `/auth/me/menus`, `/api/v1/staff/profiles?status=active&page=1&limit=1` (×2), `/api/v1/staff/profiles?status=archived&page=1&limit=1` (×2), `/api/v1/staff/profiles?user_id=...` (×2), `/auth/me/branch` (×2), `/auth/me/branches` (×3)

**Permissions tab switch (cleared buffer):**  
→ Roles: `/auth/admin/menus` (×2), `/auth/admin/role-permissions?role=platform_admin`  
→ Menus: `/auth/admin/menus` (×2)

**Smart reports mount (dev):**  
`/api/v1/smart-reports/history?page=1&limit=100` (×4), `/api/v1/smart-reports?page=1&limit=20` (×4)

**Agent fees mount (dev, route-only):**  
`getAgentById`, `listAgents?limit=100`, `listAgentFees?limit=100`, master-data ×2

**Bulk export 1 invoice:**  
`/api/v1/invoices/6a2000040000000000000001`, `.../transactions`

### B. Prod vs dev dup comparison (3 hotspots)

| Route | Dev (representative) | Prod `:3006` | Classification |
|-------|---------------------|--------------|----------------|
| `/smart-reports` mount | history ×4, reports ×4 | history ×2, reports ×2 | **Dup-1** (prod confirmed) |
| `/permissions` mount | admin/menus ×4 | admin/menus ×2 | Dup-2 + possible effect re-run |
| `/agents/.../fees` mount | 5 endpoints ×1–2 | 5 endpoints ×1 each | Dup-4 waterfall OK |

### C. Payload size table (777WW, authenticated)

| Path | Bytes |
|------|------:|
| `/auth/me/menus` | 2,214 |
| `/auth/me/branches` | 19,926 |
| `/auth/admin/menus` | 7,428 |
| `/api/v1/invoices/agent` | 19,790 |
| `/api/v1/branch-report/invite-links` | 21,964 |
| `/api/v1/agent-invoice/master-data/game-companies?ou_id=...` | 16,629 |
| `/api/v1/smart-reports?page=1&limit=20` | 2,297 |
| `/api/v1/smart-reports/history?page=1&limit=100` | 430 |

### D. Seed references

| Entity | ID |
|--------|-----|
| Agent 777WW | `6a2000010000000000000001` |
| Invoice IV-202607-001 | `6a2000040000000000000001` |
| Customer branch | `5f4fb5bb3156af7a2db9e5a0` |

### E. Interceptor retry (`baseApiClient.ts`)

```typescript
// 401 → _retry=true → refreshFn() → replay original request
// Excludes: /auth/refresh, /auth/me/menus
```

---

*Generated 2026-07-09 — report-only audit; see §8 for deferred fixes.*
