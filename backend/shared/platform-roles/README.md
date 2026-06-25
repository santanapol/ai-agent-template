# @zero-platform/roles

Canonical platform role names for auth, gateway mesh headers, and downstream services.

## Roles

| Export | Purpose |
|--------|---------|
| `VALID_ROLES` | All assignable system roles (mesh `x-user-role` whitelist) |
| `ADMIN_ROLES` | Admin-capable roles for staff lifecycle |
| `OU_WIDE_STAFF_ROLES` | OU-wide scope (no branch pin) |
| `isValidRole()` | Mesh guard helper |
| `isAdminRole()` | Legacy/dual-mode admin check helper |

## Adding a role

1. Append to `VALID_ROLES` in `index.js`.
2. Update `ADMIN_ROLES` / `OU_WIDE_STAFF_ROLES` if applicable.
3. Run `npm install` from repo root (`zero-platform/`).
4. Update auth seed / OpenAPI (auth imports this package for `setRoleBodySchema`).
5. Deploy all services that depend on `@zero-platform/roles`.

## Install

From monorepo root:

```bash
cd code-base/zero-platform && npm install
```

Per-service deploy (PM2) still requires `npm install` in each service directory after `git pull` so `file:` / workspace links resolve.
