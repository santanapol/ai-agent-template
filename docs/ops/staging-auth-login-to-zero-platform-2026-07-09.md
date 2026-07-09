# Staging — retire `auth_login` database (use `zero-platform`)

> **Human runs on staging MongoDB** — legacy DB name; codebase uses `zero-platform` only.

## Context

- SoT: [`backend/ENV.md`](../../backend/ENV.md) — staging/prod write DB = **`zero-platform`**
- Collections: `auth_users`, `auth_*`, `staff_profiles`, `platform_branches` (not `auth_login`)
- `backend/auth/.env.staging` already has `DATABASE_URI=.../zero-platform`

## Pre-check

```javascript
show dbs

// Legacy
use auth_login
db.getCollectionNames()
db.auth_users?.countDocuments()  // may not exist — old name was `users`

// Canonical
use zero-platform
db.getCollectionNames()
db.auth_users.countDocuments()
```

Also on staging server:

```bash
grep -h 'DATABASE_URI\|MONGODB_URI\|DB_NAME' backend/*/.env.staging backend/service/*/.env.staging \
  | grep -v '^#' | sort -u
# Must NOT contain auth_login; auth/staff write paths must show zero-platform
```

## Migrate (only if `auth_login` has data AND `zero-platform` is missing it)

Run per collection — **skip** if target already has rows.

```javascript
function copyIfEmpty(srcDb, tgtDb, coll) {
  const s = db.getSiblingDB(srcDb).getCollection(coll)
  const t = db.getSiblingDB(tgtDb).getCollection(coll)
  const srcN = s.countDocuments()
  const tgtN = t.countDocuments()
  print(coll + ': src=' + srcN + ' tgt=' + tgtN)
  if (srcN === 0) return
  if (tgtN > 0) {
    print('  SKIP — target not empty')
    return
  }
  const docs = s.find().toArray()
  if (docs.length) t.insertMany(docs)
  print('  COPIED ' + docs.length)
}

const COLS = [
  'auth_users', 'auth_refresh_tokens', 'auth_credential_throttle', 'auth_audit_events',
  'auth_menus', 'auth_role_permissions', 'platform_branches', 'staff_profiles'
]

for (const c of COLS) copyIfEmpty('auth_login', 'zero-platform', c)
```

**Old collection names** (pre-`auth_*` migration): if `auth_login` has `users` not `auth_users`:

```javascript
use auth_login
if (db.getCollectionNames().includes('users') && !db.getCollectionNames().includes('auth_users')) {
  db.users.aggregate([{ $match: {} }, { $out: { db: 'zero-platform', coll: 'auth_users' } }])
}
```

Re-run indexes on `zero-platform`:

```bash
cd /var/www/zero-platform
node --env-file=backend/auth/.env.staging backend/auth/scripts/init-db.mjs
node --env-file=backend/service/staff/.env.staging backend/service/staff/scripts/init-db.mjs
bash scripts/staging/staging-seed-all.sh   # idempotent — only if need fresh seed
```

## Drop legacy DB

```javascript
// After zero-platform verified
use zero-platform
db.auth_users.countDocuments()

use auth_login
db.dropDatabase()
```

## Post-check

```bash
bash scripts/staging/staging-verify-env.sh
SMOKE_PASSWORD='…' bash scripts/staging/smoke-staging.sh
```

```javascript
show dbs   // auth_login should be gone
use zero-platform
db.getCollectionInfos({ name: 'auth_users' })[0].options
```

## Rollback

Only if you copied but did not drop yet — `auth_login` still exists. Do not drop until smoke passes.
