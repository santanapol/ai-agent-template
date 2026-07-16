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
