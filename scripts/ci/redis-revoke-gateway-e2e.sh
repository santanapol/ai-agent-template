#!/usr/bin/env bash
# Redis session revoke → gateway token_gen E2E (TD-014).
# Prereqs: Mongo + Redis up; auth + gateway running with harness env (see RUNBOOK).
#
# Flow: login → internal revoke → gateway 401 GATEWAY_JWT_REJECTED → re-login 200
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../dev/dev-lib.sh
source "$SCRIPT_DIR/../dev/dev-lib.sh"

HARNESS_AUTH="$(dev_harness_env backend/auth)"
if [[ ! -f "$HARNESS_AUTH" ]]; then
  echo "Missing harness env — run ./scripts/dev/dev-up.sh first (or dev-generate-env.mjs)" >&2
  exit 1
fi

dev_load_ports

SMOKE_USERNAME="${SMOKE_USERNAME:-platform_admin}"
SMOKE_PASSWORD="${SMOKE_PASSWORD:-1234}"

read_harness_env() {
  local key="$1"
  node -e "
    const fs = require('fs');
    const key = process.argv[1];
    const file = process.argv[2];
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      if (trimmed.slice(0, idx) === key) {
        process.stdout.write(trimmed.slice(idx + 1));
        process.exit(0);
      }
    }
    process.exit(1);
  " "$key" "$HARNESS_AUTH"
}

AUTH_INTERNAL_SERVICE_SECRET="${AUTH_INTERNAL_SERVICE_SECRET:-$(read_harness_env AUTH_INTERNAL_SERVICE_SECRET)}"
REDIS_URL="${REDIS_URL:-$(read_harness_env REDIS_URL || true)}"

if [[ -z "$AUTH_INTERNAL_SERVICE_SECRET" ]]; then
  echo "  ✗ AUTH_INTERNAL_SERVICE_SECRET missing in $HARNESS_AUTH" >&2
  exit 1
fi

if [[ -z "$REDIS_URL" ]]; then
  echo "  ✗ REDIS_URL missing in $HARNESS_AUTH — required for token_gen E2E" >&2
  exit 1
fi

echo "Redis revoke gateway E2E (offset=$PORT_OFFSET)"

curl -sf "http://127.0.0.1:${AUTH_PORT}/healthz" >/dev/null
echo "  ✓ auth /healthz"

curl -sf "http://127.0.0.1:${GATEWAY_PORT}/healthz" >/dev/null
echo "  ✓ gateway /healthz"

login() {
  curl -sf -X POST "http://127.0.0.1:${AUTH_PORT}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${SMOKE_USERNAME}\",\"password\":\"${SMOKE_PASSWORD}\",\"client_kind\":\"native\"}"
}

TOKEN_JSON=$(login)
ACCESS_TOKEN=$(node -e "const j=JSON.parse(process.argv[1]); process.stdout.write(j.access_token||'')" "$TOKEN_JSON")
if [[ -z "$ACCESS_TOKEN" ]]; then
  echo "  ✗ login failed — no access_token" >&2
  echo "$TOKEN_JSON" >&2
  exit 1
fi
echo "  ✓ auth login"

USER_ID=$(node -e "
  const token = process.argv[1];
  const payload = token.split('.')[1];
  if (!payload) process.exit(1);
  const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (!json.sub) process.exit(1);
  process.stdout.write(String(json.sub));
" "$ACCESS_TOKEN")

if [[ -z "$USER_ID" ]]; then
  echo "  ✗ could not decode user id (sub) from access token" >&2
  exit 1
fi
echo "  ✓ decoded user id from JWT sub"

REVOKE_JSON=$(curl -sf -X POST \
  "http://127.0.0.1:${AUTH_PORT}/internal/users/${USER_ID}/sessions/revoke" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_INTERNAL_SERVICE_SECRET}" \
  -d '{"reason":"redis-revoke-gateway-e2e","correlation_id":"ci-redis-revoke-e2e"}')

node -e "
  const j = JSON.parse(process.argv[1]);
  if (typeof j.access_token_gen !== 'number') process.exit(1);
" "$REVOKE_JSON"
echo "  ✓ internal sessions revoke (access_token_gen bumped)"

ME_STATUS=$(curl -s -o /tmp/redis-revoke-me.json -w "%{http_code}" \
  "http://127.0.0.1:${GATEWAY_PORT}/api/v1/me" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

if [[ "$ME_STATUS" != "401" ]]; then
  echo "  ✗ gateway GET /api/v1/me expected 401 after revoke (got $ME_STATUS)" >&2
  cat /tmp/redis-revoke-me.json >&2 || true
  exit 1
fi

node -e "
  const fs = require('fs');
  const body = JSON.parse(fs.readFileSync('/tmp/redis-revoke-me.json', 'utf8'));
  if (body.code !== 'GATEWAY_JWT_REJECTED') process.exit(1);
" 
echo "  ✓ gateway GET /api/v1/me → 401 GATEWAY_JWT_REJECTED"

RELOGIN_JSON=$(login)
RELOGIN_TOKEN=$(node -e "const j=JSON.parse(process.argv[1]); process.stdout.write(j.access_token||'')" "$RELOGIN_JSON")
if [[ -z "$RELOGIN_TOKEN" ]]; then
  echo "  ✗ re-login failed — no access_token" >&2
  echo "$RELOGIN_JSON" >&2
  exit 1
fi
echo "  ✓ re-login after revoke"

echo ""
echo "✓ redis revoke gateway E2E passed"
