# Design — Password management (auth SoT)

**Status:** **Implemented** (Phase 0 — 2026-05-26)  
**Cross-package design:** [staff business-domain §3.5 Password rules](../staff/business-domain.md#35-password-rules-business--normative)  
**Last updated:** 2026-05-26

---

## 1. Role of auth

| Responsibility                                | Owner                                           |
| :-------------------------------------------- | :---------------------------------------------- |
| Store `password_hash` (Argon2id)              | **auth**                                        |
| Verify `current_password` (self-service)      | **auth**                                        |
| Issue / revoke sessions after password change | **auth** (`access_token_gen`, refresh revoke)   |
| RBAC for admin reset                          | **staff** (orchestration) → calls auth internal |

**[Forbidden]** staff service hashing or persisting passwords.

---

## 2. HTTP operations (auth package)

| Method | Path                                        | Caller                     | Status                                         |
| :----- | :------------------------------------------ | :------------------------- | :--------------------------------------------- |
| `POST` | `/internal/users`                           | staff (service secret)     | **Implemented** — document in OpenAPI (resync) |
| `POST` | `/internal/users/{user_id}/password`        | staff (service secret)     | **Implemented**                                |
| `POST` | `/auth/me/password`                         | Browser / app (Bearer JWT) | **Implemented**                                |
| `POST` | `/internal/users/{user_id}/sessions/revoke` | staff                      | **Implemented**                                |

Gateway: client calls **`POST /auth/me/password`** via existing `/auth` → auth upstream ([`gateway/routes.json`](../../../../backend/gateway/routes.json)).

---

## 3. `POST /auth/me/password` (self-service)

**Auth:** `Authorization: Bearer <access_token>` — `sub` = target user.

**Body:**

```json
{
  "current_password": "OldSecurePass1234!",
  "new_password": "NewSecurePass1234!"
}
```

| Rule            | Detail                                                                      |
| :-------------- | :-------------------------------------------------------------------------- |
| Policy          | `new_password` min **8**, max **256** + complexity (upper+lower+digit+special) — ตาม `auth.validator.js` / OpenAPI schema |
| Current wrong   | `401` `LOGIN_INVALID_CREDENTIALS` (generic detail)                          |
| Same as current | `400` `AUTH_PASSWORD_UNCHANGED` (register in org `codes.yaml` at implement) |
| Success         | `204`; bump `access_token_gen`; revoke refresh family                       |
| Rate limit      | ≤ **10**/min per IP (recommended, separate bucket from login)               |

**Audit:** `auth.password_changed` (success/fail without password in payload).

---

## 4. `POST /internal/users/{user_id}/password` (admin reset)

**Auth:** `Authorization: Bearer <AUTH_INTERNAL_SERVICE_SECRET>`

**Body:**

```json
{
  "password": "NewSecurePass1234!",
  "revoke_sessions": true,
  "reason": "staff.admin_password_reset",
  "correlation_id": "<request-id>"
}
```

| Field             | Default | Notes                                         |
| :---------------- | :------ | :-------------------------------------------- |
| `revoke_sessions` | `true`  | After hash update → revoke + `token_gen` bump |

**Responses:** `204` on success; `404` `AUTH_USER_NOT_FOUND`; `400` validation.

**Audit:** `auth.password_reset_by_service`.

---

## 5. `POST /internal/users` (provision — existing)

Used by staff on create when `user_id` omitted. Body includes **`password`** (required, min **8**, complexity ตาม `internal.validator.js`).

Document fully in [openapi.yaml](../../../../backend/auth/openapi.yaml) — see [technical-architecture.md §4.5](./technical-architecture.md#45-internal-api--provision-user-staff-caller).

---

## 6. Session impact (normative)

After **any** successful password change (self or internal reset):

1. Persist new `password_hash`
2. **`$inc` `access_token_gen`** on `auth_users`
3. Revoke active refresh tokens (same semantics as session revoke)
4. Sync Redis `user:{sub}:token_gen` via `SET` when `REDIS_URL` set (fail-closed `503` if write fails — align O-16)

---

## 7. Error codes (registered)

Registered in [`coding-standard/auth/codes.yaml`](../../../../../../coding-standard/auth/codes.yaml):

| `code`                           | HTTP |
| :------------------------------- | :--- |
| `AUTH_PASSWORD_UNCHANGED`        | 400  |
| `AUTH_PASSWORD_POLICY_VIOLATION` | 400  |

Reuse `LOGIN_INVALID_CREDENTIALS`, `AUTH_USER_NOT_FOUND`, `AUTH_INVALID_REQUEST`, `AUTH_NOT_READY`.

---

## 8. Related documents

- [business-domain.md](./business-domain.md) — business scope + HTTP intent index
- [technical-architecture.md](./technical-architecture.md) — normative API sections
- [session-revoke-token-gen-changes.md](./session-revoke-token-gen-changes.md) — `token_gen` + revoke
- [staff business-domain](../staff/business-domain.md) — staff orchestration
