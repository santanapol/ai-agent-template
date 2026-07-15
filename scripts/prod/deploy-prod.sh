#!/usr/bin/env bash
# Re-deploy production after git pull (no DB seed, no docker recreate).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend/backoffice-next"
LOCK_HASH_FILE="$ROOT/.prod-package-lock.sha256"
STAGING_SCRIPTS="$ROOT/scripts/staging"

echo "==> deploy-prod"

# 2GB droplets: swap before npm ci / next build (shared with staging deploy).
bash "$STAGING_SCRIPTS/ensure-staging-swap.sh"

# shellcheck source=../ci/low-resource-env.sh
source "$SCRIPT_DIR/../ci/low-resource-env.sh"
if ci_detect_low_resource; then
  ci_apply_low_resource_env
else
  export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"
fi

ensure_branch_report_prod_env() {
  local br_env="$BACKEND/service/branch-report/.env.prod"
  [[ -f "$br_env" ]] && return 0

  local example="$BACKEND/service/branch-report/.env.example"
  local gw_env="$BACKEND/gateway/.env.prod"
  local auth_env="$BACKEND/auth/.env.prod"
  if [[ ! -f "$example" || ! -f "$gw_env" || ! -f "$auth_env" ]]; then
    echo "✗ cannot bootstrap $br_env — missing example or gateway/auth .env.prod" >&2
    exit 1
  fi

  local gw_secret read_uri
  gw_secret="$(grep -E '^GATEWAY_SECRET=' "$gw_env" | cut -d= -f2-)"
  read_uri="$(grep -E '^MONGODB_URI_READ=' "$auth_env" | cut -d= -f2-)"
  if [[ -z "$gw_secret" || -z "$read_uri" ]]; then
    echo "✗ cannot bootstrap $br_env — GATEWAY_SECRET or MONGODB_URI_READ missing" >&2
    exit 1
  fi

  cp "$example" "$br_env"
  sed -i "s/^NODE_ENV=.*/NODE_ENV=production/" "$br_env"
  sed -i "s/^PORT=.*/PORT=3104/" "$br_env"
  sed -i "s|^GATEWAY_SHARED_SECRET=.*|GATEWAY_SHARED_SECRET=${gw_secret}|" "$br_env"
  sed -i "s|^MONGODB_URI_READ=.*|MONGODB_URI_READ=${read_uri}|" "$br_env"
  echo "==> created $br_env from gateway/auth prod secrets"
}

hash_lockfiles() {
  {
    for rel in auth gateway service/staff service/agent-invoice service/smart-report service/demo-service service/branch-report; do
      cat "$BACKEND/$rel/package-lock.json" 2>/dev/null || true
    done
    cat "$FRONTEND/package-lock.json" 2>/dev/null || true
  } | sha256sum | awk '{print $1}'
}

ensure_branch_report_prod_env

CURRENT_HASH="$(hash_lockfiles)"
PREVIOUS_HASH=""
if [[ -f "$LOCK_HASH_FILE" ]]; then
  PREVIOUS_HASH="$(cat "$LOCK_HASH_FILE")"
fi

if [[ "$CURRENT_HASH" != "$PREVIOUS_HASH" ]]; then
  echo "==> package-lock changed — running install-all-deps"
  bash "$BACKEND/scripts/install-all-deps.sh"
  echo "$CURRENT_HASH" > "$LOCK_HASH_FILE"
else
  echo "==> package-lock unchanged — skipping install-all-deps"
  if [[ ! -d "$FRONTEND/node_modules/next" ]]; then
    echo "==> frontend node_modules incomplete — npm ci backoffice-next only"
    (cd "$FRONTEND" && npm ci --legacy-peer-deps)
  fi
fi

npm run build --prefix "$FRONTEND"
pm2 reload "$BACKEND/ecosystem.config.js"

echo "==> post-deploy health"
curl -sf "http://127.0.0.1:3000/healthz" >/dev/null
echo "  ✓ gateway /healthz"
curl -sf "http://127.0.0.1:3001/healthz" >/dev/null
echo "  ✓ auth /healthz"
curl -sf -o /dev/null "http://127.0.0.1:3005/"
echo "  ✓ backoffice / :3005"
if curl -sf "http://127.0.0.1:3104/healthz" >/dev/null 2>&1; then
  echo "  ✓ branch-report /healthz"
fi
pm2 jlist | node -e "
  const apps = JSON.parse(require('fs').readFileSync(0,'utf8'));
  const bad = apps.filter((a) => a.pm2_env?.status !== 'online');
  if (bad.length) {
    console.error('PM2 not online:', bad.map((a) => a.name).join(', '));
    process.exit(1);
  }
"
echo "  ✓ pm2 all online"

echo "✓ deploy-prod complete"
