# Todo List: Forward `x-user-permissions` Header (Phase G)

- [ ] **Task 1: claims.js Normalization & Validation**
  - **Description**: Implement `normalizePermissionsClaim(value)` to validate and normalize permissions claim from JWT to a comma-separated list of strings. Reject if members contain commas, spaces, or empty/whitespace-only strings.
  - **Verification**: Run unit tests in `test/lib/claims.test.js`.
  - **Files**: `src/lib/claims.js`

- [ ] **Task 2: Unit Testing for Claims**
  - **Description**: Add test cases to `test/lib/claims.test.js` covering successful normalization, empty/missing claim returns empty string, and various invalid shapes throwing error.
  - **Verification**: Run `npm test test/lib/claims.test.js`.
  - **Files**: `test/lib/claims.test.js`

- [ ] **Task 3: Inject Context & Proxy Injection**
  - **Description**: Extract `permissions` in `inject-context.js` and format it. Add to `gatewayUpstreamHeaders`. Add `x-user-permissions` to `DANGEROUS_HEADERS` and `trustedHeaders` in `register-proxies.js`.
  - **Verification**: Verification via integration tests in Task 5.
  - **Files**: `src/plugins/inject-context.js`, `src/proxy/register-proxies.js`

- [ ] **Task 4: Duplicate Guard Integration**
  - **Description**: Add `'x-user-permissions'` to `TRUSTED_HEADER_KEYS` in `src/app.js` to guard against duplicate headers.
  - **Verification**: Verification via duplicate header integration test.
  - **Files**: `src/app.js`

- [ ] **Task 5: Integration Testing**
  - **Description**: Add tests in `test/proxy.integration.test.js` for checking header propagation, stripping of client headers, duplicate header validation, legacy token support, and invalid claim validation.
  - **Verification**: Run `npm test test/proxy.integration.test.js` and `npm test`.
  - **Files**: `test/proxy.integration.test.js`

- [ ] **Task 6: OpenAPI & Architecture Document Updates**
  - **Description**: Update `openapi.yaml` to document the new header. Update `docs/architecture.md` Section 4 with the header details and Section 15 to bump the doc version to v1.5.0. Add entry to `CHANGELOG.md`.
  - **Verification**: Run `npm run spec:lint` and `npm run lint`.
  - **Files**: `openapi.yaml`, `docs/architecture.md`, `CHANGELOG.md`
