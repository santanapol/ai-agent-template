# Confidence Map — gateway

Owner: **Berlin** (USER_CONFIRMED). Bootstrap 2026-07-03.

## Source scan

| Check | Value |
|-------|-------|
| Package root | `backend/gateway/` |
| `src/` files total | 16 |
| `src/` files read | 16 |
| Tests | 14 files `test/` |
| OpenAPI | `openapi.yaml` (edge health + errors) |

## Section confidence

| Section | Confidence | Labels |
|---------|------------|--------|
| gateway-spec | 92% | OBSERVED |
| business-domain | 88% | OBSERVED |
| technical-architecture | 90% | OBSERVED |
| database-erd | 95% | OBSERVED (Redis only) |
| endpoint summary | 90% | OBSERVED |
| owner | 100% | USER_CONFIRMED |

## Extraction coverage

| Artifact | Status |
|----------|--------|
| JWT claims / headers | synced |
| Redis `token_gen` key | synced |
| Route table | synced (`routes.json`) |
| Problem codes | synced (`spec:codes`) |
| Env vars | synced (`env.js`, `.env.example`) |
| Cross-service auth contract | synced |

## Pre-harden gate

- [x] Sections ≥ threshold
- [x] 0 DRIFT
- [x] `npm run ci` + `spec:consistency`
