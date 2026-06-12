# Implementation Plan: Gateway Phase G (Forward `x-user-permissions`)

## Task List

### Phase 1: Claims Normalization (XS)
- [x] **Task 1**: Implement `normalizePermissionsClaim` in `src/lib/claims.js`
- [x] **Task 2**: Write unit tests in `test/lib/claims.test.js`

#### Checkpoint: Claims Normalization
- [x] `normalizePermissionsClaim` unit tests pass (`npm test test/lib/claims.test.js`)

### Phase 2: Context Injection & Anti-Spoofing (S)
- [x] **Task 3**: Integrate in `inject-context.js` and `register-proxies.js`
- [x] **Task 4**: Register header in duplicate guard `app.js`

#### Checkpoint: Core Wiring
- [x] Gateway builds and boots without errors (`npm run dev` or equivalent)

### Phase 3: Integration Testing (S)
- [x] **Task 5**: Write comprehensive integration tests in `test/proxy.integration.test.js`

#### Checkpoint: Integration Verification
- [x] Integration tests pass completely (`npm test test/proxy.integration.test.js`)
- [x] All gateway tests pass (`npm test`)

### Phase 4: Documentation & Standards (XS)
- [x] **Task 6**: Update `openapi.yaml`, `docs/architecture.md`, and `CHANGELOG.md`

#### Checkpoint: Standards & Quality
- [x] `npm run lint` passes
- [x] `npm run spec:lint` passes
- [x] Document version of `docs/architecture.md` is bumped to v1.5.0
