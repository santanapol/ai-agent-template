---
name: harness-bootstrap
description: >-
  Interactive first-boot setup after cloning or forking ai-agent-template into a
  target repo. Interviews layout (greenfield vs brownfield), project name, code
  paths, and coding-standard intent, then runs sync, set-code-layout, docs-lint,
  and leaves the repo ready for /spec. Use when the user says setup template,
  first boot, bootstrap harness, just cloned the template, or invokes /setup.
---

# Harness bootstrap (first boot)

Guide a human through **one-time setup** after this template lands in a target repo. Interview first, then execute. Do not skip questions by guessing layout when existing code is present.

## When to use

- Fresh clone / fork / "Use this template" of **ai-agent-template**
- Overlaying the harness onto an existing app repo
- User invokes `/setup` or asks to "bootstrap" / "first boot" / "setup after clone"

**When NOT to use**

- Day-to-day feature work (`/spec` → `/plan` → `/build`)
- Re-running sync only → tell them `./harness/scripts/agent/sync-agent-skills.sh`
- Non-interactive CI — print the checklist from `harness/HARNESS-RUNBOOK.md` instead

## Loading

Read before acting:

1. `harness.config.yaml`
2. `harness/HARNESS-RUNBOOK.md` (First-time setup)
3. `harness/knowledge/harness/adopt.md`
4. `git status --short` and a quick tree of repo root (detect existing `backend/`, `frontend/`, `apps/`, `code-base/`)

## Process

### Phase 0 — Detect (silent)

Record:

| Signal | How |
|--------|-----|
| Existing app dirs at root | `backend/`, `frontend/`, `apps/`, `services/`, `api/`, `web/` |
| Already configured | non-default `harness.config.yaml` or non-template `README.md` title |
| Skills present | `.cursor/skills/` exists and is non-empty |
| Working tree dirty | uncommitted changes — ask before rewriting files |

If this looks **already bootstrapped** (project-specific README + layout set + docs-lint would pass), say so and ask whether to **re-run** or **abort**.

### Phase 1 — Interview (one question at a time)

Ask **one** question per turn. Prefer a short default guess. Wait for the answer before the next question.

Order (skip a question only if already answered clearly or detected with high confidence — still confirm):

1. **Mode**
   - Q: Greenfield (new app under `code-base/`) or brownfield (existing code stays where it is)?
   - GUESS: brownfield if root already has app dirs; otherwise greenfield

2. **Project name**
   - Q: What is the product / repo display name?
   - GUESS: folder or git remote name

3. **Code paths** (brownfield, or greenfield with non-default layout)
   - Q: Paths for backend and frontend relative to repo root?
   - GUESS: `backend` + `frontend`, or detected dirs; allow "backend only" / "frontend only" / monorepo paths like `apps/api`

4. **Sync skills now?**
   - Q: Run `./harness/scripts/agent/sync-agent-skills.sh` now? (needs network)
   - GUESS: yes

5. **Coding standards**
   - Q: Vendor org rules into `coding-standard/` now, later, or skip?
   - GUESS: later (keep README placeholder)

6. **Optional first slug**
   - Q: Want a starter spec slug after setup (e.g. `hello-platform`), or stop at harness-ready?
   - GUESS: stop at harness-ready (user runs `/spec` next)

Do **not** ask about CI hosting, deploy, or stack choice here — out of scope for harness bootstrap.

### Phase 2 — Confirm plan

Before any write, show a checklist and wait for explicit OK:

```
BOOTSTRAP PLAN
- Project name: …
- Layout: code-base | root
- code.backend: …
- code.frontend: …
- Sync agent-skills: yes | no
- Update README title: yes | no
- coding-standard: leave placeholder | (path notes)
- Starter spec: none | docs/specs/<slug>.md (stub only)
```

### Phase 3 — Execute

Run only what was approved. Prefer existing scripts.

1. **Layout**
   ```bash
   ./harness/scripts/agent/set-code-layout.sh code-base
   # or
   ./harness/scripts/agent/set-code-layout.sh root
   ```
   If custom paths differ from defaults, edit `harness.config.yaml` `code.backend` / `code.frontend` after the script (do not invent new layout values — only `code-base` | `root`).

2. **Greenfield dirs** — ensure `code-base/backend/.gitkeep` and `code-base/frontend/.gitkeep` exist when `layout: code-base`.

3. **Brownfield** — do **not** move application code into `code-base/`. Leave existing trees in place.

4. **Sync** (if approved)
   ```bash
   ./harness/scripts/agent/sync-agent-skills.sh
   ```

5. **README** — if approved, set the H1 / opening line to the project name while keeping a one-line pointer to `AGENTS.md` and `harness/HARNESS-RUNBOOK.md`. Do not delete the zone table wholesale.

6. **Docs placeholders** — ensure these exist (create `.gitkeep` / keep READMEs if missing):
   - `docs/specs/`
   - `docs/exec-plans/active/`
   - `docs/exec-plans/completed/`
   - `docs/releases/`
   - `coding-standard/README.md` (do not invent org rules)

7. **Starter spec** (only if requested) — write a short stub `docs/specs/<slug>.md` with title + "TODO: run /spec to fill" — do not fake full requirements.

8. **Verify**
   ```bash
   node harness/scripts/ci/docs-lint.mjs
   ```
   Fix failures you caused. Do not ignore a red lint.

### Phase 4 — Handoff

Print:

```
HARNESS READY
- layout: …
- code zones: …
- docs-lint: passed | failed (summary)
- Next: open this folder in Cursor → /spec → /plan → /build
- Ops guide: harness/HARNESS-RUNBOOK.md
- Agent map: AGENTS.md
```

If the user chose a starter slug, say: run `/spec` to flesh out `docs/specs/<slug>.md`.

Do **not** start implementing application features in this skill unless the user explicitly asks after handoff.

## Rules

- One interview question per turn until Phase 2
- Never commit or push unless the user asks
- Never delete existing application code
- Never write `SPEC.md` / `tasks/` at repo root
- Prefer Thai or English to match the user's language in the interview

## References

- `harness/HARNESS-RUNBOOK.md`
- `harness/knowledge/harness/adopt.md`
- `harness/scripts/agent/set-code-layout.sh`
- `harness/scripts/agent/sync-agent-skills.sh`
- `docs/README.md`
