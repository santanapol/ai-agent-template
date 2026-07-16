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

## Harness verification (ai-agent-template)

When verifying a specific change (affected packages only):

1. Run package CI: `npm run ci` in affected service directories under `code-base/`
2. Run project-specific integration/smoke tests if defined in the repo
3. `node scripts/ci/docs-lint.mjs`

See [AGENTS.md](../../AGENTS.md).

## Related Coding Standards

**Software testing** (included):
- `knowledge/software-testing/00-software_testing_overview/README.md`
- `knowledge/software-testing/01-unit-testing/README.md`
- `knowledge/software-testing/02-integration-testing/README.md`
- `knowledge/software-testing/07-regression-testing/README.md`
- `knowledge/software-testing/08-e2e-testing/README.md`

`coding-standard/` is empty in this template — vendor org API/domain standards after fork when testing against service contracts.
