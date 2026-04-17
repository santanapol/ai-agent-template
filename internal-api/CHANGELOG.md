# Changelog

## 0.1.1

- Hardening: `GATEWAY_SECRET` must be at least 32 characters (`src/config/env.js`).
- Docs: OpenAPI `info` links to [`docs/deploy-jwt-env-checklist.md`](../docs/deploy-jwt-env-checklist.md).

## 0.1.0

- Initial `internal-api`: `GET /health`, `GET /api/v1/me` protected by `x-gateway-secret` (constant-time compare), response envelope per team API response standard.
