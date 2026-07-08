# Confidence Map — agent-invoice

Owner: Berlin. src 77/77 read (2026-07-03 re-harden post #46).

| Section | Confidence |
|---------|------------|
| agent-invoice-spec | 92% |
| business-domain | 90% |
| technical-architecture | 90% |
| database-erd | 90% |
| endpoints | 92% |

## Extraction coverage

| Artifact | Code source | Spec | Status |
|----------|-------------|------|--------|
| Branch list scope | `list-invoices.query.js`, controller | agent-invoice-spec §Branch scope, business-domain §5 | synced |
| By-id branch scope | `resolveScopeBranchId`, repository | agent-invoice-spec AC-7 | synced |
| Invoice statuses | `invoice-status.js` | business-domain §3 | synced |
| Fee collection | `agent_fees` in init-db | database-erd | synced |
| Master-data paths | routes + openapi | agent-invoice-spec | synced |
| Gateway secret env | `.env.example` `GATEWAY_SHARED_SECRET` | technical-architecture | synced |

Pre-harden: `npm run ci` + `spec:consistency` — required.

No `codes.yaml` — OpenAPI problem types only.
