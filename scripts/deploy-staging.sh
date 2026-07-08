#!/usr/bin/env bash
# Re-deploy staging after git pull (no DB seed, no docker recreate).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND="$ROOT/backend"

echo "==> deploy-staging"
bash "$BACKEND/scripts/install-all-deps.sh"
npm run build:staging --prefix "$ROOT/frontend/backoffice-next"
pm2 reload "$BACKEND/ecosystem.staging.config.js"

echo "==> post-deploy health"
curl -sf "http://127.0.0.1:3000/healthz" >/dev/null
echo "  ✓ gateway /healthz"
curl -sf "http://127.0.0.1:3001/healthz" >/dev/null
echo "  ✓ auth /healthz"
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
