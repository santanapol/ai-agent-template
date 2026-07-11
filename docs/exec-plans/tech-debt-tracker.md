# Tech debt tracker

| ID | Domain | Priority | Description | Status |
|----|--------|----------|-------------|--------|
| TD-001 | CI | P2 | `spec:consistency` behavioral blind spots — integration tests + `/gc` quarterly re-audit (see `SPEC-CODE-AUDIT-2026-07-03.md`) | mitigated (2026-07-09 `/gc` re-audit — auth/gateway/staff/agent-invoice/smart-report/branch-report spec:consistency pass) |
| TD-002 | CI | P3 | Frontend GHA only targets `frontend/backoffice-next` — legacy `frontend/backoffice` (Vite) removed 2026-07-08, single frontend app by design | closed |
| TD-003 | Docs | P3 | Vendored `coding-standard/` drift — `scripts/ci/check-coding-standard-sync.sh` + `/gc` checklist | closed |
| TD-004 | Harness | P2 | Observability stack wired for all harness-booted services (`/metrics`, scrape, JSON logs staff) | closed |
| TD-005 | Harness | P2 | ESLint golden-principle rules promoted to `error` per service (auth/staff split included) | closed |
| TD-006 | Harness | P2 | `dev-up.sh` boots auth/gateway/demo/staff/agent-invoice/smart-report/branch-report | closed |
| TD-007 | Frontend | P3 | Rename to match `coding-standard/naming-conventions.md` (folders, pages, components) | closed |
| TD-008 | Docs | P3 | Zero-pad numbered series in `coding-standard/` (`01-tech-stack.md` …) — upstream + vendored sync | closed |
| TD-009 | Harness | P2 | `seed-all.sh` seeds all services incl. agent-invoice + branch-report gpp_777ww — wired into `dev-up` | closed |
| TD-010 | CI | P1 | staff/demo `.env.test` missing from CI matrix — integration skipped silently | closed (2026-07-08; `.env.test` + GHA/ci-all + staff `init:db`) |
| TD-011 | Spec | P2 | smart-report has no `openapi.yaml` / `spec:lint` — prose API table only (backend review 2026-07-08) | closed (2026-07-08; openapi.yaml skeleton + spec:lint in ci) |
| TD-012 | Harness | P2 | Local sequential `npm ci` can corrupt `node_modules` (TAR_ENTRY_ERROR) — BE-001 | closed (2026-07-08; install-all-deps rm node_modules + retry + RUNBOOK) |
| TD-013 | Spec | P2 | smart-report OpenAPI full CRUD + openapi-via-gateway (skeleton done — TD-011) | closed (2026-07-09; direct CRUD + openapi-via-gateway + dual spec:lint) |
| TD-014 | Harness | P3 | Redis revoke → gateway E2E script (`workflow_dispatch`, not PR gate) | closed (2026-07-09; `scripts/ci/redis-revoke-gateway-e2e.sh` + GHA workflow_dispatch) |
| TD-015 | Spec | P3 | smart-report sandbox adversarial integration tests | closed (2026-07-09; HTTP integration tests in reports.sandbox-adversarial.integration.test.js) |
| TD-016 | Docs | P2 | ERD ↔ init-db ↔ generated db-schema drift | closed (2026-07-09; prod handoff verified, baseline refreshed, drift resolved — [`db-schema-sync`](../exec-plans/completed/db-schema-sync-2026-07-09.md)) |
| TD-017 | Harness | P2 | Post-seed validator + index gates (`verify-harness-schema.sh`, `verify-staging-schema.sh`) | closed (2026-07-09; wired seed-all + staging-seed-all — [`collection-validators-rollout`](../exec-plans/completed/collection-validators-rollout-2026-07-09.md)) |
| TD-018 | Data | P3 | Orphan `agent_fees` row without `agents` parent — read-only audit + cleanup ticket | open |
| TD-019 | Spec | P3 | `spec:consistency` validator checks for staff / agent-invoice / smart-report (auth done) | closed (2026-07-09; validator↔ERD gates in all 4 services) |
| TD-020 | Frontend | P3 | NET-006 Option A — remove `AdminLayout` `key={branch_id}` remount; use `branchId` context instead | open — defer [`api-network-audit-frontend`](../exec-plans/completed/api-network-audit-frontend-2026-07-09.md) Phase 2 |
| TD-021 | API | P3 | Batch `GET /invoices?ids=` for bulk export (ลด N× detail fetch) | open — [`api-network-audit-backend`](../exec-plans/completed/api-network-audit-backend-2026-07-09.md) future |
| TD-022 | Frontend | P3 | Smart Report drawer `listHistory(limit=100)` → paginated `limit=20` | open — [`api-network-audit-frontend`](../exec-plans/completed/api-network-audit-frontend-2026-07-09.md) FE-4.1 |
| TD-023 | Frontend | P1 | Branch switcher `limit:20` writes into shared invoice agent cache — incomplete filter for orgs with >20 branches (FE-REV-001/004) | closed (2026-07-10; PR #57) — [`fe-network-audit-review-followups`](./completed/fe-network-audit-review-followups-2026-07-10.md) |
| TD-024 | Frontend | P1 | `InvoiceList` `invoiceAgentsRequestedRef` blocks refetch when `ou_id`/`role` changes while mounted (FE-REV-002) | closed (2026-07-10; PR #57) — [`fe-network-audit-review-followups`](./completed/fe-network-audit-review-followups-2026-07-10.md) |
| TD-025 | Frontend | P2 | `StaffManagement` same-key fetch guard can drop reload after cancelled in-flight request (FE-REV-003) | closed (2026-07-10; PR #57) — [`fe-network-audit-review-followups`](./completed/fe-network-audit-review-followups-2026-07-10.md) |
| TD-026 | Frontend | P2 | Full `npm test` (backoffice-next) — test harness drift after NavMain/BulkInvoiceActionBar changes | closed (2026-07-12; 547/547 pass — [`fe-ux-shadcn-ds`](./completed/fe-ux-shadcn-ds-2026-07-10.md)) |


- Add rows when `/gc` or reviews find debt worth tracking.
- Set `Status` to `closed` with date and PR link when resolved.
- Link related exec plans in the Description when applicable.
