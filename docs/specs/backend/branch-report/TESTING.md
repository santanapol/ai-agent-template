# Testing — branch-report

```bash
cd backend/service/branch-report
npm test
npm run ci
```

Uses `NODE_ENV=test` via `.env.test`. Integration tests may skip when Mongo unavailable.
