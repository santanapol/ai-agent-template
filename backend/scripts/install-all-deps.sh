#!/usr/bin/env bash
# Install npm dependencies for each backend service and frontend (no root workspace).
set -euo pipefail

BACKEND="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$BACKEND/.." && pwd)"

BACKEND_DIRS=(
  auth
  gateway
  service/staff
  service/agent-invoice
  service/smart-report
  service/demo-service
  service/branch-report
)

for rel in "${BACKEND_DIRS[@]}"; do
  echo "==> npm ci in backend/$rel"
  (cd "$BACKEND/$rel" && npm ci)
done

echo "==> npm ci in frontend/backoffice-next"
(cd "$REPO/frontend/backoffice-next" && npm ci --legacy-peer-deps)
