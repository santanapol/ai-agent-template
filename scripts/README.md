# Scripts

Categorized by job:

```
scripts/
├── dev/        local harness — boot, seed, smoke, observability
├── staging/    staging server ops — deploy, setup, seed, verify
├── ci/         quality gates — package CI runner, docs-lint, env-status, db schema dump
├── release/    release tagging
└── agent/      agent-skills sync (Cursor + Claude Code) + standards map + local overrides
```

Old flat paths (`scripts/dev-up.sh`, etc.) no longer exist — this reorg has not shipped yet, so no shims were needed. Use `scripts/<category>/<name>` everywhere.

## Agent-skills (Cursor + Claude Code) — `scripts/agent/`

| Script / path | Role |
|---------------|------|
| [`sync-agent-skills.sh`](./agent/sync-agent-skills.sh) | Sync [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) into `.cursor/`, `.claude/`, and `references/` |
| [`agent-skills-standards/`](./agent/agent-skills-standards/) | **Related Coding Standards** per slash command — **you edit this** |

```bash
# After clone, or when upstream agent-skills releases updates:
./scripts/agent/sync-agent-skills.sh

# Optional: use a local clone instead of fetching:
./scripts/agent/sync-agent-skills.sh /path/to/agent-skills
```

**What sync overwrites:** `.cursor/skills/`, `.cursor/agents/`, `.cursor/commands/`, `.cursor/rules/`, `.cursor/VENDOR.md`, `.claude/skills/`, `.claude/agents/`, `.claude/commands/`, `.claude/VENDOR.md`, `references/` — then **restores** `scripts/agent/local-skills/` into both via `sync-local-agent-skills.sh`

**What sync never touches:** `scripts/agent/agent-skills-standards/`, `scripts/agent/local-skills/`, `scripts/agent/local-commands/`, `.claude/settings.local.json`, `coding-standard/`, `backend/`, `frontend/`

Both variants are vendored in-repo (not installed via `git clone`/plugin marketplace) so they stay self-contained, pinned to one upstream commit, and work offline/in CI — same reasoning as everything else vendored in this repo. `.claude/commands/*.md` keep upstream's native Claude Code format; the only rewrite is stripping the `agent-skills:` plugin-namespace prefix from skill references, since skills live unprefixed under `.claude/skills/<name>/`. `.cursor/commands/*.md` get the fuller rewrite Cursor needs (no Skill-invocation tool, so it must point at the file to read).

Edit standards in `agent-skills-standards/<command>.md`, then re-run sync to append them to both `.cursor/commands/` and `.claude/commands/`.

Local-only commands (`/gc`, `/release`) live in `scripts/agent/local-commands/` and are copied to both on sync.

Local-only skills (`release-notes-and-handoff`) live in `scripts/agent/local-skills/` — install with:

```bash
./scripts/agent/sync-local-agent-skills.sh   # or full ./scripts/agent/sync-agent-skills.sh
```

## Harness engineering (zero-platform)

| Script | Role |
|--------|------|
| [`RUNBOOK.md`](../RUNBOOK.md) | **Local ops hub** — boot, seed, smoke, CI (start here) |
| [`dev/dev-up.sh`](./dev/dev-up.sh) | Boot Mongo/Redis + auth/gateway/demo/staff/agent-invoice/smart-report/branch-report (`PORT_OFFSET`; `--with-frontend` adds backoffice-next; `--skip-seed` skips example data) |
| [`dev/dev-down.sh`](./dev/dev-down.sh) | Stop harness services (incl. frontend) |
| [`dev/dev-lib.sh`](./dev/dev-lib.sh) | Shared bash helpers (ports, env paths) — sourced by other `dev/` + `ci/` scripts |
| [`dev/seed-all.sh`](./dev/seed-all.sh) | Seed example data (uses `backend/*/.env.harness`; called by `dev-up` by default) |
| [`dev/verify-branch-report-seed.sh`](./dev/verify-branch-report-seed.sh) | Verify `gpp_777ww` branch-report seed (local Mongo counts; remote URI → skip; optional gateway curl) |
| [`dev/smoke.sh`](./dev/smoke.sh) | Healthz + metrics + login/gateway smoke (+ frontend when booted) |
| [`dev/dev-obs-up.sh`](./dev/dev-obs-up.sh) / [`dev/dev-obs-down.sh`](./dev/dev-obs-down.sh) | VictoriaLogs/Metrics + Vector |
| [`dev/dev-generate-env.mjs`](./dev/dev-generate-env.mjs) | Generate per-offset harness env files |
| [`staging/setup-staging.sh`](./staging/setup-staging.sh) | **Staging first-time setup** — Docker, seed, build, PM2 ([RUNBOOK](../dev-ops/staging/RUNBOOK.md)) |
| [`staging/deploy-staging.sh`](./staging/deploy-staging.sh) | Staging re-deploy after `git pull` |
| [`staging/smoke-staging.sh`](./staging/smoke-staging.sh) | **จาก local** — smoke HTTPS หลัง deploy (`SMOKE_PASSWORD` required) |
| [`staging/staging-init-env.sh`](./staging/staging-init-env.sh) | Copy `.env.example` → `.env.staging` (skip existing) |
| [`staging/staging-seed-all.sh`](./staging/staging-seed-all.sh) | DB init + seed on staging (`.env.staging`) |
| [`staging/staging-verify-env.sh`](./staging/staging-verify-env.sh) | ตรวจ env vars ที่จำเป็นก่อน deploy |
| [`staging/staging-verify-seed.sh`](./staging/staging-verify-seed.sh) | ตรวจ indexes + document counts หลัง seed |
| [`staging/ensure-staging-swap.sh`](./staging/ensure-staging-swap.sh) | สร้าง swapfile บน droplet เล็กก่อน `npm ci`/`next build` |
| [`ci/ci-all.sh`](./ci/ci-all.sh) | Package CI for all services + docs + smoke (`--skip-install`, `--skip-smoke`, `--with-frontend`, `--low-resource`, `--only`) |
| [`ci/low-resource-env.sh`](./ci/low-resource-env.sh) | Shared CPU/RAM caps for 2 vCPU / 2GB hosts (auto-detected by `ci-all` + `deploy-staging`) |
| [`ci/docs-lint.mjs`](./ci/docs-lint.mjs) | Validate knowledge base (CI) |
| [`ci/env-status.mjs`](./ci/env-status.mjs) | แสดงว่ามี `.env` / `.env.prod` / harness ไฟล์ไหนบ้าง — ดู [backend/ENV.md](../backend/ENV.md) |
| [`ci/check-coding-standard-sync.sh`](./ci/check-coding-standard-sync.sh) | Diff vendored `coding-standard/` vs org upstream |
| [`ci/generate-db-schema.mjs`](./ci/generate-db-schema.mjs) | Dump harness Mongo schema → `docs/generated/db-schema/` |
| [`ops/dump-db-schema.mjs`](./ops/dump-db-schema.mjs) | Read-only prod schema → `docs/audit/prod-schema-baseline-*` |
| [`ops/verify-indexes.mjs`](./ops/verify-indexes.mjs) | Compare live DB indexes to prod baseline (read-only) |
| [`ops/apply-collection-validators.mjs`](./ops/apply-collection-validators.mjs) | Apply `$jsonSchema` validators (`--staging`, `--prod-all`; prod needs `MONGODB_ADMIN_URI`) |
| [`ops/verify-validators.mjs`](./ops/verify-validators.mjs) | Compare live validators to registry and/or prod baseline (`--harness`, `--staging`, `--baseline`) |
| [`ops/schema-verify-targets.mjs`](./ops/schema-verify-targets.mjs) | Shared env targets for apply + verify scripts |
| [`dev/verify-harness-schema.sh`](./dev/verify-harness-schema.sh) | Harness gate: validators + indexes after seed |
| [`staging/verify-staging-schema.sh`](./staging/verify-staging-schema.sh) | Staging validator gate after seed |
| [`release/release-tag.sh`](./release/release-tag.sh) | Tag a release after staging smoke passes |

See [AGENTS.md](../AGENTS.md), [knowledge/harness/README.md](../knowledge/harness/README.md), and [docs/golden-principles.md](../docs/golden-principles.md).

## Domain coding standards (org)

`coding-standard/` is vendored separately from agent-skills. See [`coding-standard/README.md`](../coding-standard/README.md) for syncing from the org standards repo.

## Backend helpers

| Script | Role |
|--------|------|
| [`backend/scripts/install-all-deps.sh`](../backend/scripts/install-all-deps.sh) | `npm ci` across backend packages |
