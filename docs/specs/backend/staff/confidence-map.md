# Confidence Map — staff

Generated after GAP_ANALYSIS (Tier A re-audit + gate wiring). Owner: **Berlin** (USER_CONFIRMED).

## Source scan (prerequisite)

| Check | Value |
|-------|-------|
| Package root | `backend/service/staff/` (confirmed) |
| `src/` files total | 62 |
| `src/` files read | 62 (equals total) |
| Modules discovered | `profiles`, `internal`, `health`, `metrics`, `lib` |
| Routes from code | profiles CRUD, role assign, password, archive/restore, internal health |
| OpenAPI paths | sync กับ `openapi.yaml` + `openapi-via-gateway.yaml` |
| Legacy spec trusted | **no** — central spec reconciled with code |

## Section confidence

| Section | Confidence | Source | Labels | Ask user? |
|---------|------------|--------|--------|-----------|
| `staff-spec` Objective | 95% | src/modules, README | OBSERVED | |
| Consumers | 90% | api-mapping, frontend | OBSERVED | |
| technical-architecture | 90% | app.js, plugins, modules | OBSERVED | |
| endpoint summary | 92% | *.route.js + openapi | OBSERVED | |
| permissions / RBAC | 92% | route guards + `@zero-platform/roles` | OBSERVED | |
| business-domain lifecycle | 90% | tests, profiles.service | OBSERVED | |
| business-domain rules | 88% | validators | OBSERVED | |
| database-erd | 88% | init-db, repositories | OBSERVED | |
| AC table | 90% | integration tests | OBSERVED | |
| out-of-scope | 85% | business-domain §1 | DOCUMENTED | |
| owner | 100% | Berlin | USER_CONFIRMED | |

## Extraction coverage

| Artifact | Extracted from code | ปรากฏที่ไหนบ้าง | สถานะ |
|----------|--------------------|----------------|-------|
| Role naming / permission keys | `@zero-platform/roles`, route guards | business-domain §7.0 + §7 + openapi enum | synced |
| Validation + password policy | staff delegates to auth internal | auth openapi + auth design doc (not staff prose) | synced |
| JWT claims | gateway headers `x-user-*` | technical-architecture | synced |
| Collections + indexes | `mongo-collections.js`, init-db | database-erd | synced |
| Audit events | profiles.service audit calls | business-domain flows | synced |
| Env vars | `.env.example`, config | technical-architecture | synced |
| Error codes | `codes.yaml` | staff-spec + openapi | synced |
| Cross-service naming | auth `VALID_ROLES` | business-domain §7.0 | synced |

## Pre-harden gate

- [x] ทุก Section confidence ≥ threshold
- [x] Extraction coverage 0 `DRIFT`
- [x] `npm run ci` ผ่าน — รวม **`spec:consistency`**

## Thresholds

| Section | Minimum for harden | Actual |
|---------|-------------------|--------|
| technical-architecture | 85% | 90% |
| endpoint summary | 85% | 92% |
| database-erd | 80% | 88% |
| business-domain | 85% | 90% |
| orchestrator overall | 90% | 95% |

## Blocking open questions

| ID | Question | Round | Status |
|----|----------|-------|--------|
| — | none | — | — |

## Drift register

| Item | Code | OpenAPI | Legacy doc | Resolution |
|------|------|---------|------------|------------|
| Role list prose | VALID_ROLES 5 roles | enum 5 roles | §7 used product names only | Added §7.0 table — synced |
| Auth password prose | minLength 8 (schema) | min 16 in design-password | auth package doc | **out of staff scope** — auth re-audit done on auth branch |

## Interview progress

- [x] Round 1 Meta (owner: Berlin)
- [x] Round 2 Drift (roles table added)
- [x] Round 3 Business rules
- [x] Round 4 Boundaries
- [x] RESTATE confirmed (batch approve per plan)
