#!/usr/bin/env bash
# Re-deploy staging after git pull (no DB seed, no docker recreate).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend/backoffice-next"
LOCK_HASH_FILE="$ROOT/.staging-package-lock.sha256"

echo "==> deploy-staging"
bash "$SCRIPT_DIR/ensure-staging-swap.sh"
# shellcheck source=../ci/low-resource-env.sh
source "$SCRIPT_DIR/../ci/low-resource-env.sh"
if ci_detect_low_resource; then
  ci_apply_low_resource_env
else
  export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"
fi

hash_lockfiles() {
  {
    for rel in auth gateway service/staff service/agent-invoice service/smart-report service/demo-service service/branch-report; do
      cat "$BACKEND/$rel/package-lock.json" 2>/dev/null || true
    done
    cat "$FRONTEND/package-lock.json" 2>/dev/null || true
  } | sha256sum | awk '{print $1}'
}

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

npm run build:staging --prefix "$FRONTEND"
pm2 reload "$BACKEND/ecosystem.staging.config.js"

echo "==> post-deploy health"
curl -sf "http://127.0.0.1:3000/healthz" >/dev/null
echo "  ✓ gateway /healthz"
curl -sf "http://127.0.0.1:3001/healthz" >/dev/null
echo "  ✓ auth /healthz"
curl -sf "http://127.0.0.1:3005/" | head -c 200 >/dev/null
echo "  ✓ backoffice / :3005"
pm2 jlist | node -e "
  const apps = JSON.parse(require('fs').readFileSync(0,'utf8'));
  const bad = apps.filter((a) => a.pm2_env?.status !== 'online');
  if (bad.length) {
    console.error('PM2 not online:', bad.map((a) => a.name).join(', '));
    process.exit(1);
  }
"
echo "  ✓ pm2 all online"

echo "✓ deploy-staging complete"
echo "  → from local: SMOKE_PASSWORD='…' bash scripts/smoke-staging.sh"
