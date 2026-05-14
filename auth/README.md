# auth

Self-hosted identity provider (login, refresh, JWT issuance) for the `access-platform` monorepo.

| Read                                                                  | Role                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------ |
| [docs/architecture.md](./docs/architecture.md)                        | **Production SoT** — contract, security, MongoDB, JWT / JWKS |
| [openapi.yaml](./openapi.yaml)                                        | HTTP contract (lint: `npm run spec:lint`)                    |
| [../../ARCHITECTURE.md](../../ARCHITECTURE.md)                        | System architecture / trust boundary                         |
| [`_coding-standards/auth`](../../../_coding-standards/auth/README.md) | Org auth edge standard                                       |

## Scripts

- `npm run dev` — local
- `npm run init:db` — indexes + seed admin (see `.env.example`)
- `npm test` / `npm run ci` — quality gates
