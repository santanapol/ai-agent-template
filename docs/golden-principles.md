# Golden principles

Mechanical invariants for agent-generated code. When docs and code disagree, fix code or update docs — then encode the rule here or in lint.

## 1. Trust boundary (gateway mesh)

- Internal APIs **must** validate `x-gateway-secret` on every request.
- Internal APIs **must not** verify JWT — gateway is the sole JWT verifier.
- Gateway **must not** forward `Authorization` to internal services.
- Client-supplied `x-user-*` headers **must** be stripped/overwritten at the gateway.

See [backend/ARCHITECTURE.md](../backend/ARCHITECTURE.md).

## 2. Parse at boundary

- Validate external input (HTTP body, query, headers) at the boundary with explicit schemas.
- Do not propagate unvalidated shapes into service/repo layers.
- Prefer typed SDKs and schema validation over ad-hoc checks.

## 3. Response envelope

- API responses follow org envelope rules in `coding-standard/*/6-api-response-codes.md`.
- Problem details use consistent error codes documented in OpenAPI.

## 4. Structured logging

- Use the project logger — **no** raw `console.log` / `console.error` in application code.
- Logs must be structured (JSON) for observability ingestion.
- See `coding-standard/*/10-observability-and-logging.md`.

## 5. Shared utilities over hand-rolled helpers

- Prefer `backend/shared/` packages for cross-cutting helpers.
- Do not duplicate concurrency, retry, or header-parsing logic per service.

## 6. Repository knowledge is truth

- Decisions live in versioned markdown under `docs/` — not in chat or external docs.
- Specs under `docs/specs/` are the source for *what* to build.
- Exec plans under `docs/exec-plans/` track multi-step work.

## 7. Spec and OpenAPI alignment

- Every backend service with a central spec runs `spec:consistency`, `spec:lint`, and tests in CI.
- OpenAPI is the contract; runtime behavior must match or spec must be updated first.

## 8. Agent legibility

- File size: prefer files under ~400 lines; split when larger.
- Naming: files and folders follow `coding-standard/naming-conventions.md`; handlers, services, and repos follow existing service patterns (see staff as reference).
- Error messages from linters include remediation hints for agents.

## Enforcement

| Principle | Mechanism |
|-----------|-----------|
| Trust boundary | Integration tests, spectral, architecture docs |
| Parse at boundary | Zod/schema in handlers, unit tests |
| Response envelope | spectral `spec:lint` |
| Structured logging | ESLint custom rule (`warn` → `error` per service) |
| Shared utilities | Code review, `/gc` scans |
| Repository knowledge | `scripts/docs-lint.mjs` in CI |
| Spec alignment | `npm run ci` per package |
