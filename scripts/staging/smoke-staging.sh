#!/usr/bin/env bash
# Smoke test staging (run from local machine after deploy).
# Hits https://zero-staging.168bits.com through Cloudflare + Nginx + SSL.
#
# Usage:
#   SMOKE_PASSWORD='...' bash scripts/smoke-staging.sh
#   SMOKE_PASSWORD='...' STAGING_URL=https://zero-staging.168bits.com bash scripts/smoke-staging.sh
#
# Credentials: server-environment/staging/credential.md (do not commit passwords)
set -euo pipefail

STAGING_URL="${STAGING_URL:-https://zero-staging.168bits.com}"
STAGING_URL="${STAGING_URL%/}"
SMOKE_USERNAME="${SMOKE_USERNAME:-platform_admin}"
SMOKE_PASSWORD="${SMOKE_PASSWORD:-}"

if [[ -z "$SMOKE_PASSWORD" ]]; then
  echo "Set SMOKE_PASSWORD (see server-environment/staging/credential.md)" >&2
  exit 1
fi

echo "Staging smoke: $STAGING_URL (user=$SMOKE_USERNAME)"

HTML=$(curl -sf "$STAGING_URL/")
if ! echo "$HTML" | grep -qi 'data-app="zero-backoffice"'; then
  echo "  ✗ frontend — missing app shell" >&2
  exit 1
fi
echo "  ✓ frontend app shell"

TOKEN_JSON=$(curl -sf -X POST "$STAGING_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${SMOKE_USERNAME}\",\"password\":\"${SMOKE_PASSWORD}\",\"client_kind\":\"web\"}")

ACCESS_TOKEN=$(node -e "const j=JSON.parse(process.argv[1]); process.stdout.write(j.access_token||'')" "$TOKEN_JSON")
if [[ -z "$ACCESS_TOKEN" ]]; then
  echo "  ✗ login failed — no access_token" >&2
  echo "$TOKEN_JSON" >&2
  exit 1
fi
echo "  ✓ POST /auth/login"

ME=$(curl -sf "$STAGING_URL/auth/me/branches" -H "Authorization: Bearer $ACCESS_TOKEN")
echo "$ME" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); if(!Array.isArray(j.branches)||j.branches.length<1)process.exit(1)"
echo "  ✓ GET /auth/me/branches"

# demo-service is not in staging PM2 — proxy a real upstream instead
REPORTS=$(curl -sf "$STAGING_URL/api/v1/smart-reports" -H "Authorization: Bearer $ACCESS_TOKEN")
echo "$REPORTS" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); if(!j.success&&!Array.isArray(j.data))process.exit(1)"
echo "  ✓ GET /api/v1/smart-reports (gateway → smart-report)"

echo ""
echo "✓ staging smoke passed"
