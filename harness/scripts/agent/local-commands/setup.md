---
name: setup
description: First-boot interview + harness setup after cloning ai-agent-template — layout, sync, docs-lint
disable-model-invocation: true
---

Read and follow **harness-bootstrap** (`.cursor/skills/harness-bootstrap/SKILL.md`) completely.

This command is for **one-time setup** after the template is cloned, forked, or overlaid onto a target repo — not for day-to-day feature work.

## Flow

1. Detect current repo state (`harness.config.yaml`, existing app dirs, dirty tree).
2. Interview one question at a time (layout, project name, code paths, sync, coding-standard, optional starter spec).
3. Confirm the bootstrap plan; wait for explicit OK.
4. Execute: `set-code-layout.sh` → optional `sync-agent-skills.sh` → README/docs placeholders → `node harness/scripts/ci/docs-lint.mjs`.
5. Hand off with next steps: `/spec` → `/plan` → `/build`.

## Do not

- Start building features in this command
- Move brownfield code into `code-base/`
- Commit or push unless the user asks

Guide: `harness/HARNESS-RUNBOOK.md` · Layouts: `harness/knowledge/harness/adopt.md`
