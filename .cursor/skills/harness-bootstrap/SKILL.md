---
name: harness-bootstrap
description: >-
  Interactive first-boot setup after cloning or forking ai-agent-template into a
  target repo. Interviews layout (greenfield vs brownfield), project name, code
  paths, coding-standard intent, and optional Vercel React/Next + Design/UI
  skills, then runs sync, set-code-layout, docs-lint, and leaves the repo ready
  for /spec. Use when the user says setup template, first boot, bootstrap
  harness, just cloned the template, or invokes /setup.
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

1. `harness.config.yaml` (must exist at **repo root**)
2. `harness/HARNESS-RUNBOOK.md` (First-time setup)
3. `harness/knowledge/harness/adopt.md`
4. `git status --short` and a quick tree of repo root (detect existing `backend/`, `frontend/`, `apps/`, `code-base/`)
5. `README.md` first heading (for bootstrap detection)

## Process

### Phase 0 — Preconditions + detect (silent, then block if needed)

**Abort with a clear fix** if any precondition fails:

| Check | Fail message |
|-------|----------------|
| Cwd is repo root | `harness.config.yaml` and `harness/scripts/agent/` missing — `cd` to the cloned repo root |
| Node.js available | `node -v` fails — install Node 20+ (docs-lint / sync helpers need it) |
| Harness scripts executable | `harness/scripts/agent/sync-agent-skills.sh` or `set-code-layout.sh` missing |

**Chicken-and-egg:** if `.cursor/skills/harness-bootstrap/SKILL.md` is missing (partial copy without `.cursor/`):

1. Tell the user you will run a **pre-sync** so `/setup` can continue
2. Run `./harness/scripts/agent/sync-agent-skills.sh` immediately (needs network)
3. Re-read this skill from `.cursor/skills/harness-bootstrap/SKILL.md`, then continue Phase 0 detect

Record signals:

| Signal | How |
|--------|-----|
| Existing app dirs at root | `backend/`, `frontend/`, `apps/`, `services/`, `api/`, `web/` |
| Skills present | count dirs under `.cursor/skills/` |
| Working tree dirty | `git status --porcelain` non-empty — ask before rewriting README / config |
| Already bootstrapped | **all** of: README H1 is **not** `ai-agent-template`; `.cursor/skills/spec-driven-development/SKILL.md` exists; `node harness/scripts/ci/docs-lint.mjs` would pass (or passed recently) |

If already bootstrapped → say so and ask **re-run** or **abort**. Do not silently re-write.

### Phase 1 — Interview (one question at a time)

Ask **one** question per turn. Prefer a short default guess. Wait for the answer before the next question.

Order (skip only if already answered clearly or detected with high confidence — still confirm the guess):

1. **Mode**
   - Q: Greenfield (new app under `code-base/`) or brownfield (existing code stays where it is)?
   - GUESS: brownfield if root already has app dirs; otherwise greenfield

2. **Project name**
   - Q: What is the product / repo display name?
   - GUESS: folder or `git remote` basename
   - Effect: having a name ⇒ **Update README title: yes** (unless user says keep template README)

3. **Code paths** — ask when:
   - **brownfield**, or
   - greenfield but user already said they will not use default `code-base/backend` + `code-base/frontend`
   - Q: Paths for backend and frontend relative to repo root? (or "defaults")
   - GUESS: brownfield → detected dirs or `backend` + `frontend`; greenfield defaults → skip this question
   - Allow "backend only" / "frontend only" / monorepo paths (`apps/api`, `apps/web`)
   - **Note for greenfield `layout: code-base`:** docs-lint still requires **both** `code-base/backend/.gitkeep` and `code-base/frontend/.gitkeep`. If user is backend-only for now, still create the empty frontend placeholder (and vice versa) and say so in the plan.

4. **Sync skills now?**
   - Q: Run `./harness/scripts/agent/sync-agent-skills.sh` now? (needs network; installs/refreshes all `.cursor/skills`, commands, agents, `harness/references/`)
   - GUESS: **yes** (recommended even if `.cursor/` shipped with the template — pins upstream)
   - If **no**: warn that day-to-day `/spec` may rely on incomplete or stale skills

5. **Vercel React/Next.js + Design/UI skills?**
   - Q: Also install Vercel [React and Next.js](https://vercel.com/docs/agent-resources/skills#react-and-next.js) + [Design and UI](https://vercel.com/docs/agent-resources/skills#design-and-ui) skills (`vercel-react-best-practices`, `web-design-guidelines` from `vercel-labs/agent-skills`)?
   - GUESS: **yes** when the project has (or will have) a frontend; otherwise ask — still default **yes** for greenfield with `code-base/frontend`
   - Effect: set `optional_skills.vercel_react_ui: true` in `harness.config.yaml` and run `./harness/scripts/agent/install-optional-skills.sh`

6. **Coding standards**
   - Q: `coding-standard/` — **later**, **skip**, or **vendor now**?
   - GUESS: **later** (keep `coding-standard/README.md` placeholder)
   - If **vendor now**: ask **one follow-up** for the source (git URL, local path, or org repo). If they cannot provide a source → fall back to **later**. Do **not** invent rules.
   - If **skip**: leave README placeholder; do not delete `coding-standard/`

7. **Optional first slug**
   - Q: Want a starter spec stub slug (e.g. `hello-platform`), or stop at harness-ready?
   - GUESS: stop at harness-ready (user runs `/spec` next)

Do **not** ask about CI hosting, deploy, or full application stack choice beyond the Vercel frontend skills above.

### Phase 2 — Confirm plan

Before any write, show a checklist and wait for explicit OK:

```
BOOTSTRAP PLAN
- Project name: …
- Layout: code-base | root
- code.backend: …
- code.frontend: …
- Placeholders: both code zones ensured for docs-lint (yes/no note)
- Sync agent-skills: yes | no
- Vercel React/UI skills: yes | no  # vercel-react-best-practices + web-design-guidelines
- Update README title: yes | no   # yes when project name set
- coding-standard: later | skip | vendor from <url-or-path>
- Starter spec: none | docs/specs/<slug>.md (stub only)
- Dirty tree: clean | will touch: README, harness.config.yaml, …
```

### Phase 3 — Execute

Run only what was approved. Prefer existing scripts. Stay at repo root.

1. **Layout**
   ```bash
   ./harness/scripts/agent/set-code-layout.sh code-base
   # or
   ./harness/scripts/agent/set-code-layout.sh root
   ```
   If custom paths differ from script defaults, edit `harness.config.yaml` `code.backend` / `code.frontend` afterward.  
   Do **not** invent new `layout` values — only `code-base` | `root`.
   If Vercel React/UI skills were approved, set `optional_skills.vercel_react_ui: true` in `harness.config.yaml` **after** this step (set-code-layout preserves the flag once set).

2. **Greenfield dirs** — when `layout: code-base`, ensure **both**:
   - `code-base/backend/.gitkeep`
   - `code-base/frontend/.gitkeep`  
   even if the team will only fill one side initially (docs-lint requirement).

3. **Brownfield** — do **not** move application code into `code-base/`. Leave existing trees in place. Ensure configured `code.*` paths exist or warn before lint.

4. **Sync** (if approved)
   ```bash
   ./harness/scripts/agent/sync-agent-skills.sh
   ```
   - Needs network; may take ~1–2 minutes
   - Overwrites `.cursor/skills|commands|agents|rules` then restores local skills/commands (including `/setup`)
   - On failure: stop, report stderr, do not pretend skills are complete
   - After success: count skill dirs under `.cursor/skills/` for handoff
   - If `optional_skills.vercel_react_ui: true`, sync already calls `install-optional-skills.sh` at the end

5. **Vercel React/UI skills** (if approved)
   - Ensure `harness.config.yaml` has:
     ```yaml
     optional_skills:
       vercel_react_ui: true
     ```
   - If sync was skipped or flag was just turned on, run:
     ```bash
     ./harness/scripts/agent/install-optional-skills.sh --force
     ```
   - Installs into `.cursor/skills/`:
     - `vercel-react-best-practices` ([React and Next.js](https://vercel.com/docs/agent-resources/skills#react-and-next.js))
     - `web-design-guidelines` ([Design and UI](https://vercel.com/docs/agent-resources/skills#design-and-ui))
   - Source: `vercel-labs/agent-skills` via `npx skills add` (needs network)
   - On failure: note in handoff; do not fail the whole bootstrap unless the user required these skills

6. **README** — if Update README title = yes: set H1 (and a short opening line if needed) to the project name; keep pointers to `AGENTS.md` and `harness/HARNESS-RUNBOOK.md`. Do not delete the zone table wholesale.

7. **Docs placeholders** — ensure:
   - `docs/specs/` (+ `.gitkeep` if empty aside from README)
   - `docs/exec-plans/active/`, `docs/exec-plans/completed/`
   - `docs/releases/`
   - `coding-standard/README.md` and `coding-standard/.gitkeep`

8. **Vendor coding-standard** (only if approved + source given)
   - Copy or subtree from the given source into `coding-standard/` without inventing content
   - Preserve or refresh `coding-standard/README.md` as an index if missing
   - If copy fails → leave placeholder and note in handoff

9. **Starter spec** (only if requested) — short stub `docs/specs/<slug>.md` with title + `TODO: run /spec to fill`. Do not fake full requirements.

10. **Verify**
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
- skills synced: yes (N skills under .cursor/skills/) | skipped | failed (summary)
- vercel react/ui skills: yes (vercel-react-best-practices, web-design-guidelines) | skipped | failed
- note: sync refreshes .cursor/; /setup remains via local-commands restore; optional Vercel skills re-applied when flag is true
- docs-lint: passed | failed (summary)
- coding-standard: placeholder | vendored from …
- Next: /spec → /plan → /build
- Ops guide: harness/HARNESS-RUNBOOK.md
- Agent map: AGENTS.md
```

If starter slug: remind to run `/spec` on `docs/specs/<slug>.md`.

Do **not** start implementing application features unless the user explicitly asks after handoff.

## Rules

- One interview question per turn until Phase 2
- Never commit or push unless the user asks
- Never delete existing application code
- Never write `SPEC.md` / `tasks/` at repo root
- Prefer Thai or English to match the user's language in the interview
- Prefer **later** for coding-standard over empty invented rules

## References

- `harness/HARNESS-RUNBOOK.md`
- `harness/knowledge/harness/adopt.md`
- `harness/scripts/agent/set-code-layout.sh`
- `harness/scripts/agent/sync-agent-skills.sh`
- `harness/scripts/agent/install-optional-skills.sh`
- https://vercel.com/docs/agent-resources/skills
- `coding-standard/README.md`
- `docs/README.md`
