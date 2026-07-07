# Generated database schema

> Generated from `mongodb://127.0.0.1:27017/auth_login_0` — do not edit by hand.

Generated: 2026-07-06

## auth_audit_events

- `{"_id":1}`
- `{"request_id":1}`
- `{"retention_until":1}`

## auth_credential_throttle

- `{"_id":1}`
- `{"throttle_key":1}` (unique)

## auth_refresh_tokens

- `{"_id":1}`
- `{"token_hash":1}` (unique)
- `{"user_id":1,"revoked_at":1,"expires_at":1}`
- `{"family_id":1}`
- `{"expires_at":1}`

## auth_users

- `{"_id":1}`
- `{"username":1}` (unique)
- `{"ou_id":1,"branch_id":1}`
- `{"ou_id":1,"role":1}`

## platform_branches

- `{"_id":1}`
- `{"ou_id":1,"branch_code":1}` (unique)
- `{"ou_id":1,"active":1}`

## staff_profiles

- `{"_id":1}`
