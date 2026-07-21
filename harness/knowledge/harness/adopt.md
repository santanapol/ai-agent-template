# Adopting the harness — code layouts

This template supports **two code layouts** in one repo. **Product workflow docs** (`docs/specs/`, `docs/exec-plans/`, `docs/releases/`) stay under [`docs/`](../../../docs/README.md) — only **where application code lives** changes.

Configuration: [`harness.config.yaml`](../../../harness.config.yaml) at repo root.

```bash
./harness/scripts/agent/set-code-layout.sh code-base   # greenfield (default)
./harness/scripts/agent/set-code-layout.sh root        # brownfield
```

Harness reference docs live under [`harness/knowledge/harness/`](./README.md). Product lifecycle docs live under [`docs/`](../../../docs/README.md).

---

## Greenfield (`layout: code-base`)

Use when starting a **new** project from this template.

```
repo/
├── AGENTS.md  README.md  harness.config.yaml
├── .cursor/                              # Cursor runtime (root)
├── harness/                              # agent harness
│   ├── knowledge/  references/  scripts/
│   └── HARNESS-RUNBOOK.md
├── docs/specs/  docs/exec-plans/  docs/releases/
├── coding-standard/              # org rules (vendor after fork)
├── code-base/
│   ├── backend/
│   └── frontend/
└── (no backend/ at repo root)
```

After fork: run `/setup` (or sync skills manually) → add code under `code-base/` → specs under `docs/specs/`.

---

## Brownfield (`layout: root`)

Use when **overlaying** the harness onto an existing codebase. **Do not move** application code into `code-base/`.

```
repo/
├── AGENTS.md  README.md  harness.config.yaml
├── .cursor/
├── harness/
├── docs/specs/  docs/exec-plans/  docs/releases/
├── coding-standard/
├── backend/                 # ← existing code stays here
├── frontend/
└── code-base/               # optional — unused in root layout
```

### Adoption checklist

1. Copy harness into your repo (or merge this template):
   - Root: `AGENTS.md`, `README.md`, `harness.config.yaml`, `.cursor/`
   - `harness/` (knowledge, references, scripts, HARNESS-RUNBOOK.md)
   - `docs/specs/`, `docs/exec-plans/`, `docs/releases/` (README + structure)
   - `coding-standard/` (README — vendor org rules after fork)
2. Run `./harness/scripts/agent/set-code-layout.sh root` (or `/setup` to interview + apply)
3. Run `./harness/scripts/agent/sync-agent-skills.sh`
4. Run `node harness/scripts/ci/docs-lint.mjs`
5. Add CI step for docs-lint if missing

Custom paths (e.g. `apps/api` instead of `backend/`): edit `code.backend` and `code.frontend` in `harness.config.yaml` manually after running `set-code-layout.sh root`.

---

## What never changes

| Artifact | Path |
|----------|------|
| Product spec | `docs/specs/<slug>.md` |
| Exec plan | `docs/exec-plans/active/<slug>.md` |
| Release notes | `docs/releases/YYYY-MM-DD-*.md` |

**Forbidden at repo root:** `SPEC.md`, `docs/SPEC.md`, `spec/`, `tasks/`, `_mission-control/`

---

## Agents

Before `/build`, read [`harness.config.yaml`](../../../harness.config.yaml) and **harness-planning-conventions** for the active `code.backend` / `code.frontend` paths.

Service-scoped specs (optional): `<code.backend>/<service>/docs/spec.md` or `<code.frontend>/<app>/docs/spec.md`.
