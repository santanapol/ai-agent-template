# Testing — staff service

Spoke doc for **staff** (`:3101`). Hub: central specs under `docs/specs/backend/`.

## Commands

```bash
cd backend/service/staff
npm test                  # unit + route tests (NODE_ENV=test)
npm run test:coverage     # with experimental coverage
npm run coverage:gate     # enforce thresholds
npm run ci                # lint + format + test + audit
npm run seed:example      # dev sample staff_profiles
```

## CI

Included in `backend-checks` matrix → `npm run ci` ([ci-check.yml](../../../../.github/workflows/ci-check.yml))

## E2E (via backoffice-shadcn)

| UI route | Spec | Coverage |
|----------|------|----------|
| `/staff` | `e2e/specs/smoke/pages.spec.ts` | Heading per role |
| `/staff` | `e2e/specs/features/staff.spec.ts` | Create drawer, search |

Requires staff service running + auth seed. Staff-specific seed optional for richer flows.

## Roadmap

| Priority | Task |
|----------|------|
| P1 | `test:integration:ci` — HTTP routes + Mongo, gateway headers mock |
| P2 | CI job with Mongo service container (copy agent-invoice) |
| P3 | Seed rows aligned with E2E create/search assertions |
| P4 | Branch-scope tests if staff is branch-pinned |

## Reference

- agent-invoice `INTEGRATION-TESTS.md` — pattern to copy when integration CI is added
- backoffice-shadcn `QA-TEST-MATRIX.md` — staff rows (when frontend QA matrix exists)
