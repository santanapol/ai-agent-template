# Intent: Backoffice Comprehensive Audit (Round 2)

**Confirmed:** 2026-07-08 (round 2 — expanded scope, CRUD added)

## Outcome

A fresh, independent audit report comparing the legacy Vite backoffice (removed from repo 2026-07-08; recover from git history if needed) against `frontend/backoffice-next` (new, shipped to staging
as v0.5.0) across six axes:

1. **Menu / route parity** — does every menu item in the old system exist in
   the new system? Anything missing or extra?
2. **Feature-function parity** — per page/feature, does the new system have
   the same capabilities as the old one (search criteria, export, sync,
   bulk actions, etc.)? Includes system-level features such as the dynamic
   **Menu Catalog** management.
3. **API parity** — for each feature above, does the backend API that
   supports it have an equivalent endpoint in the new system?
4. **Design alignment** — does backoffice-next follow **studio-admin**
   patterns (`coding-standard/frontend/backoffice/reference/studio-admin`)
   for layout, table controls, pagination, column visibility, etc.?
5. **Bug findings** — runtime defects discovered during browser click-testing
   (with reproduction steps).
6. **CRUD data integrity** — for every CRUD-capable screen, verify create,
   update, and delete persist correctly and display correctly using:
   - **UI round-trip** — save → refresh/re-fetch → confirm displayed values
   - **DB direct** — query database after save and compare with UI

Any proposed fix for a gap must follow **studio-admin** design patterns, not
the old system's Ant-Design-influenced patterns.

**Method:** Hybrid — static code analysis **and** browser click-testing with
CRUD mutations and dual-layer data verification.

Does **not** use the prior `FEATURE-PARITY-AUDIT-2026-07-08.md` as input;
this is a from-scratch verification.

## User

The requester (santanapol), reviewing before deciding what to build next.

## Why now

backoffice-next just shipped to staging (v0.5.0, 2026-07-08). Need an
independent, broader audit (including design alignment, runtime bugs, and
end-to-end CRUD integrity) before deciding what (if anything) to build next.

## Success

Report lists, per menu item and per feature, whether it's present / missing /
extra / misaligned, split into Frontend gap, Backend API gap, Design gap, Bug
(with repro steps), and CRUD result (pass/fail with UI + DB evidence) where
relevant. Recommendations for closing gaps point to studio-admin patterns.

## Constraint

- Run locally via `./scripts/dev/dev-up.sh` (not staging).
- Browser testing logged in as **`platform_admin` only**.
- Install (`npm install`) the studio-admin reference app if not already
  present — it's the design source of truth for alignment checks.
- **Report only** — no production code changes in this round.
- CRUD tests use identifiable test data (prefixed) where creates are needed.

## Out of scope

- Implementing fixes for any gap or bug found (deferred to a follow-up
  decision after the report is reviewed).
- Browser testing across all roles (`branch_admin`, `support_admin`, `staff`)
  — only `platform_admin` for this round.
- Running on staging environment.
- Using the prior `FEATURE-PARITY-AUDIT-2026-07-08.md` as a baseline or
  input (fresh audit from scratch).

## Deliverable location

`frontend/backoffice-next/docs/COMPREHENSIVE-AUDIT-2026-07-08.md`
