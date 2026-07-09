#!/usr/bin/env bash
# Run package CI for every service (mirrors GitHub Actions) plus optional smoke stack.
# Usage: ./scripts/ci/ci-all.sh [--skip-install] [--skip-smoke] [--with-frontend] [--no-obs] [--low-resource] [--only backend|frontend|docs|smoke]
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../dev/dev-lib.sh
source "$SCRIPT_DIR/../dev/dev-lib.sh"
# shellcheck source=low-resource-env.sh
source "$SCRIPT_DIR/low-resource-env.sh"

SKIP_INSTALL=false
SKIP_SMOKE=false
WITH_FRONTEND=false
NO_OBS=false
LOW_RESOURCE=false
LOW_RESOURCE_AUTO=false
ONLY=""

FAILURES=()
CI_ALL_TOUCHED_DIRS=()

usage() {
  cat <<'EOF'
Usage: ./scripts/ci/ci-all.sh [options]

Run package CI for all backend services, frontend, and docs — then smoke the dev stack.

Options:
  --skip-install     Skip npm ci (deps already installed — use after a clean install)
  --skip-smoke       Run package CI + docs only (no dev-up/smoke)
  --with-frontend    Boot backoffice-next (Next.js) during smoke phase
  --no-obs           Skip observability stack during dev-up
  --low-resource     Cap CPU/RAM for small hosts (2 vCPU / 2GB). Auto-enabled when detected.
  --only <phase>     Run one phase: backend | frontend | docs | smoke
  -h, --help         Show this help

Install notes:
  Default install runs backend/scripts/install-all-deps.sh which rm -rf node_modules
  then npm ci per package, with one retry on TAR_ENTRY_ERROR / incomplete extract.
  If install still flakes: rm -rf backend/*/node_modules backend/service/*/node_modules
  frontend/backoffice-next/node_modules then re-run without --skip-install.
  Do not make --skip-install the default — it hides install flakes.

Phases (default: all except when --only is set):
  1. MongoDB (docker compose) — required for integration tests
  2. Backend npm run ci × 7 (mirrors .github/workflows/ci-check.yml)
  3. Frontend lint + test + build
  4. docs-lint.mjs
  5. dev-up → smoke → dev-down
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-install) SKIP_INSTALL=true ;;
    --skip-smoke) SKIP_SMOKE=true ;;
    --with-frontend) WITH_FRONTEND=true ;;
    --no-obs) NO_OBS=true ;;
    --low-resource) LOW_RESOURCE=true ;;
    --only)
      shift
      ONLY="${1:-}"
      if [[ -z "$ONLY" ]]; then
        echo "Error: --only requires backend|frontend|docs|smoke" >&2
        exit 1
      fi
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [[ -n "$ONLY" ]] && [[ ! "$ONLY" =~ ^(backend|frontend|docs|smoke)$ ]]; then
  echo "Error: --only must be backend, frontend, docs, or smoke (got: $ONLY)" >&2
  exit 1
fi

run_phase() {
  local phase="$1"
  [[ -z "$ONLY" || "$ONLY" == "$phase" ]]
}

record_failure() {
  FAILURES+=("$1")
}

ci_all_stash_env() {
  local rel="$1"
  local use_test_env="${2:-false}"
  local svc_dir="$ROOT/backend/$rel"

  CI_ALL_TOUCHED_DIRS+=("$rel")

  if [[ -f "$svc_dir/.env" ]]; then
    mv "$svc_dir/.env" "$svc_dir/.env.ci-all.bak"
  fi

  if [[ "$use_test_env" == true ]]; then
    if [[ ! -f "$svc_dir/.env.test" ]]; then
      echo "  ✗ missing $svc_dir/.env.test" >&2
      return 1
    fi
    cp "$svc_dir/.env.test" "$svc_dir/.env"
  fi
}

ci_all_restore_envs() {
  local rel
  for rel in "${CI_ALL_TOUCHED_DIRS[@]}"; do
    local svc_dir="$ROOT/backend/$rel"
    rm -f "$svc_dir/.env"
    if [[ -f "$svc_dir/.env.ci-all.bak" ]]; then
      mv "$svc_dir/.env.ci-all.bak" "$svc_dir/.env"
    fi
  done
}

trap ci_all_restore_envs EXIT

ensure_mongodb() {
  echo ""
  echo "==> Ensure MongoDB (docker compose)"
  cd "$ROOT/backend"
  if ! docker compose up -d 2>/dev/null; then
    echo "  · compose recreate skipped — starting existing containers"
    docker start zero-platform-mongodb zero-platform-redis 2>/dev/null || true
  fi

  local i
  for i in $(seq 1 45); do
    if docker compose exec -T mongodb mongosh --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
      echo "  ✓ mongodb ready (compose exec)"
      return 0
    fi
    if docker exec zero-platform-mongodb mongosh --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
      echo "  ✓ mongodb ready (docker exec)"
      return 0
    fi
    sleep 1
  done
  echo "  ✗ mongodb failed to become ready" >&2
  return 1
}

run_backend_ci() {
  # name:relative_path:use_test_env (mirrors ci-check.yml matrix)
  local entries=(
    "auth:auth:false"
    "gateway:gateway:false"
    "staff:service/staff:true"
    "agent-invoice:service/agent-invoice:true"
    "smart-report:service/smart-report:true"
    "branch-report:service/branch-report:true"
    "demo-service:service/demo-service:true"
  )

  echo ""
  echo "==> Backend package CI (7 services)"

  local entry name rel use_test
  for entry in "${entries[@]}"; do
    IFS=':' read -r name rel use_test <<<"$entry"
    local svc_dir="$ROOT/backend/$rel"
    echo ""
    echo "--- backend/$rel ---"

    if ! ci_all_stash_env "$rel" "$use_test"; then
      record_failure "backend/$rel (env prep)"
      continue
    fi

    if (
      set -e
      cd "$svc_dir"
      npm run ci
    ); then
      echo "  ✓ backend/$rel passed"
    else
      record_failure "backend/$rel"
      echo "  ✗ backend/$rel failed" >&2
    fi
  done

  echo ""
  echo "--- backend/shared (ecosystem.factory) ---"
  if (
    set -e
    cd "$ROOT"
    node --test backend/test/*.test.js
  ); then
    echo "  ✓ backend shared tests passed"
  else
    record_failure "backend/shared-tests"
    echo "  ✗ backend shared tests failed" >&2
  fi
}

run_frontend_ci() {
  echo ""
  echo "==> Frontend CI (backoffice-next)"
  local dir="$ROOT/frontend/backoffice-next"
  local failed=false

  if ! (cd "$dir" && npm run lint); then
    record_failure "frontend/backoffice-next (lint)"
    failed=true
  fi
  if ! (cd "$dir" && npm test); then
    record_failure "frontend/backoffice-next (test)"
    failed=true
  fi
  if ! (cd "$dir" && npm run build); then
    record_failure "frontend/backoffice-next (build)"
    failed=true
  fi

  if [[ "$failed" == false ]]; then
    echo "  ✓ frontend/backoffice-next passed"
  else
    echo "  ✗ frontend/backoffice-next failed" >&2
  fi
}

run_docs_lint() {
  echo ""
  echo "==> Docs lint"
  if node "$ROOT/scripts/ci/docs-lint.mjs"; then
    echo "  ✓ docs-lint passed"
  else
    record_failure "docs-lint"
    echo "  ✗ docs-lint failed" >&2
  fi
}

run_smoke_phase() {
  echo ""
  echo "==> Smoke stack (dev-up → smoke → dev-down)"

  local dev_up_args=()
  if [[ "$WITH_FRONTEND" == true ]]; then
    dev_up_args+=(--with-frontend)
  fi
  if [[ "$NO_OBS" == true ]]; then
    dev_up_args+=(--no-obs)
  fi

  local smoke_failed=false

  if ! "$SCRIPT_DIR/../dev/dev-up.sh" "${dev_up_args[@]}"; then
    record_failure "smoke/dev-up"
    smoke_failed=true
  elif ! "$SCRIPT_DIR/../dev/smoke.sh"; then
    record_failure "smoke/smoke.sh"
    smoke_failed=true
  fi

  if ! "$SCRIPT_DIR/../dev/dev-down.sh"; then
    record_failure "smoke/dev-down"
    smoke_failed=true
  fi

  if [[ "$smoke_failed" == false ]]; then
    echo "  ✓ smoke phase passed"
  fi
}

print_summary() {
  echo ""
  echo "========================================"
  if [[ ${#FAILURES[@]} -eq 0 ]]; then
    echo "✓ ci-all passed"
    echo "========================================"
    return 0
  fi

  echo "✗ ci-all failed (${#FAILURES[@]} step(s)):"
  local item
  for item in "${FAILURES[@]}"; do
    echo "  - $item"
  done
  echo "========================================"
  return 1
}

apply_resource_profile() {
  if [[ "$LOW_RESOURCE" == true ]] || ci_detect_low_resource; then
    if [[ "$LOW_RESOURCE" != true ]] && ci_detect_low_resource; then
      LOW_RESOURCE_AUTO=true
      echo "==> Low-resource host detected (<=2 CPU, <=3GB RAM) — applying conservative CI profile"
    else
      echo "==> Low-resource CI profile (--low-resource)"
    fi
    ci_apply_low_resource_env
    ci_ensure_swap_if_low_resource
  fi
}

main() {
  echo "Harness ci-all (PORT_OFFSET=$PORT_OFFSET)"
  apply_resource_profile

  if [[ "$SKIP_INSTALL" == false ]] && { run_phase backend || run_phase frontend; }; then
    echo ""
    echo "==> Install dependencies"
    "$ROOT/backend/scripts/install-all-deps.sh"
  fi

  if run_phase backend; then
    if ! ensure_mongodb; then
      record_failure "mongodb"
      echo "  ⚠ continuing backend CI — integration tests needing MongoDB may fail" >&2
    fi
    run_backend_ci
  fi

  if run_phase frontend; then
    run_frontend_ci
  fi

  if run_phase docs; then
    run_docs_lint
  fi

  if run_phase smoke && [[ "$SKIP_SMOKE" == false ]]; then
    run_smoke_phase
  fi

  print_summary
}

main
