# Confidence Map — branch-report

Owner: Berlin. Bootstrap 2026-07-03. src 39/39 read.

| Section | Confidence |
|---------|------------|
| branch-report-spec | 88% |
| business-domain | 85% |
| technical-architecture | 88% |
| database-erd | 85% |
| openapi | 90% |

## Extraction coverage

| Artifact | Code | Spec | Status |
|----------|------|------|--------|
| Channel types | `CHANNEL_TYPES` | business-domain §2 | synced |
| Collections | repositories | database-erd | synced |
| Mesh auth | `gateway-auth.js` | technical-architecture | synced |
| Gateway route | gateway `routes.json` | branch-report-spec | synced |
| Env naming | `GATEWAY_SHARED_SECRET`, `MONGODB_URI_READ` | technical-architecture | synced |

Pre-harden: `npm run ci` + `spec:consistency` — required.
