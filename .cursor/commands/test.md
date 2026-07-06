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

## Related Coding Standards

When executing this command, follow the domain standards that apply to the work:

**Software testing:**
- `coding-standard/software-testing/00-software_testing_overview/README.md`
- `coding-standard/software-testing/01-unit-testing/README.md`
- `coding-standard/software-testing/02-integration-testing/README.md`
- `coding-standard/software-testing/07-regression-testing/README.md`
- `coding-standard/software-testing/08-e2e-testing/README.md`

**Backend:**
- `coding-standard/backend/3-api-routing.md`
- `coding-standard/backend/4-request-headers.md`
- `coding-standard/backend/6-api-response-codes.md`
- `coding-standard/backend/8-openapi-validation.md`
- `coding-standard/backend/12-data-management.md`

**Auth:**
- `coding-standard/auth/3-api-routing.md`
- `coding-standard/auth/4-request-headers.md`
- `coding-standard/auth/6-api-response-codes.md`
- `coding-standard/auth/8-openapi-validation.md`
- `coding-standard/auth/12-data-management.md`

**Frontend (Backoffice):**
- `coding-standard/frontend/backoffice/3-routing-and-pages.md`
- `coding-standard/frontend/backoffice/4-state-management.md`
- `coding-standard/frontend/backoffice/5-api-integration.md`
- `coding-standard/frontend/backoffice/8-error-handling.md`

**Gateway:**
- `coding-standard/gateway/3-api-routing.md`
- `coding-standard/gateway/4-request-headers.md`
- `coding-standard/gateway/6-api-response-codes.md`
- `coding-standard/gateway/8-openapi-validation.md`
