---
status: completed
created: 2026-07-03
updated: 2026-07-03
services: [auth, gateway, staff, agent-invoice, smart-report, branch-report]
---

# Spec vs Code Audit — 2026-07-03

Read-only re-audit of all backend services. Method: `backend-service-spec-bootstrap` re-audit lifecycle (DISCOVER + grep-driven extraction matrix).

**Fix round (2026-07-03):** backlog items below addressed in same repo — agent-invoice re-harden, smart-report/auth/staff doc sync, gateway spectral vendored, CI matrix + branch-report bootstrap.

**Post-merge closure (2026-07-03):** merged in [#49](https://github.com/Chiang-Rai-Technology/zero-platform/pull/49) (`96c25b2`). All GHA jobs green on PR and `main`. Backlog table below marked **done**; historical drift IDs retained for traceability.

---

## Executive summary (post-merge)

| Service | Central spec | `spec:consistency` | Drift (resolved) | Status |
|---------|-------------|-------------------|------------------|--------|
| **staff** | yes | pass | AUTH-DOC-001 fixed | closed |
| **auth** | yes | pass | AUTH-DRIFT-01..03 fixed | closed |
| **gateway** | yes | pass | GW-CI-01 vendored spectral | closed |
| **smart-report** | yes | pass | SR-02..10 fixed | closed |
| **agent-invoice** | yes | pass | AI-BS-01..05 + related fixed | closed |
| **branch-report** | **yes** (bootstrapped) | pass | Tier E gap closed | closed |

**Residual notes (non-blocking):**

| Topic | Status |
|-------|--------|
| `spec:consistency` behavioral blind spots | Known limitation — keep integration tests + periodic re-audit |
| Frontend GHA targets `frontend/backoffice` only | `backoffice` still untested in GHA |
| Vendored `coding-standard/` | Self-contained copy in repo — sync from org upstream; see `coding-standard/README.md` |

---

*Archived from `docs/specs/backend/plans/` — see [docs/exec-plans/README.md](../README.md)*
