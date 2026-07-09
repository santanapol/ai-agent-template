# staff_profiles — prod validator readiness audit

> Read-only audit against `PROFILE_JSON_SCHEMA` in `backend/service/staff/scripts/init-db.mjs`  
> Date: 2026-07-09 · Database: `zero-platform`

## Summary

| Check | Result |
|-------|--------|
| Documents | **9** |
| MongoDB `$jsonSchema` on collection | **no** |
| Required fields missing | **0** |
| Type / enum / length violations | **0** |
| Duplicate `user_id` | **0** |
| Duplicate `(ou_id, branch_id, code)` | **0** |
| Orphan `user_id` (no `auth_users`) | **0** |
| **Verdict** | **SAFE_TO_ENABLE_MODERATE** |

## Rollout

| Environment | Status |
|-------------|--------|
| Staging | **Applied** 2026-07-09 |
| Prod | pending |

## Status breakdown

| status | count |
|--------|------:|
| active | 9 |

## Field presence

All 9 documents have exactly the 16 expected fields (+ `_id`):  
`user_id`, `ou_id`, `branch_id`, `status`, `code`, `firstname`, `lastname`, `email`, `tel`, `cr_by`, `cr_date`, `cr_prog`, `upd_by`, `upd_date`, `upd_prog`.

## Notes

- **2 documents** have `tel: ""` (empty string) — **valid** under current schema (`string`, `maxLength: 16`, no `minLength`).
- Indexes match prod baseline (`uniq_user_id`, `uniq_ou_branch_code`, list indexes).

## Recommended next step (human on prod/staging)

Enable `validationLevel: "moderate"` — same as harness `init-db.mjs`:

```javascript
use zero-platform

db.runCommand({
  collMod: "staff_profiles",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "user_id", "ou_id", "branch_id", "status", "code",
        "firstname", "lastname", "email", "tel",
        "cr_by", "cr_date", "cr_prog", "upd_by", "upd_date", "upd_prog"
      ],
      properties: {
        status: { enum: ["active", "archived"] },
        code: { bsonType: "string", minLength: 1, maxLength: 32 },
        firstname: { bsonType: "string", minLength: 1, maxLength: 128 },
        lastname: { bsonType: "string", minLength: 1, maxLength: 128 },
        email: { bsonType: "string", maxLength: 254 },
        tel: { bsonType: "string", maxLength: 16 }
      }
    }
  },
  validationLevel: "moderate"
})
```

Or on harness/staging: `node --env-file=backend/service/staff/.env.prod backend/service/staff/scripts/init-db.mjs` (idempotent indexes + collMod).

**Order:** staging first → verify writes → prod.

## Out of scope

- Does not re-audit on every deploy — re-run if bulk migration or legacy import occurs.
- `strict` validation not recommended until ongoing write path proven under `moderate`.
