# Testing — smart-report

```bash
cd backend/service/smart-report
npm test
npm run ci
```

Uses `NODE_ENV=test TZ=UTC`. Requires `.env` with Mongo for integration tests (`--env-file-if-exists=.env`).
