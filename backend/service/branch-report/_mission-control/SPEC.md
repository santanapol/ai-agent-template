# Spec: Royalty 21 Times (Branch Report — Channel Performance)

> Phase: **SPECIFY** ✓ · **PLAN** ✓ (see [tasks/plan.md](./tasks/plan.md))  
> Date: 2026-06-29 · **Amended 2026-06-29** — registration date range filter  
> Related docs:
> - [docs/royalty-21-times.md](../docs/royalty-21-times.md)
> - [docs/design/royalty-21-times-ui.md](../docs/design/royalty-21-times-ui.md)
> - [erd/README.md](../erd/README.md)

---

## Assumptions

1. Backoffice web app (React) — not mobile-native.
2. Auth via JWT + gateway-injected headers (`x-user-ou`, `x-user-branch`); branch from navbar, not form field.
3. MongoDB branch DB is shared (`MONGODB_DB_BRANCH`, e.g. `gpp_777ww`); tenant isolation via `ou_id` + `branch_id` on every query.
4. Modern browsers only; English UI labels.
5. Reference services for patterns: `agent-invoice`, `smart-report` (Fastify modular, user-context plugin).
6. **Registration date filter (amendment):** `member.reg_date` is stored as UTC `Date`. API accepts **UTC calendar dates** (`YYYY-MM-DD`). UI defaults to the **current calendar month in the browser’s local timezone** (first day → last day), then sends those dates as `regDateFrom` / `regDateTo`. Display column Register remains `DD/MM/YYYY` UTC (unchanged). **Confirmed 2026-06-29.**
7. Deposit / withdraw / revenue metrics remain **lifetime** per member; only **which members appear** is filtered by registration date range. **Confirmed 2026-06-29.**

→ Correct any assumption above before approving this spec.

---

## Objective

### What we build

**Royalty 21 Times** — a standalone marketing report under **Branch Report → Marketing → Channel Performance**.

Per-member lifetime report: one row per member in the selected marketing channel, with summary columns (Billin, Withdraw, Promotion, Revenue) and deposit amounts for successful deposits #1–21 since registration.

### Target users

- Backoffice staff / marketing ops reviewing affiliate and referral channel performance for the **active branch** selected in the navbar.

### User stories

| ID | As a… | I want to… | So that… |
|---|---|---|---|
| US-1 | backoffice user | select channel type, registration date range, and (if affiliate) an invite link, then search | I see members attributed to that channel who registered in the chosen period |
| US-2 | backoffice user | paginate through large member lists | I can browse without loading everything at once |
| US-3 | backoffice user | see deposit #1–21 amounts per member | I can review royalty-style deposit patterns |
| US-4 | backoffice user | switch branch in navbar | the report scope updates to the new branch (re-search required) |

### Acceptance criteria

- [ ] **AC-1** Menu: Branch Report → Marketing → Channel Performance; page title **Royalty 21 Times**; route `/branch-report/marketing/channel-performance` (permission-gated).
- [ ] **AC-2** Search: Channel Type (required, default `affiliate_link`); **Register From** and **Register To** (required `DatePicker`, default **current calendar month** — first day through last day); Affiliate Link (required when affiliate); Search / Clear buttons; no branch field, no username filter.
- [ ] **AC-3** Table columns: Username, Register (`DD/MM/YYYY` UTC), Billin, Withdraw, Promotion, Revenue, 1–21; Username fixed left; cols 1–21 horizontal scroll; antd default header.
- [ ] **AC-4** Display rules: Promotion = `-`; deposit col `0` = `-`; Billin/Withdraw/Revenue = 2 decimal places; UI English.
- [ ] **AC-5** API `GET /api/v1/branch-report/invite-links` returns links for active branch, sorted `invite_code` ASC; fields `id`, `inviteCode`, `username`, `description`; dropdown label `{inviteCode} — {username}`.
- [ ] **AC-6** API `GET /api/v1/branch-report/royalty-21-times` accepts `channelType`, **`regDateFrom`**, **`regDateTo`** (required), optional `inviteLinkId`, `page`, `pageSize`; scopes by gateway user context; filters members where `reg_date` is within inclusive UTC day range; default sort username ASC; lifetime metrics unchanged.
- [ ] **AC-7** Branch switch: reset form defaults (including **current-month** reg dates), clear table, reload invite links, info toast.
- [ ] **AC-8** Standard API envelope and HTTP status codes per `coding-standard/backend/6-api-response-codes.md`.
- [ ] **AC-9** No auto-fetch report on mount; fetch only after Search.
- [ ] **AC-10** Invalid or missing `regDateFrom` / `regDateTo`, or `regDateFrom` > `regDateTo` → `400 INVALID_PARAM`; form shows inline validation before API call when possible.

### Out of scope (phase 1 + reg-date amendment)

- Export Excel
- Username search
- Real Promotion data (phase 2)
- Branch dropdown in report form
- Column sort/filter in table header
- Channel Summary / Trend 3 Months reports
- Filtering lifetime billin/withdraw/deposits by date (metrics stay lifetime)

---

## Tech Stack

### Backend — `branch-report` service

| Layer | Choice |
|---|---|
| Runtime | Node.js 24 LTS, ESM |
| Framework | Fastify 5 |
| Database | MongoDB 8 (`mongodb` driver 7) |
| Validation | JSON Schema on routes |
| Tests | `node --test` |

### Frontend — backoffice

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript (strict) |
| Build | Vite 8 |
| Router | react-router-dom 7 |
| UI | Ant Design + `@ant-design/icons` |
| HTTP | axios (domain client + interceptors) |
| Tests | vitest |

### Gateway

- Route proxy: `/api/v1/branch-report/*` → `branch-report` upstream
- JWT verify + inject `x-user-*` headers per `coding-standard/gateway/`

---

## Commands

### Backend (`code-base/zero-platform/backend/service/branch-report/`)

```bash
npm install
npm run dev                    # local server (--env-file)
npm test                       # node --test
npm run lint
```

### Frontend (`code-base/zero-platform/frontend/backoffice/`)

```bash
npm ci
npm run dev
npm test                       # vitest
npm run lint
npm run build
```

### Gateway (when adding routes)

```bash
# Update ROUTES_JSON / routes config — follow existing service registration
npm run dev
```

---

## Project Structure

### Backend (new service)

```text
backend/service/branch-report/
├── _mission-control/
│   └── SPEC.md
├── docs/                        # feature specs, ERD (existing)
├── src/
│   ├── config/
│   │   └── database.js          # singleton MongoDB (MONGODB_URI, MONGODB_DB_BRANCH)
│   ├── lib/
│   │   ├── response.js          # envelope helpers
│   │   ├── constants.js         # DEPOSIT_SUCCESS_STATUS, etc.
│   │   ├── channel-filter.js
│   │   ├── reg-date-range.js    # parse/validate regDateFrom/To → Mongo bounds
│   │   └── format-register.js   # reg_date → DD/MM/YYYY (UTC)
│   ├── plugins/
│   │   ├── gateway-auth.js      # x-gateway-secret
│   │   └── user-context.js      # x-user-ou, x-user-branch, …
│   ├── modules/
│   │   ├── invite-links/
│   │   │   ├── invite-links.route.js
│   │   │   ├── invite-links.controller.js
│   │   │   ├── invite-links.service.js
│   │   │   ├── invite-links.repository.js
│   │   │   └── invite-links.schema.js
│   │   └── royalty-21-times/
│   │       ├── royalty-21-times.route.js
│   │       ├── royalty-21-times.controller.js
│   │       ├── royalty-21-times.service.js
│   │       ├── royalty-21-times.repository.js   # aggregation pipelines
│   │       └── royalty-21-times.schema.js
│   ├── app.js
│   └── server.js
├── openapi.yaml                 # or path per team convention
├── .env.example
└── package.json
```

### Frontend ( additions )

```text
frontend/backoffice/src/
├── pages/branch-report/marketing/
│   └── ChannelPerformancePage.tsx      # Royalty 21 Times container
├── components/branch-report/marketing/
│   ├── Royalty21SearchForm.tsx
│   ├── Royalty21Table.tsx
│   └── royalty21Columns.tsx
├── lib/
│   └── branchReportApiClient.ts        # axios client
├── types/
│   └── branchReport.ts
└── AppRoutes.tsx                       # register route + menu meta
```

---

## API Contract

### Envelope (canonical — per coding standard)

**Success (list with pagination):**

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": null,
  "data": [ /* row objects */ ],
  "pagination": { "page": 1, "pageSize": 50, "total": 1234 },
  "requestId": "uuid"
}
```

**Success (invite-links — unpaginated list):**

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": null,
  "data": [
    { "id": "…", "inviteCode": "3000001", "username": "BERLIN", "description": "line777ww7" }
  ],
  "requestId": "uuid"
}
```

**Error:** `success: false`, `data: null`, appropriate HTTP status + `code` (e.g. `INVALID_PARAM`).

> Feature docs aligned with this envelope (see [royalty-21-times.md](../docs/royalty-21-times.md)).

### Pagination

| Param | Default | Max | Notes |
|---|---|---|---|
| `page` | `1` | — | min 1 |
| `pageSize` | `50` | **`100`** | clamp if over max (do not error) |

Frontend page size options: `20`, `50`, `100`.

### Gateway routing

| Item | Value |
|---|---|
| Public path | `/api/v1/branch-report/*` |
| Upstream (K8s/Docker) | `http://branch-report:<PORT>` |
| Dev port (draft) | assign in `.env.example` (e.g. `3015`) |
| Config | `ROUTES_JSON` entry — mirror `smart-report` / `agent-invoice` pattern |

```json
{
  "pathPrefix": "/api/v1/branch-report",
  "upstream": "http://branch-report:3015",
  "stripPrefix": false
}
```

Browser calls **gateway only** — never branch-report directly.

### Permission

| Item | Value |
|---|---|
| Key | `branch-report:marketing:channel-performance:read` |
| Auth seed | add to permission catalog; assign to roles that may view marketing reports |
| Frontend | menu + `ProtectedRoute` guard |
| Backend | optional `x-user-permissions` check if other services do |

### OpenAPI

| Item | Value |
|---|---|
| File | `backend/service/branch-report/openapi.yaml` (service root) |
| Version | OpenAPI **3.1.0** |
| Tags | `invite-links`, `royalty-21-times` |
| Phase 2 | `openapi-via-gateway.yaml` (Bearer JWT) if needed |

### Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/branch-report/invite-links` | Affiliate link dropdown |
| GET | `/api/v1/branch-report/royalty-21-times` | Paginated report |

### Royalty row shape

```typescript
{
  username: string;
  register: string;       // "DD/MM/YYYY" UTC, formatted server-side
  billin: number;
  withdraw: number;
  promotion: number;      // 0 in phase 1
  revenue: number;        // billin - withdraw - promotion
  deposits: number[];     // length 21; 0 = no Nth deposit
}
```

### Business constants

```javascript
const DEPOSIT_SUCCESS_STATUS = ["001","002","004","006","007","008","009","010"];
const WITHDRAW_SUCCESS_STATUS = "200";
```

### Channel filters (`member`)

| channelType | Filter |
|---|---|
| `affiliate_link` | `{ referral_staff_link_id: ObjectId(inviteLinkId) }` |
| `member_referral` | `{ referral: "Member" }` |
| `direct` | `{ referral: "Branch" }` |

Every query includes `{ ou_id, branch_id }` from `userContext`, plus registration date bounds on `member.reg_date`:

```javascript
reg_date: {
  $gte: ISODate(`${regDateFrom}T00:00:00.000Z`),
  $lte: ISODate(`${regDateTo}T23:59:59.999Z`),
}
```

### Registration date query params

| Param | Required | Format | Notes |
|---|---|---|---|
| `regDateFrom` | **yes** | `YYYY-MM-DD` | Inclusive start (UTC midnight) |
| `regDateTo` | **yes** | `YYYY-MM-DD` | Inclusive end (UTC end-of-day) |

Validation:

- Both must be valid calendar dates
- `regDateFrom` ≤ `regDateTo` (else `INVALID_PARAM`)
- No maximum range in phase 1 (ask first if product wants a cap)

### Date rules

- `reg_date`: UTC → display `DD/MM/YYYY` (zero-padded); **filter** uses UTC day boundaries above
- `bill_date`: already +7 in DB — sort cols 1–21 directly; **no** `$dateAdd +7`
- Withdraw lifetime: `wd_status = "200"`, no date filter

---

## Code Style

### Backend

- ESM, modular vertical slices under `src/modules/`
- Controller → Service → Repository only (no controller → repository)
- camelCase in JSON responses (`inviteCode`, not `invite_code`)
- Use `ObjectId` validation before queries; return `INVALID_PARAM` on bad ids
- Log with `requestId`; never log `x-gateway-secret`

### Frontend

- PascalCase page/component files under `pages/`, `components/`
- English UI strings
- Ant Design: `Form` + `Radio.Group` (channel) + **`DatePicker`** (Register From / To) + `Select` (affiliate) + `Table` (fixed columns + scroll)
- Default form values on mount / Clear / branch switch:

```typescript
import dayjs from 'dayjs';

function currentMonthRegRange() {
  const start = dayjs().startOf('month');
  const end = dayjs().endOf('month');
  return { regDateFrom: start, regDateTo: end };
}
```

- Serialize to API as `YYYY-MM-DD` strings (`regDateFrom`, `regDateTo`)
- Format helpers:

```typescript
function formatSummary(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDeposit(n: number): string {
  return n === 0 ? '-' : formatSummary(n);
}
function formatPromotion(): string {
  return '-';
}
```

### Permission (confirmed)

`branch-report:marketing:channel-performance:read`

---

## Testing Strategy

### Backend

| Level | Tool | Scope |
|---|---|---|
| Unit | `node --test` | `format-register`, channel filter builder, **`reg-date-range`**, envelope helpers |
| Integration | `node --test` + test MongoDB or mocked repository | invite-links query scope; royalty aggregation with fixture members |
| Manual | curl via gateway / Postman | end-to-end with JWT |

- Tests live beside modules: `*.test.js` or `tests/` under service root
- Mock `userContext` in controller/service tests
- Verify every repository query includes `ou_id` + `branch_id` + `reg_date` bounds when listing members

### Frontend

| Level | Tool | Scope |
|---|---|---|
| Unit | vitest | column formatters, option label mapper |
| Component | vitest + RTL (if project uses) | form validation (affiliate + **reg dates**), conditional affiliate field |
| Manual | browser | search flow, pagination, branch switch reset |

### Definition of done (testing)

- Backend: all unit tests pass; happy path + invalid `inviteLinkId` + **reg date validation** covered
- Frontend: formatters tested; manual checklist AC-1–AC-10 verified in dev

---

## Boundaries

### Always

- Scope every MongoDB query with `ou_id` + `branch_id` from trusted gateway headers
- Use standard API envelope and real HTTP status codes
- Follow `coding-standard/backend/*` and `coding-standard/frontend/backoffice/*`
- Register gateway route before frontend integration
- English UI; antd default table theme

### Ask first

- Changing response envelope or pagination shape
- Adding npm dependencies not in standard stack
- New permission keys / auth seed changes
- Aggregation index changes on production collections
- Performance caps (max `pageSize`, query timeout) beyond defaults

### Never

- Accept `branchId` from client query/body for tenant scope
- `$dateAdd +7` on `bill_date`
- Commit secrets or `.env` files
- Export Excel / Promotion real data in phase 1
- Skip gateway secret validation in non-dev environments

---

## Success Criteria

Implementation is complete when:

1. Both APIs deployed behind gateway and callable from backoffice with valid JWT.
2. All acceptance criteria AC-1 through **AC-10** pass manual QA on dev/staging.
3. Backend tests pass in CI; frontend unit tests for formatters pass.
4. OpenAPI documents both endpoints and required gateway headers.
5. No cross-branch data leakage in integration tests (wrong `branch_id` returns empty or forbidden scope only).

---

## Decisions log (approved)

| ID | Decision |
|---|---|
| B1 | Separate `GET /invite-links`; fields `inviteCode`, `username`, `description` |
| B2 | Active branch scope; sort `invite_code` ASC |
| B3 | Standard service response envelope |
| F1 | Menu: Branch Report → Marketing → Channel Performance |
| F2 | Dropdown label: `{inviteCode} — {username}` |
| F3 | Deposit col `0` → `-` |
| F4 | antd default header |
| F5 | Promotion → `-` |
| F6 | Billin/Withdraw/Revenue → 2 decimals |
| F7 | English UI |
| R1 | Register format `DD/MM/YYYY` (UTC), server-formatted |
| X1 | Promotion phase 1 = `-` |
| X2 | Branch switch → reset + reload invite links |
| X3 | Default channel = `affiliate_link` |
| O1 | Gateway: `/api/v1/branch-report` → upstream `branch-report:PORT` |
| O2 | Permission: `branch-report:marketing:channel-performance:read` + auth seed + menu guard |
| O3 | `pageSize` default 50, max 100 (clamp), UI options `[20, 50, 100]` |
| O4 | OpenAPI: `branch-report/openapi.yaml` (3.1.0) at service root |
| D1 | **Register date range:** required `regDateFrom` + `regDateTo`; filter `member.reg_date` (UTC inclusive days) |
| D2 | **UI default:** current calendar month (local) on mount, Clear, and branch switch |
| D3 | **Metrics:** billin / withdraw / deposits remain lifetime; reg date filters member list only |

---

## Open Questions

| ID | Question | Default if unanswered |
|---|---|---|
| Q1 | Max allowed reg-date range (e.g. 12 months)? | No cap in phase 1 |
| Q2 | Should `regDateTo` allow future dates? | Yes — validate format only; empty result OK |

**Assumptions confirmed by user 2026-06-29:** local-timezone current month default (A6); lifetime metrics with reg-date member filter only (A7).

---

## Approval

- [x] Spec reviewed (2026-06-29) — phase 1
- [x] Plan written → [tasks/plan.md](./tasks/plan.md), [tasks/todo.md](./tasks/todo.md) — phase 1
- [x] **Reg-date amendment reviewed** (2026-06-29)
- [x] **Assumptions confirmed** (local month default; lifetime metrics)
- [x] **Reg-date plan approved** → Phase 7 in [tasks/plan.md](./tasks/plan.md)
- [x] Ready for `/code-build` on reg-date amendment

**Do not implement reg-date changes until amended spec + Phase 7 plan are approved.**
