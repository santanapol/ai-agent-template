# OWASP ZAP baseline — gateway manual runbook

**Date:** 2026-07-09  
**Target:** Gateway mesh `http://127.0.0.1:3000` (offset 0)  
**Status:** Manual procedure documented — optional DAST, **not** a required CI gate

This artifact records how to run an OWASP ZAP baseline scan against the local harness stack after obtaining an authenticated session. It supersedes the deferred ZAP row from the 2026-07-08 backend review (Appendix E) without editing archived findings — operators follow this doc and append run results below when a scan completes.

---

## Scope

| In scope | Out of scope |
|----------|--------------|
| Gateway `:3000` business routes (`/api/v1/*`, `/auth/*` proxied paths) | Direct upstream ports (`:3001`–`:3104`) — trust boundary is gateway |
| Authenticated crawl/spider with Bearer JWT | Production / staging hosts |
| Baseline passive + active rules (ZAP default) | Required PR CI gate (noise not controlled yet) |

---

## Prerequisites

1. **Stack running** — harness boot + seed (see [RUNBOOK.md](../../RUNBOOK.md)).
2. **Docker** — for official ZAP image (`ghcr.io/zaproxy/zaproxy:stable`).
3. **Credentials** — seed user `platform_admin` / `1234` (same as smoke).
4. **`PORT_OFFSET`** — if non-zero, substitute ports below (`GATEWAY_PORT = 3000 + offset`).

```bash
./scripts/dev/dev-up.sh
./scripts/dev/smoke.sh   # optional sanity check before ZAP
```

---

## Step 1 — Obtain access token (login session)

Login via auth (native client) and capture `access_token`. Pattern matches [`scripts/dev/smoke.sh`](../../scripts/dev/smoke.sh).

```bash
GATEWAY_PORT="${GATEWAY_PORT:-3000}"
AUTH_PORT="${AUTH_PORT:-3001}"

TOKEN_JSON=$(curl -sf -X POST "http://127.0.0.1:${AUTH_PORT}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"platform_admin","password":"1234","client_kind":"native"}')

ACCESS_TOKEN=$(node -e "const j=JSON.parse(process.argv[1]); if(!j.access_token)process.exit(1); process.stdout.write(j.access_token)" "$TOKEN_JSON")

# Sanity — gateway accepts token
curl -sf "http://127.0.0.1:${GATEWAY_PORT}/api/v1/me" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" | head -c 200
echo
```

If login fails, re-seed: `./scripts/dev/seed-all.sh`.

**Why Bearer, not browser cookie:** Backoffice-next uses Next.js rewrites; ZAP baseline against `:3000` is API-first. Inject `Authorization: Bearer <token>` on every request via ZAP Replacer (Step 2).

Optional — exercise a few authenticated routes before scan (helps spider discover linked paths):

```bash
curl -sf "http://127.0.0.1:${GATEWAY_PORT}/auth/me/branches" -H "Authorization: Bearer ${ACCESS_TOKEN}"
curl -sf "http://127.0.0.1:${GATEWAY_PORT}/api/v1/smart-reports?limit=5" -H "Authorization: Bearer ${ACCESS_TOKEN}"
curl -sf "http://127.0.0.1:${GATEWAY_PORT}/api/v1/staff/profiles?limit=5" -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

---

## Step 2 — Run ZAP baseline (Docker)

From **repo root**. Use `--network host` on Linux so the ZAP container can reach `127.0.0.1:${GATEWAY_PORT}`.

```bash
mkdir -p docs/security/reports

docker run --rm --network host \
  -v "$(pwd)/docs/security/reports:/zap/wrk:rw" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py \
    -t "http://127.0.0.1:${GATEWAY_PORT}" \
    -r "zap-baseline-gateway-${GATEWAY_PORT}-$(date +%Y%m%d).html" \
    -J "zap-baseline-gateway-${GATEWAY_PORT}-$(date +%Y%m%d).json" \
    -z "replacer.full_list(0).description=BearerAuth
replacer.full_list(0).enabled=true
replacer.full_list(0).matchtype=REQ_HEADER
replacer.full_list(0).matchstr=Authorization
replacer.full_list(0).regex=false
replacer.full_list(0).replacement=Bearer ${ACCESS_TOKEN}"
```

**macOS / Docker Desktop:** replace `--network host` with `-t http://host.docker.internal:${GATEWAY_PORT}` if `127.0.0.1` is unreachable from the container.

**Token expiry:** Access tokens expire (~15m default). If ZAP reports many `401` on `/api/v1/*`, re-run Step 1 and repeat Step 2 with a fresh token.

---

## Step 3 — Triage findings

1. Open HTML report under `docs/security/reports/`.
2. **Ignore expected local noise** (document rationale, do not auto-fail):
   - Missing HSTS / CSP on `http://127.0.0.1` (TLS not terminated locally)
   - Cookie flags on auth if scanning `:3001` by mistake — stay on gateway `:3000`
   - Informational server banners
3. **Investigate** High/Medium on:
   - Injection / XSS on JSON error bodies
   - Path traversal on download routes (`smart-report` export)
   - Auth bypass (requests without Replacer header should still get `401` on protected routes)
4. Cross-check with Phase 4 adversarial checklist (mesh secret, duplicate headers, IDOR) — ZAP complements, does not replace, those manual checks.

Do **not** add ZAP as a required GitHub Actions gate until baseline noise is stable across two consecutive runs.

---

## Step 4 — Record results (operator)

After a run, append a row to **Run log** and optionally commit HTML/JSON under `docs/security/reports/` (gitignore large binaries if team prefers CI artifacts only).

### Run log

| Run date | Operator | Gateway | Report files | High | Medium | Low | Info | Notes |
|----------|----------|---------|--------------|------|--------|-----|------|-------|
| — | — | `:3000` | — | — | — | — | — | Procedure only — no scan executed on 2026-07-09 |

---

## Related

- [RUNBOOK.md § OWASP ZAP](../../RUNBOOK.md#owasp-zap-optional-dast)
- [backend-post-residual-roadmap § 3.3](../exec-plans/active/backend-post-residual-roadmap-2026-07-09.md) — security sprint context
- Mesh/adversarial evidence: backend review findings Appendix E (deferred ZAP → this doc)
