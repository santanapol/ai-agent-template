#!/usr/bin/env bash
# Install npm dependencies for each backend service and frontend (no root workspace).
# Hardened against sequential monorepo install flakes (TAR_ENTRY_ERROR / partial extract).
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

# Verify a representative bin from the package's CI tooling exists after npm ci.
# Prefer eslint (most packages); fall back to checking node_modules exists.
npm_ci_ok() {
  local dir="$1"
  if [[ -x "$dir/node_modules/.bin/eslint" ]]; then
    return 0
  fi
  if [[ -x "$dir/node_modules/.bin/vite" ]] || [[ -x "$dir/node_modules/.bin/next" ]]; then
    return 0
  fi
  # Packages without eslint in PATH still must have a populated node_modules
  [[ -d "$dir/node_modules" ]] && [[ -n "$(ls -A "$dir/node_modules" 2>/dev/null)" ]]
}

npm_ci_hardened() {
  local dir="$1"
  local label="$2"
  local attempt

  for attempt in 1 2; do
    echo "==> npm ci in $label (attempt $attempt)"
    rm -rf "$dir/node_modules"
    if (cd "$dir" && npm ci) && npm_ci_ok "$dir"; then
      return 0
    fi
    echo "  ⚠ npm ci incomplete or failed in $label — cleaning and retrying" >&2
  done

  echo "  ✗ npm ci failed twice in $label" >&2
  return 1
}

for rel in "${BACKEND_DIRS[@]}"; do
  npm_ci_hardened "$BACKEND/$rel" "backend/$rel"
done

echo "==> npm ci in frontend/backoffice-next"
FRONTEND_DIR="$REPO/frontend/backoffice-next"
for attempt in 1 2; do
  echo "  (attempt $attempt)"
  rm -rf "$FRONTEND_DIR/node_modules"
  if (cd "$FRONTEND_DIR" && npm ci --legacy-peer-deps) && npm_ci_ok "$FRONTEND_DIR"; then
    exit 0
  fi
  echo "  ⚠ frontend npm ci incomplete — cleaning and retrying" >&2
done
echo "  ✗ frontend npm ci failed twice" >&2
exit 1
