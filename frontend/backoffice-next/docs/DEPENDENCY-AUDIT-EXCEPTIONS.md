# Dependency audit exceptions — backoffice-next

Documented exceptions for `npm audit` findings that cannot be resolved without a breaking migration or upstream fix.

## `xlsx` (SheetJS) — High severity

| Field | Value |
|-------|-------|
| Package | `xlsx` |
| Used for | Invoice bulk export (`.xlsx`) in `src/views/invoices/export/` |
| Audit status | High CVE; **no patched version** available via npm at time of staging cutover (2026-07-08) |
| Mitigation | Export is gated on `invoices:read`; files are generated client-side from already-authorized invoice data; no server-side parsing of untrusted uploads |
| Plan | Track SheetJS / community fork releases; evaluate `exceljs` or server-side export when a stable alternative is validated |

Re-run audit before each release:

```bash
cd frontend/backoffice-next
npm audit --omit=dev
```

Update this file when the exception is resolved or the risk acceptance changes.
