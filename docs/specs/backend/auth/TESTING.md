# Testing — auth service

Spoke doc for **auth** (`:3001`). Hub: central specs under `docs/specs/backend/`.

## Commands

```bash
cd backend/auth
npm test                  # unit + integration (MongoMemoryReplSet default)
npm run test:coverage     # c8 coverage
npm run ci                # lint + format + spec gates + test + audit
npm run spec:lint         # Spectral on openapi.yaml
npm run spec:codes        # problem code registry
npm run spec:roles        # role definitions in OpenAPI
```

## Integration test layout

| Area | Files |
|------|-------|
| Auth lifecycle | `test/auth.integration.test.js` |
| Internal revoke | `test/internal-revoke.integration.test.js`, `test/internal-revoke-redis.integration.test.js` |
| Password | `test/me-password.integration.test.js`, `test/internal-set-password.integration.test.js` |
| Role / provision | `test/internal-set-role.integration.test.js`, `test/internal-create-user.integration.test.js` |
| Branch / menus | `test/active-branch.integration.test.js`, `test/me-menus.integration.test.js`, `test/admin.integration.test.js` |
| Permissions | `test/permission-*.test.js`, `test/jwt-permissions.test.js` |

## CI

`npm run ci` in `backend/auth` — included in monorepo backend checks.

## E2E (via backoffice)

Login flows exercise auth through gateway proxy — see backoffice E2E specs under `frontend/backoffice/e2e/` when present.

## Reference

- [auth-spec.md](./auth-spec.md) — AC traceability
- [technical-architecture.md](./technical-architecture.md) — test env notes (replica set for transactions)
