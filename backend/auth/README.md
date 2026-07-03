# auth

Self-hosted identity provider (login, refresh, JWT issuance) for the `zero-platform` monorepo.

| Read | Role |
| :--- | :--- |
| [docs/architecture.md](./docs/architecture.md) | **Technical SoT** — contract, security, JWT / JWKS |
| [docs/domain.md](./docs/domain.md) | **Business SoT** — scope, RBAC, business rules |
| [docs/db/erd.md](./docs/db/erd.md) | **Database Design** — MongoDB schema, ERD, indexes |
| [openapi.yaml](./openapi.yaml) | **HTTP Contract** (lint: `npm run spec:lint`) |
| [docs/session-revoke-token-gen-changes.md](./docs/session-revoke-token-gen-changes.md) | **Checklist** — O-16 / D1 session revoke (implemented) |
| [docs/design-password-management.md](./docs/design-password-management.md) | **Design** — password change / reset (**implemented** — Argon2id via auth internal APIs; see central [auth-spec](../../docs/specs/backend/auth/auth-spec.md)) |
| [docs/adrs/001-fastify-esm.md](./docs/adrs/001-fastify-esm.md) | **ADR 001** — Fastify + ESM exception |
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | System architecture / trust boundary |
| [`_coding-standards/auth`](../../../_coding-standards/auth/README.md) | Org auth edge standard |

## Scripts

- `npm run dev` — local
- `npm run init:db` — indexes + seed admin (see `.env.example`)
- `npm test` / `npm run ci` — quality gates
