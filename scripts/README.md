# Scripts

## Agent-skills (Cursor + Claude Code)

| Script / path | Role |
|---------------|------|
| [`sync-agent-skills.sh`](./sync-agent-skills.sh) | Sync [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) into `.cursor/`, `.claude/`, and `references/` |
| [`agent-skills-standards/`](./agent-skills-standards/) | **Related Coding Standards** per slash command — **you edit this** |

```bash
# After clone, or when upstream agent-skills releases updates:
./scripts/sync-agent-skills.sh

# Optional: use a local clone instead of fetching:
./scripts/sync-agent-skills.sh /path/to/agent-skills
```

**What sync overwrites:** `.cursor/skills/`, `.cursor/agents/`, `.cursor/commands/`, `.cursor/rules/`, `.cursor/VENDOR.md`, `.claude/skills/`, `.claude/agents/`, `.claude/commands/`, `.claude/VENDOR.md`, `references/` — then **restores** `scripts/local-skills/` into both via `sync-local-agent-skills.sh`

**What sync never touches:** `scripts/agent-skills-standards/`, `scripts/local-skills/`, `scripts/local-commands/`, `.claude/settings.local.json`, `coding-standard/`, `backend/`, `frontend/`

Both variants are vendored in-repo (not installed via `git clone`/plugin marketplace) so they stay self-contained, pinned to one upstream commit, and work offline/in CI — same reasoning as everything else vendored in this repo. `.claude/commands/*.md` keep upstream's native Claude Code format; the only rewrite is stripping the `agent-skills:` plugin-namespace prefix from skill references, since skills live unprefixed under `.claude/skills/<name>/`. `.cursor/commands/*.md` get the fuller rewrite Cursor needs (no Skill-invocation tool, so it must point at the file to read).

Edit standards in `agent-skills-standards/<command>.md`, then re-run sync to append them to both `.cursor/commands/` and `.claude/commands/`.

Local-only commands (`/gc`, `/release`) live in `scripts/local-commands/` and are copied to both on sync.

Local-only skills (`release-notes-and-handoff`) live in `scripts/local-skills/` — install with:

```bash
./scripts/sync-local-agent-skills.sh   # or full ./scripts/sync-agent-skills.sh
```

## Harness engineering (zero-platform)

| Script | Role |
|--------|------|
| [`RUNBOOK.md`](../RUNBOOK.md) | **Local ops hub** — boot, seed, smoke, CI (start here) |
| [`dev-up.sh`](./dev-up.sh) | Boot Mongo/Redis + auth/gateway/demo/staff/agent-invoice/smart-report/branch-report (`PORT_OFFSET`; `--with-frontend` adds backoffice Vite; `--skip-seed` skips example data) |
| [`env-status.mjs`](./env-status.mjs) | แสดงว่ามี `.env` / `.env.prod` / harness ไฟล์ไหนบ้าง — ดู [backend/ENV.md](../backend/ENV.md) |
| [`seed-all.sh`](./seed-all.sh) | Seed example data (uses `backend/*/.env.harness`; called by `dev-up` by default) |
| [`setup-staging.sh`](./setup-staging.sh) | **Staging first-time setup** — Docker, seed, build, PM2 ([RUNBOOK](../server-environment/staging/RUNBOOK.md)) |
| [`deploy-staging.sh`](./deploy-staging.sh) | Staging re-deploy after `git pull` |
| [`smoke-staging.sh`](./smoke-staging.sh) | **จาก local** — smoke HTTPS หลัง deploy (`SMOKE_PASSWORD` required) |
| [`staging-init-env.sh`](./staging-init-env.sh) | Copy `.env.example` → `.env.staging` (skip existing) |
| [`staging-seed-all.sh`](./staging-seed-all.sh) | DB init + seed on staging (`.env.staging`) |
| [`staging-verify-seed.sh`](./staging-verify-seed.sh) | ตรวจ indexes + document counts หลัง seed |
| [`dev-down.sh`](./dev-down.sh) | Stop harness services (incl. frontend) |
| [`smoke.sh`](./smoke.sh) | Healthz + metrics + login/gateway smoke (+ frontend when booted) |
| [`ci-all.sh`](./ci-all.sh) | Package CI for all services + docs + smoke (`--skip-install`, `--skip-smoke`, `--with-frontend`, `--only`) |
| [`dev-obs-up.sh`](./dev-obs-up.sh) / [`dev-obs-down.sh`](./dev-obs-down.sh) | VictoriaLogs/Metrics + Vector |
| [`docs-lint.mjs`](./docs-lint.mjs) | Validate knowledge base (CI) |
| [`check-coding-standard-sync.sh`](./check-coding-standard-sync.sh) | Diff vendored `coding-standard/` vs org upstream |
| [`generate-db-schema.mjs`](./generate-db-schema.mjs) | Dump Mongo schema → `docs/generated/` |

See [AGENTS.md](../AGENTS.md), [harness-engineering/README.md](../harness-engineering/README.md), and [docs/golden-principles.md](../docs/golden-principles.md).

## Domain coding standards (org)

`coding-standard/` is vendored separately from agent-skills. See [`coding-standard/README.md`](../coding-standard/README.md) for syncing from the org standards repo.

## Backend helpers

| Script | Role |
|--------|------|
| [`backend/scripts/install-all-deps.sh`](../backend/scripts/install-all-deps.sh) | `npm ci` across backend packages |
