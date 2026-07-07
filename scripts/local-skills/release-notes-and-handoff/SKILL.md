---
name: release-notes-and-handoff
description: After ship GO — write user and deploy release notes in docs/releases, get human confirmation, docs-lint, commit, and open or update a PR. Use when handoff docs are needed before merge. Does not re-run full CI (/ship already did).
---

# Release Notes and Handoff

## Overview

Bridge between **quality gate** (`/ship` GO) and **merge/deploy**. Produce two audience-specific release notes in `docs/releases/`, get human approval, validate docs, then commit and open or update a PR.

**Does not replace** `shipping-and-launch` (pre-merge GO) or production deploy. **Does not** auto-deploy. **Does not re-run** `./scripts/ci-all.sh` — `/ship` already verified code; this phase only adds documentation handoff.

## When to Use

- After `/ship` returns **GO** on a meaningful change set
- Before opening (or finalizing) a PR that will merge to `main` and trigger deploy
- When ops or users need written handoff (env changes, new endpoints, breaking config)

## When to Skip

- Tiny fixes (≤2 files, <50 lines, no auth/env/deploy impact) — PR description is enough
- `/ship` returned **NO-GO** — fix findings first
- Docs-only typo — no deploy note needed

## Prerequisites

- `/ship` **GO** (or explicit user waiver with documented risk)
- Code already passed `/ship` harness (`ci-all`, smoke, docs-lint as applicable)
- Working tree reflects the change set to ship
- No secrets in tracked files (`.env`, `.env.harness`, `.env.prod` stay gitignored)

## Related skills (read sections, do not duplicate)

| Skill | Use for |
|-------|---------|
| `shipping-and-launch` | Deploy checklist, rollback, monitoring → **deploy note** |
| `git-workflow-and-versioning` | Atomic commits, message format, PR size |
| `documentation-and-adrs` | Architectural decisions → link ADR in deploy note |

## Ops references (for deploy note)

| Doc | Use for |
|-----|---------|
| [backend/ENV.md](../../../backend/ENV.md) | Env naming, `.env.prod` |
| [backend/RUNBOOK.md](../../../backend/RUNBOOK.md) | Post-deploy smoke, ops |
| [DEPLOY_DIGITALOCEAN.md](../../../DEPLOY_DIGITALOCEAN.md) | CI/CD, server setup |
| [backend/ecosystem.config.js](../../../backend/ecosystem.config.js) | PM2 app names for `pm2 restart` |

---

## Phase 1 — Gather context

1. `git status` and `git diff` (staged + unstaged) vs default branch
2. Active exec plan in `docs/exec-plans/active/` if any
3. Touched services — list for deploy note
4. `backend/ENV.md` when env names or harness changed
5. Check whether a PR already exists for the current branch (`gh pr view` or ask user)

---

## Phase 2 — Write two release notes

Create **both** files under `docs/releases/`:

```
docs/releases/YYYY-MM-DD-user.md
docs/releases/YYYY-MM-DD-deploy.md
```

Use today's date (or agreed release date). If a pair already exists for that date, use the next suffix on the **stem**:

```
docs/releases/YYYY-MM-DD-user-2.md
docs/releases/YYYY-MM-DD-deploy-2.md
```

### User release note (`*-user.md`)

**Audience:** end users, support, PM — plain language, no secrets, no internal hostnames.

```markdown
# Release — YYYY-MM-DD

## สรุป
1–2 ประโยค

## สิ่งที่ใหม่
- ...

## สิ่งที่เปลี่ยน
- ...

## สิ่งที่แก้ไข
- ...

## ผู้ใช้ต้องทำอะไร
- ไม่ต้องทำ / หรือขั้นตอนสั้น ๆ
```

### Deploy release note (`*-deploy.md`)

**Audience:** developers, ops — actionable before/during/after merge.

```markdown
# Deploy — YYYY-MM-DD

## สรุป
1–2 ประโยค technical scope

## Services ที่กระทบ
- auth, gateway, ...

## ก่อน merge / deploy
- [ ] อัปเดต `backend/<service>/.env.prod` — ระบุ key (ไม่ใส่ค่า secret)
- [ ] ...

## หลัง deploy
- [ ] `pm2 restart <apps>` — ดูชื่อ app ใน ecosystem.config.js
- [ ] Smoke: ...
- [ ] ตรวจ monitoring / logs

## Breaking / migration
- ชื่อ env เปลี่ยน, API เปลี่ยน, ลำดับ restart

## Rollback
- Revert PR / tag ก่อนหน้า
- คืนค่า `.env.prod` จาก backup

## ไม่กระทบ production
- เปลี่ยนเฉพาะ harness / local dev
```

**Rules:**

- Never paste passwords, connection strings, tokens, or database usernames
- Reference `backend/ENV.md` for env naming
- Pull deploy checklist items from `shipping-and-launch` pre-launch sections
- Use PM2 app names from `backend/ecosystem.config.js` in restart steps

---

## Phase 3 — Human confirmation (required)

Present both notes to the user. **Stop** until they approve or request edits.

Do not commit or update PR until approved.

---

## Phase 4 — Docs validation (not full CI)

`/ship` already ran `./scripts/ci-all.sh` (and smoke/docs-lint as required). **Do not re-run ci-all** unless code changed after ship GO.

After approval, validate only the new release docs:

```bash
node scripts/docs-lint.mjs
```

If docs-lint fails → fix, re-run. If you changed code after `/ship` → stop and re-run `/ship` before continuing.

---

## Phase 5 — Commit and PR

Follow `git-workflow-and-versioning`.

### Staging

**Never** `git add .` for mixed sessions. Exclude secrets and local env.

| Situation | What to stage |
|-----------|----------------|
| Code **already committed** on branch | `docs/releases/YYYY-MM-DD-*.md` only (+ exec-plan moves in Phase 6) |
| Code **still uncommitted** | Intended code files + release notes — **named paths only** |

Prefer separate commits: code first (if needed), then `docs(release): …` for notes.

### Commit message (release notes)

```
docs(release): add 2026-07-07 user and deploy handoff notes

Captures handoff after ship GO for auth branches and env harness work.
```

### PR — open or update

| Situation | Action |
|-----------|--------|
| **No PR yet** | `git push -u origin HEAD` then `gh pr create` |
| **PR exists** | Push commits; update PR description — **do not** open a second PR |

PR body template:

```markdown
## Summary
- (2–4 bullets)

## Release notes
- User: docs/releases/YYYY-MM-DD-user.md
- Deploy: docs/releases/YYYY-MM-DD-deploy.md

## Test plan
- [x] Verified by `/ship` (ci-all + smoke/docs-lint)
- [ ] node scripts/docs-lint.mjs (release notes)
```

**After merge:** user note → notify users/support; deploy note → ops runbook for that deploy.

---

## Phase 6 — Close exec plan (if applicable)

If work tracked an active plan:

1. Move `docs/exec-plans/active/<plan>.md` → `docs/exec-plans/completed/`
2. Update front-matter `status: completed`
3. Add any remaining debt to `docs/exec-plans/tech-debt-tracker.md`

Commit with release notes or immediately after.

---

## Red flags

- Writing release notes before `/ship` GO (scope may change)
- Re-running `ci-all.sh` here without re-running `/ship` after code changes
- Single combined note for users and ops (audiences blur)
- Committing `.env*` with secrets
- Skipping human confirmation
- Opening a duplicate PR when one already exists
- PR body duplicating entire deploy note instead of linking docs

## Verification checklist

- [ ] Two files in `docs/releases/` with correct date (and `-2` suffix if needed)
- [ ] User note has no secrets or internal-only detail
- [ ] Deploy note has checklist, rollback, services list, PM2 app names
- [ ] Human approved
- [ ] `node scripts/docs-lint.mjs` pass
- [ ] PR links both notes (created or updated)
- [ ] Exec plan moved to `completed/` if applicable
