# Tech debt tracker

| ID | Domain | Priority | Description | Status |
|----|--------|----------|-------------|--------|
| TD-001 | CI | P2 | `spec:consistency` behavioral blind spots — integration tests + `/gc` quarterly re-audit (see `SPEC-CODE-AUDIT-2026-07-03.md`) | mitigated |
| TD-002 | CI | P3 | Frontend GHA only targets `frontend/backoffice-next` — legacy `frontend/backoffice` (Vite) removed 2026-07-08, single frontend app by design | closed |
| TD-003 | Docs | P3 | Vendored `coding-standard/` drift — `scripts/ci/check-coding-standard-sync.sh` + `/gc` checklist | closed |
| TD-004 | Harness | P2 | Observability stack wired for all harness-booted services (`/metrics`, scrape, JSON logs staff) | closed |
| TD-005 | Harness | P2 | ESLint golden-principle rules promoted to `error` per service (auth/staff split included) | closed |
| TD-006 | Harness | P2 | `dev-up.sh` boots auth/gateway/demo/staff/agent-invoice/smart-report/branch-report | closed |
| TD-007 | Frontend | P3 | Rename to match `coding-standard/naming-conventions.md` (folders, pages, components) | closed |
| TD-008 | Docs | P3 | Zero-pad numbered series in `coding-standard/` (`01-tech-stack.md` …) — upstream + vendored sync | closed |
| TD-009 | Harness | P2 | `seed-all.sh` seeds all services incl. agent-invoice + branch-report gpp_777ww — wired into `dev-up` | closed |

## How to use

- Add rows when `/gc` or reviews find debt worth tracking.
- Set `Status` to `closed` with date and PR link when resolved.
- Link related exec plans in the Description when applicable.
