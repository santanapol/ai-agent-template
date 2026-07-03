# Confidence Map — auth

Generated during re-audit round 4 (post full source scan). Basis: `src/` = SoT.

## Source scan (prerequisite)

| Check | Value |
|-------|-------|
| Package root | `backend/auth/` (confirmed: convention) |
| `src/` files total | 39 |
| `src/` files read | 39 (= total) |
| Modules discovered | `auth`, `internal`, `admin` |
| Routes from code | `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me/password`, `/auth/me/menus`, `/auth/me/branch`, `/auth/me/active-branch`, `/auth/admin/menus`, `/auth/admin/role-permissions`, `/internal/users`, `/internal/users/{id}/...`, `/healthz`, `/readyz`, `/.well-known/jwks.json` |
| OpenAPI paths | 18 (match routes) |
| Legacy spec trusted | **no** until row verified |

## Section confidence

| Section | Confidence | Source | Labels | Ask user? |
|---------|------------|--------|--------|-----------|
| `auth-spec` orchestrator | 92% | modules + openapi | OBSERVED | |
| Consumers | 88% | gateway, staff, api-mapping | OBSERVED | |
| technical-architecture | 90% | app.js, plugins, jwt-access, env | OBSERVED | |
| endpoint summary | 90% | *.route.js + openapi.yaml | OBSERVED | |
| permissions / RBAC (§7) | 88% | platform-roles, admin, permission-match | OBSERVED | |
| business-domain lifecycle | 88% | tests, auth.service | OBSERVED | |
| business-domain rules | 87% | validators | OBSERVED | |
| database-erd | 85% | mongo-collections, init-db, admin.repository | OBSERVED | |
| AC table | 90% | integration tests (183 pass) | OBSERVED | |
| owner | 100% | frontmatter (Berlin) | USER_CONFIRMED | |

## Extraction coverage (grep-driven — 0 DRIFT required before harden)

| Artifact | Extracted from code | ปรากฏที่ไหนบ้าง (grep) | สถานะ |
|----------|--------------------|----------------|-------|
| Role naming | `@zero-platform/roles` `VALID_ROLES` (5) | business-domain §7.1 prose + openapi enum + golden staff | **synced** (แก้ round 4: Owner/Admin/… → platform_admin/…) |
| Password policy | `auth.validator.js` minLength 8 + pattern; openapi schema 8 | business-domain, technical §4.5, openapi schema+prose, design-password §3/§5 | **synced** (แก้ round 4: design-password §3 min 16 → 8) |
| JWT claims (7) | `signAccessJwt()` `jwt-access.js` | technical §5.1 (เพิ่ม round 4) + ADR 002 | **synced** |
| Collections (7) | `mongo-collections.js`, init-db, admin.repository | database-erd §2.1–2.7 (เพิ่ม auth_menus/auth_role_permissions round 4) | **synced** |
| Audit events (11) | grep `event_type:` ใน `*.service.js` | business-domain §8 | **synced** |
| Env vars | `.env.example`, `config/env.js` | technical §9–10 | **synced** |
| Cross-service naming | golden `docs/specs/backend/staff/` | §7.1 roles ตรง staff | **synced** |
| Relative links | — | spec:consistency per-file resolve | **synced** (0 broken) |

## Pre-harden gate

- [x] ทุก Section confidence ≥ threshold
- [x] Extraction coverage 0 `DRIFT` (grep ทุก hit ตรง code)
- [x] `npm run ci` ผ่าน — รวม **`spec:consistency`** (broken links 0 + prose↔code↔openapi ตรง)

## Thresholds

| Section | Minimum for harden | Actual |
|---------|-------------------|--------|
| technical-architecture | 85% | 90% |
| endpoint summary | 85% | 90% |
| database-erd | 80% | 85% |
| business-domain | 85% | 87% |
| orchestrator overall | 90% | 92% |

## Drift register (round 4)

| Item | Code | Spec (before) | Resolution |
|------|------|---------------|------------|
| System roles | `platform_admin, branch_admin, staff, support, support_admin` | Owner/Admin/Manager/Member/Billing | spec follows code (§7.1 rewritten OBSERVED) |
| Password policy | min 8 | design-password §3 = min 16 | spec follows code (§3 → min 8) |
| ERD admin collections | `auth_menus`, `auth_role_permissions` used | footnote only | added §2.6/§2.7 |
| JWT claims | 7 claims signed | ADR lists 3 | added technical §5.1 |
| `spec:consistency` gate | — | absent | wired into `npm run ci` |

## Interview progress

- [x] Round 1 Meta (owner Berlin, consumers gateway/staff — from prior rounds)
- [x] Round 2 Drift (all rows resolved via code default — OBSERVED)
- [n/a] Round 3 Business rules (no INFERRED requiring user; all code-derived)
- [n/a] Round 4 Boundaries (unchanged from implemented baseline)
- [ ] RESTATE confirmed by user (pending G3 sign-off)
