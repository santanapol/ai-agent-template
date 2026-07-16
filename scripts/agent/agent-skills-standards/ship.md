## Harness verification (ai-agent-template)

Before GO decision:

1. `node scripts/ci/docs-lint.mjs` — skeleton and links valid
2. `npm run ci` in all touched packages under `code-base/` (when application code exists)
3. Run project-specific smoke/integration tests if the repo defines them

See [AGENTS.md](../../AGENTS.md).

## Related Coding Standards

`coding-standard/` is empty in this template — vendor org deployment/observability standards after fork when shipping application code.
