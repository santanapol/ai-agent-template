# gateway — Database / persistence

## MongoDB

**N/A** — gateway is stateless; no application MongoDB collections.

## Redis (session invalidation contract)

Gateway reads **only** auth-published keys for JWT gate — does not write.

| Key pattern | Type | Writer | Reader | Semantics |
|-------------|------|--------|--------|-----------|
| `user:{sub}:token_gen` | integer string | **auth** | **gateway** `jwt-auth.js` | Monotonic generation; JWT claim must be ≥ stored value |

**OBSERVED** `src/lib/redis-token-gen.js`:

```text
accessTokenGenRedisKey(subHex) → `user:${subHex}:token_gen`
```

| Environment | Behavior |
|-------------|----------|
| `REDIS_URL` set | Compare JWT `token_gen`; `rejectIfMissing: true` on protected routes |
| `REDIS_URL` empty | Skip Redis check (dev/CI backward compat) |
| Redis error | Fail-closed `GATEWAY_JWT_REJECTED` |

## Other state

- JWKS cache in-memory (jose)
- No persistent route config — loaded from env/file at startup
