# Scripts

```
scripts/
├── agent/   agent-skills sync (Cursor) + standards map + local overrides
└── ci/      docs-lint
```

## Agent-skills (Cursor) — `scripts/agent/`

| Script / path | Role |
|---------------|------|
| [`sync-agent-skills.sh`](./agent/sync-agent-skills.sh) | Sync [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) into `.cursor/` and `references/` |
| [`sync-local-agent-skills.sh`](./agent/sync-local-agent-skills.sh) | Copy `local-skills/` → `.cursor/skills/` |
| [`agent-skills-standards/`](./agent/agent-skills-standards/) | **Related Coding Standards** per slash command — **you edit this** |

```bash
./scripts/agent/sync-agent-skills.sh
```

**What sync overwrites:** `.cursor/skills/`, `.cursor/agents/`, `.cursor/commands/`, `.cursor/rules/`, `.cursor/VENDOR.md`, `references/` — then **restores** `scripts/agent/local-skills/` via `sync-local-agent-skills.sh`

**What sync never touches:** `scripts/agent/agent-skills-standards/`, `scripts/agent/local-skills/`, `scripts/agent/local-commands/`, `code-base/`, `docs/`, `coding-standard/`

Local-only commands (`/gc`, `/release`) live in `scripts/agent/local-commands/` and are copied to `.cursor/commands/` on sync.

## CI — `scripts/ci/`

| Script | Role |
|--------|------|
| [`docs-lint.mjs`](./ci/docs-lint.mjs) | Validate skeleton structure + link integrity |

See [AGENTS.md](../AGENTS.md) and [knowledge/harness/README.md](../knowledge/harness/README.md).

## Domain coding standards (org)

`coding-standard/` starts empty in this template — vendor your org standards after fork.
