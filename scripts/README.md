# Scripts

## Agent-skills (Cursor)

| Script / path | Role |
|---------------|------|
| [`sync-agent-skills.sh`](./sync-agent-skills.sh) | Sync [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) into `.cursor/` and `references/` |
| [`agent-skills-standards/`](./agent-skills-standards/) | **Related Coding Standards** per slash command — **you edit this** |

```bash
# After clone, or when upstream agent-skills releases updates:
./scripts/sync-agent-skills.sh

# Optional: use a local clone instead of fetching:
./scripts/sync-agent-skills.sh /path/to/agent-skills
```

**What sync overwrites:** `.cursor/skills/`, `.cursor/agents/`, `.cursor/commands/`, `.cursor/rules/`, `references/`, `.cursor/VENDOR.md`

**What sync never touches:** `scripts/agent-skills-standards/`, `coding-standard/`, `backend/`, `frontend/`

Edit standards in `agent-skills-standards/<command>.md`, then re-run sync to append them to `.cursor/commands/`.

## Domain coding standards (org)

`coding-standard/` is vendored separately from agent-skills. See [`coding-standard/README.md`](../coding-standard/README.md) for syncing from the org standards repo.

## Backend helpers

| Script | Role |
|--------|------|
| [`backend/scripts/install-all-deps.sh`](../backend/scripts/install-all-deps.sh) | `npm ci` across backend packages |
