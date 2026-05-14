# Frontend Render/Transition Metrics Report

Generated: 2026-05-11

## Method

### Unit-level render guard

- Test: `www/app/src/pages/DashboardPage.performance.test.tsx`
- Sampling: 30 render samples, p95 calculation in test
- Gate: p95 render duration < 80ms in jsdom

### Local browser runtime check (DevTools-equivalent)

- App served with `npm run preview -- --host 127.0.0.1 --port 4173`
- Browser audit run locally with Lighthouse headless against `http://127.0.0.1:4173/`
- Command: `npx lighthouse "http://127.0.0.1:4173/" --chrome-flags="--headless --no-sandbox" --only-categories=performance --output=json --output-path=./lighthouse-report.json`

## Result

- `npm run test` passes with p95 guard for `DashboardPage`.
- `npm run build` passes for production bundle generation.
- Lighthouse local runtime sample:
  - Performance score: 100
  - FCP: 1359.52 ms
  - LCP: 1509.52 ms
  - TBT: 0 ms
  - CLS: 0

## Scope and limitations

- Report covers local browser runtime for current MVP shell/routes (`Dashboard`, `Members`, `Billing`).
- Metrics are from local machine and single-network profile; staging/prod profiles should be measured separately.
- Real user monitoring (RUM) is still required for production-grade INP/LCP tracking.
