# Testing — agent-invoice

```bash
cd backend/service/agent-invoice
npm run test:unit
npm run test:integration:ci
npm run ci
```

## Suites

| Script | Scope |
|--------|-------|
| `test:unit` | lib, plugins, service/repository unit |
| `test:integration:ci` | `app.test.js` + `**/integration-test/*.test.js` |
| `spec:lint` | OpenAPI Spectral |

## CI

`npm run ci` includes lint, format, spec:lint, unit, integration:ci, spec:consistency, audit.
