## Harness verification (zero-platform)

Before GO decision on backend/full-stack changes:

1. `./scripts/dev-up.sh && ./scripts/smoke.sh` — stack must pass smoke
2. `node scripts/docs-lint.mjs` — knowledge base valid
3. `npm run ci` in all touched packages
4. `./scripts/dev-down.sh` after verification

See [AGENTS.md](../../AGENTS.md).

## Related Coding Standards

When executing this command, follow the domain standards that apply to the work:

**Backend:**
- `coding-standard/backend/09-operations-and-deployment.md`
- `coding-standard/backend/10-observability-and-logging.md`
- `coding-standard/backend/13-code-quality.md`

**Auth:**
- `coding-standard/auth/09-operations-and-deployment.md`
- `coding-standard/auth/10-observability-and-logging.md`
- `coding-standard/auth/13-code-quality.md`

**Frontend (Backoffice):**
- `coding-standard/frontend/backoffice/09-operations-and-deployment.md`
- `coding-standard/frontend/backoffice/10-code-quality.md`

**Gateway:**
- `coding-standard/gateway/09-operations-and-deployment.md`
- `coding-standard/gateway/10-observability-and-logging.md`
- `coding-standard/gateway/11-code-quality.md`
