## Harness verification (ai-agent-template)

When verifying a specific change (affected packages only):

1. Run package CI: `npm run ci` in affected service directories (see `harness.config.yaml` code zones)
2. Run project-specific integration/smoke tests if defined in the repo
3. `node harness/scripts/ci/docs-lint.mjs`

See [AGENTS.md](../../../../AGENTS.md).

## Related Coding Standards

`coding-standard/` is empty in this template — vendor org API/domain standards after fork when testing against service contracts.
