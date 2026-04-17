# Changelog

## 0.1.1

- Hardening: `GATEWAY_SECRET` must be at least 32 characters (`src/config/env.js`).
- Security: default error handler no longer forwards raw `Error` objects to clients for non-proxy failures; server logs full error only (`src/app.js`).
- Observability: on JWT verify failure, log at `debug` with `jwtVerifyFailedCode` (no token / no PII) (`src/plugins/jwt-auth.js`).
- Docs: deploy JWT/env checklist at `../docs/deploy-jwt-env-checklist.md`; OpenAPI description links to it.

## 0.1.0

- Initial `gateway-service` implementation aligned with `gateway-design.md` (JWKS verify, header contract, prefix proxy routes, `/health`, graceful shutdown).
- Minimal `docs/openapi.yaml` (`GET /health`, SoT links, Bearer JWT described for proxied routes).
