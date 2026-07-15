#!/usr/bin/env bash
# Copy .env.example → .env.staging for backend services (staging server bootstrap).
# Does not overwrite existing .env.staging files.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND="$ROOT/backend"

DIRS=(
  auth
  gateway
  service/staff
  service/agent-invoice
  service/smart-report
  service/branch-report
)

for rel in "${DIRS[@]}"; do
  src="$BACKEND/$rel/.env.example"
  dest="$BACKEND/$rel/.env.staging"
  if [[ ! -f "$src" ]]; then
    echo "skip: missing $src"
    continue
  fi
  if [[ -f "$dest" ]]; then
    echo "keep: $dest (already exists)"
    continue
  fi
  cp "$src" "$dest"
  echo "created: $dest"
done

# branch-report must listen on 3104 (gateway routes.json upstream)
BR_REPORT_ENV="$BACKEND/service/branch-report/.env.staging"
if [[ -f "$BR_REPORT_ENV" ]]; then
  if grep -q '^PORT=' "$BR_REPORT_ENV"; then
    sed -i 's/^PORT=.*/PORT=3104/' "$BR_REPORT_ENV"
  else
    echo 'PORT=3104' >> "$BR_REPORT_ENV"
  fi
  echo "patched: $BR_REPORT_ENV PORT=3104"
fi

fe_src="$ROOT/frontend/backoffice-next/.env.staging.example"
fe_dest="$ROOT/frontend/backoffice-next/.env.staging"
if [[ -f "$fe_src" && ! -f "$fe_dest" ]]; then
  cp "$fe_src" "$fe_dest"
  echo "created: $fe_dest"
fi

echo ""
echo "Next: edit backend/*/.env.staging — see dev-ops/staging/RUNBOOK.md"
