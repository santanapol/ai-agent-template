#!/usr/bin/env bash
# Verify branch-report gpp_777ww seed on local harness MongoDB.
# Remote MONGODB_URI_READ (Atlas) → exit 0 with skip message (by design).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=dev-lib.sh
source "$SCRIPT_DIR/dev-lib.sh"

ENV_BRANCH="$(dev_harness_env backend/service/branch-report)"
ENV_FALLBACK="$ROOT/backend/service/branch-report/.env"

resolve_env_file() {
  if [[ -f "$ENV_BRANCH" ]]; then
    echo "$ENV_BRANCH"
  elif [[ -f "$ENV_FALLBACK" ]]; then
    echo "$ENV_FALLBACK"
  else
    return 1
  fi
}

ENV_FILE="$(resolve_env_file)" || {
  echo "Missing branch-report env — copy .env.harness.example → .env.harness (see backend/ENV.md)" >&2
  exit 1
}

if [[ "$ENV_FILE" == "$ENV_FALLBACK" ]] && [[ ! -f "$ENV_BRANCH" ]]; then
  echo "· using $ENV_FALLBACK (no harness env)"
fi

uri="$(node --env-file="$ENV_FILE" -e "process.stdout.write(process.env.MONGODB_URI_READ || process.env.MONGODB_URI || '')")"
db_name="$(node --env-file="$ENV_FILE" -e "process.stdout.write(process.env.MONGODB_DB_BRANCH || 'gpp_777ww')")"

if [[ -z "$uri" ]]; then
  echo "MONGODB_URI_READ is not set in branch-report env" >&2
  exit 1
fi

is_local_harness_mongo() {
  [[ "$1" == mongodb://127.0.0.1* ]] || [[ "$1" == mongodb://localhost* ]]
}

if ! is_local_harness_mongo "$uri"; then
  echo "skipped — use localhost for domain verify"
  echo "  · MONGODB_URI_READ points to remote/read-only (Atlas demo mode)"
  echo "  · Service may read prod gpp_777ww; local seed is skipped by design"
  echo "  · To verify domain data locally: set MONGODB_URI_READ=mongodb://127.0.0.1:27017 in .env.harness"
  exit 0
fi

if ! docker exec zero-platform-mongodb mongosh --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
  echo "MongoDB container not ready — start Docker first (cd backend && docker compose up -d)" >&2
  exit 1
fi

mgo() {
  docker exec zero-platform-mongodb mongosh --quiet "$@"
}

fail=0
check() {
  local label="$1"
  local result="$2"
  if [[ "$result" == "ok" ]]; then
    echo "  ✓ $label"
  else
    echo "  ✗ $label — $result"
    fail=1
  fi
}

count_in_db() {
  local db="$1"
  local coll="$2"
  mgo "$db" --eval "db.getCollectionNames().includes('$coll') ? db.$coll.countDocuments() : 0" 2>/dev/null | tail -1
}

seed_prog_count() {
  local db="$1"
  local coll="$2"
  mgo "$db" --eval "db.getCollectionNames().includes('$coll') ? db.$coll.countDocuments({ cr_prog: 'scripts/seed-example-data.mjs' }) : 0" 2>/dev/null | tail -1
}

echo "branch-report seed verification (local)"
echo "  database: $db_name"
echo ""

invite_links="$(count_in_db "$db_name" su_staff_invite_link)"
check "$db_name.su_staff_invite_link ≥ 1" "$([[ "${invite_links:-0}" -ge 1 ]] && echo ok || echo "count=${invite_links:-0}")"

members="$(count_in_db "$db_name" member)"
check "$db_name.member ≥ 3" "$([[ "${members:-0}" -ge 3 ]] && echo ok || echo "count=${members:-0}")"

deposits="$(count_in_db "$db_name" dm_dm_tn_deposit)"
check "$db_name.dm_dm_tn_deposit ≥ 3" "$([[ "${deposits:-0}" -ge 3 ]] && echo ok || echo "count=${deposits:-0}")"

withdraws="$(count_in_db "$db_name" wallet_withdraw)"
check "$db_name.wallet_withdraw ≥ 3" "$([[ "${withdraws:-0}" -ge 3 ]] && echo ok || echo "count=${withdraws:-0}")"

seed_members="$(seed_prog_count "$db_name" member)"
check "seed documents (cr_prog=seed-example-data.mjs) ≥ 3" "$([[ "${seed_members:-0}" -ge 3 ]] && echo ok || echo "count=${seed_members:-0}")"

echo ""
echo "==> optional gateway API (requires dev-up stack)"
dev_load_ports

if ! curl -sf "http://127.0.0.1:${GATEWAY_PORT}/healthz" >/dev/null 2>&1; then
  echo "  · skip — gateway :${GATEWAY_PORT} not running (start ./scripts/dev/dev-up.sh)"
else
  TOKEN_JSON=$(curl -sf -X POST "http://127.0.0.1:${AUTH_PORT}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${SMOKE_USERNAME}\",\"password\":\"${SMOKE_PASSWORD}\",\"client_kind\":\"native\"}") || true

  ACCESS_TOKEN=$(node -e "try{const j=JSON.parse(process.argv[1]); process.stdout.write(j.access_token||'')}catch{}" "$TOKEN_JSON" 2>/dev/null || true)

  if [[ -z "${ACCESS_TOKEN:-}" ]]; then
    echo "  · skip gateway curl — login failed"
  else
    INVITE_JSON=$(curl -sf "http://127.0.0.1:${GATEWAY_PORT}/api/v1/branch-report/invite-links" \
      -H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null || echo "")

    INVITE_COUNT=$(node -e "
      try {
        const j = JSON.parse(process.argv[1]);
        const rows = j.data ?? j.items ?? j;
        process.stdout.write(String(Array.isArray(rows) ? rows.length : 0));
      } catch { process.stdout.write('0'); }
    " "$INVITE_JSON" 2>/dev/null || echo "0")

    check "GET /api/v1/branch-report/invite-links ≥ 1 row" "$([[ "${INVITE_COUNT:-0}" -ge 1 ]] && echo ok || echo "count=${INVITE_COUNT:-0}")"

    ROYALTY_JSON=$(curl -sf "http://127.0.0.1:${GATEWAY_PORT}/api/v1/branch-report/royalty-21-times?regDateFrom=2024-01-01&regDateTo=2030-12-31&channelType=all&page=1&pageSize=10" \
      -H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null || echo "")

    ROYALTY_TOTAL=$(node -e "
      try {
        const j = JSON.parse(process.argv[1]);
        const total = j.meta?.total ?? j.data?.total ?? j.total ?? (Array.isArray(j.data) ? j.data.length : 0);
        process.stdout.write(String(total));
      } catch { process.stdout.write('0'); }
    " "$ROYALTY_JSON" 2>/dev/null || echo "0")

    check "GET /api/v1/branch-report/royalty-21-times total ≥ 1" "$([[ "${ROYALTY_TOTAL:-0}" -ge 1 ]] && echo ok || echo "total=${ROYALTY_TOTAL:-0}")"
  fi
fi

echo ""
if [[ $fail -eq 0 ]]; then
  echo "✓ branch-report seed verification passed"
else
  echo "✗ branch-report seed verification failed"
  echo "  fix: cp backend/service/branch-report/.env.harness.example backend/service/branch-report/.env.harness"
  echo "       cd backend/service/branch-report && npm run seed:example"
  echo "       (or ./scripts/dev/seed-all.sh from repo root)"
  exit 1
fi
