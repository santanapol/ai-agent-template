# code-base

Placeholder zone for **application code** when `harness.config.yaml` uses **`layout: code-base`** (greenfield default).

| Path | Put here |
|------|----------|
| `backend/` | API services, gateway, shared packages |
| `frontend/` | Web apps (e.g. backoffice) |

## Root layout (`layout: root`)

If you adopted the harness into an **existing** repo, run:

```bash
./harness/scripts/agent/set-code-layout.sh root
```

Application code stays at repo root (`backend/`, `frontend/`, etc.) — this folder is unused. See [harness/knowledge/harness/adopt.md](../harness/knowledge/harness/adopt.md).

---

After fork, vendor org rules into [`coding-standard/`](../coding-standard/README.md) when ready.

Product specs and exec plans live in [`docs/`](../docs/), not under `code-base/`.

Start navigation at [AGENTS.md](../AGENTS.md).
