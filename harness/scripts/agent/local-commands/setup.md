---
name: setup
description: First-boot interview + harness setup after cloning ai-agent-template — layout, sync, docs-lint
disable-model-invocation: true
---

Read and follow **harness-bootstrap** (`.cursor/skills/harness-bootstrap/SKILL.md`) completely.

This command is for **one-time setup** after the template is cloned, forked, or overlaid onto a target repo — not for day-to-day feature work.

## Flow

1. **Preconditions** — repo root, Node.js, harness scripts; pre-sync if `harness-bootstrap` skill is missing.
2. **Detect** — `harness.config.yaml`, app dirs, dirty tree, already-bootstrapped signals.
3. **Interview** one question at a time (layout, project name → README title, code paths, sync, coding-standard source or later, optional starter spec).
4. **Confirm** the bootstrap plan; wait for explicit OK.
5. **Execute** — `set-code-layout.sh` → ensure code-zone placeholders → optional `sync-agent-skills.sh` (full skills install) → README/docs → optional vendor `coding-standard/` → `node harness/scripts/ci/docs-lint.mjs`.
6. **Hand off** — include `skills synced: yes (N) | skipped | failed` and next steps `/spec` → `/plan` → `/build`.

## Do not

- Start building features in this command
- Move brownfield code into `code-base/`
- Invent coding-standard content without a user-provided source
- Commit or push unless the user asks

Guide: `harness/HARNESS-RUNBOOK.md` · Layouts: `harness/knowledge/harness/adopt.md`
