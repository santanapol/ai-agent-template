## Harness verification (zero-platform)

**Baseline before work (all services):**

```bash
./scripts/ci-all.sh                  # backend CI ×7 + frontend + docs + smoke
./scripts/ci-all.sh --skip-install   # faster when deps are already installed
```

When verifying a specific change (affected packages only):

1. Run package CI: `npm run ci` in affected service directories
2. Boot isolated stack: `./scripts/dev-up.sh` (supports `PORT_OFFSET` for worktree isolation)
3. Run smoke: `./scripts/smoke.sh`
4. Optional: regenerate schema snapshot — `node scripts/generate-db-schema.mjs`
5. Teardown: `./scripts/dev-down.sh`

See [AGENTS.md](../../AGENTS.md) and [docs/observability.md](../../docs/observability.md).

## Related Coding Standards

When executing this command, follow the domain standards that apply to the work:

**Software testing:**
- `coding-standard/software-testing/00-software_testing_overview/README.md`
- `coding-standard/software-testing/01-unit-testing/README.md`
- `coding-standard/software-testing/02-integration-testing/README.md`
- `coding-standard/software-testing/07-regression-testing/README.md`
- `coding-standard/software-testing/08-e2e-testing/README.md`

**Backend:**
- `coding-standard/backend/03-api-routing.md`
- `coding-standard/backend/04-request-headers.md`
- `coding-standard/backend/06-api-response-codes.md`
- `coding-standard/backend/08-openapi-validation.md`
- `coding-standard/backend/12-data-management.md`

**Auth:**
- `coding-standard/auth/03-api-routing.md`
- `coding-standard/auth/04-request-headers.md`
- `coding-standard/auth/06-api-response-codes.md`
- `coding-standard/auth/08-openapi-validation.md`
- `coding-standard/auth/12-data-management.md`

**Frontend (Backoffice):**
- `coding-standard/frontend/backoffice/03-routing-and-pages.md`
- `coding-standard/frontend/backoffice/04-state-management.md`
- `coding-standard/frontend/backoffice/05-api-integration.md`
- `coding-standard/frontend/backoffice/08-error-handling.md`

**Gateway:**
- `coding-standard/gateway/03-api-routing.md`
- `coding-standard/gateway/04-request-headers.md`
- `coding-standard/gateway/06-api-response-codes.md`
- `coding-standard/gateway/08-openapi-validation.md`
