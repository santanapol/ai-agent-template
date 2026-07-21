# Harness

Agent harness for **ai-agent-template** — everything except product docs (`docs/`), application code, and root entry files.

```
harness/
├── HARNESS-RUNBOOK.md   # harness ops (not project runbook)
├── knowledge/           # beliefs, workflows, adoption
├── references/          # checklists (synced from upstream)
└── scripts/
    ├── agent/           # sync, local skills/commands, standards
    └── ci/              # docs-lint
```

Root keeps: `README.md`, `AGENTS.md`, `harness.config.yaml`, `.cursor/` (Cursor runtime), `docs/`, `code-base/` or app at root.

## Agent-skills (Cursor) — `scripts/agent/`

| Script / path | Role |
|---------------|------|
| [`sync-agent-skills.sh`](./scripts/agent/sync-agent-skills.sh) | Sync [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) into `.cursor/` and `harness/references/` |
| [`sync-local-agent-skills.sh`](./scripts/agent/sync-local-agent-skills.sh) | Copy `local-skills/` → `.cursor/skills/` |
| [`set-code-layout.sh`](./scripts/agent/set-code-layout.sh) | Switch `harness.config.yaml` between `code-base` and `root` |
| [`agent-skills-standards/`](./scripts/agent/agent-skills-standards/) | **Related Coding Standards** per slash command — **you edit this** |

```bash
./harness/scripts/agent/sync-agent-skills.sh
```

**What sync overwrites:** `.cursor/skills/`, `.cursor/agents/`, `.cursor/commands/`, `.cursor/rules/`, `.cursor/VENDOR.md`, `harness/references/` — then **restores** `local-skills/` via `sync-local-agent-skills.sh`

**What sync never touches:** `agent-skills-standards/`, `local-skills/`, `local-commands/`, `code-base/`, `docs/`, `coding-standard/`

Local-only commands (`/spec`, `/gc`, `/release`, `/plan`, `/build`) live in `scripts/agent/local-commands/` and are copied to `.cursor/commands/` on sync.

## CI — `scripts/ci/`

| Script | Role |
|--------|------|
| [`docs-lint.mjs`](./scripts/ci/docs-lint.mjs) | Validate skeleton structure + link integrity |

See [AGENTS.md](../AGENTS.md) and [harness/knowledge/harness/README.md](./knowledge/harness/README.md).
