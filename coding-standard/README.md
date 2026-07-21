# Coding standards

Org-wide **how to build** rules — auth, API, backend, frontend, gateway, etc.

This folder is empty in the template. After fork, vendor your org standards here (subtree, copy, or submodule).

## Layout

```
coding-standard/
├── backend/
├── frontend/
├── auth/
└── …
```

Agents read paths under `coding-standard/<domain>/` during `/spec`, `/build`, `/review`, and `/ship` when standards are present.

Product specs and plans live in [`docs/`](../docs/README.md). Harness setup lives in [`harness/`](../harness/README.md).
