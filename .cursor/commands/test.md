---
name: test
description: Run TDD workflow — write failing tests, implement, verify. For bugs, use the Prove-It pattern.
disable-model-invocation: true
---


Read and follow **test-driven-development** (`.cursor/skills/test-driven-development/SKILL.md`) completely.

For new features:
1. Write tests that describe the expected behavior (they should FAIL)
2. Implement the code to make them pass
3. Refactor while keeping tests green

For bug fixes (Prove-It pattern):
1. Write a test that reproduces the bug (must FAIL)
2. Confirm the test fails
3. Implement the fix
4. Confirm the test passes
5. Run the full test suite for regressions

For browser-related issues, also follow **browser-testing-with-devtools** (`.cursor/skills/browser-testing-with-devtools/SKILL.md`) to verify with Chrome DevTools MCP.

## Harness verification (zero-platform)

**Baseline before work (all services):**

```bash
./scripts/ci/ci-all.sh                  # backend CI ×7 + frontend + docs + smoke
./scripts/ci/ci-all.sh --skip-install   # faster when deps are already installed
```

When verifying a specific change (affected packages only):

1. Run package CI: `npm run ci` in affected service directories
2. Boot isolated stack: `./scripts/dev/dev-up.sh` (supports `PORT_OFFSET` for worktree isolation)
3. Run smoke: `./scripts/dev/smoke.sh`
4. Optional: regenerate schema snapshot — `node scripts/ci/generate-db-schema.mjs`
5. Teardown: `./scripts/dev/dev-down.sh`

See [AGENTS.md](../../AGENTS.md) and [docs/observability.md](../../docs/observability.md).

## Related Coding Standards

When executing this command, follow the domain standards that apply to the work:

**Software testing:**
- `knowledge/software-testing/00-software_testing_overview/README.md`
- `knowledge/software-testing/01-unit-testing/README.md`
- `knowledge/software-testing/02-integration-testing/README.md`
- `knowledge/software-testing/07-regression-testing/README.md`
- `knowledge/software-testing/08-e2e-testing/README.md`

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
