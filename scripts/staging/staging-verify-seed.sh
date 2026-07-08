#!/usr/bin/env bash
# Verify staging DB indexes + seed completeness (run after staging-seed-all.sh).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if ! docker exec zero-platform-mongodb mongosh --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
  echo "MongoDB container not ready — start Docker first" >&2
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

index_count() {
  local db="$1"
  local coll="$2"
  mgo "$db" --eval "db.getCollectionNames().includes('$coll') ? db.$coll.getIndexes().length : 0" 2>/dev/null | tail -1
}

echo "Staging seed verification"
echo ""

echo "==> Local MongoDB (write)"
auth_users="$(count_in_db zero-platform auth_users)"
check "zero-platform.auth_users ≥ 5" "$([[ "${auth_users:-0}" -ge 5 ]] && echo ok || echo "count=${auth_users:-0}")"

menus="$(count_in_db zero-platform auth_menus)"
check "zero-platform.auth_menus > 0" "$([[ "${menus:-0}" -gt 0 ]] && echo ok || echo "count=${menus:-0}")"

roles="$(count_in_db zero-platform auth_role_permissions)"
check "zero-platform.auth_role_permissions > 0" "$([[ "${roles:-0}" -gt 0 ]] && echo ok || echo "count=${roles:-0}")"

hq="$(mgo zero-platform --eval 'db.getCollectionNames().includes("platform_branches") ? db.platform_branches.countDocuments({ branch_code: "ZERO" }) : 0' 2>/dev/null | tail -1)"
check "zero-platform.platform_branches (Zero HQ)" "$([[ "${hq:-0}" -ge 1 ]] && echo ok || echo "count=${hq:-0}")"

staff_profiles="$(count_in_db zero-platform staff_profiles)"
check "zero-platform.staff_profiles ≥ 3" "$([[ "${staff_profiles:-0}" -ge 3 ]] && echo ok || echo "count=${staff_profiles:-0}")"

agents="$(count_in_db zero-agent-invoice agents)"
check "zero-agent-invoice.agents > 0" "$([[ "${agents:-0}" -gt 0 ]] && echo ok || echo "count=${agents:-0}")"

reports="$(count_in_db zero-smart-report reports)"
check "zero-smart-report.reports > 0" "$([[ "${reports:-0}" -gt 0 ]] && echo ok || echo "count=${reports:-0}")"

auth_idx="$(index_count zero-platform auth_users)"
check "auth_users indexes" "$([[ "${auth_idx:-0}" -ge 2 ]] && echo ok || echo "indexes=${auth_idx:-0}")"

staff_idx="$(index_count zero-platform staff_profiles)"
check "staff_profiles indexes" "$([[ "${staff_idx:-0}" -ge 2 ]] && echo ok || echo "indexes=${staff_idx:-0}")"

echo ""
echo "==> branch-report read (prod Atlas)"
if [[ -f "$ROOT/backend/service/branch-report/.env.staging" ]]; then
  # shellcheck disable=SC1091
  set -a && source <(grep -E '^MONGODB_URI_READ=|^MONGODB_DB_BRANCH=' "$ROOT/backend/service/branch-report/.env.staging" | sed 's/\r$//') && set +a
  if [[ "${MONGODB_URI_READ:-}" == mongodb://* ]] || [[ "${MONGODB_URI_READ:-}" == mongodb+srv://* ]]; then
    if [[ "${MONGODB_URI_READ}" == mongodb://127.0.0.1* ]] || [[ "${MONGODB_URI_READ}" == mongodb://localhost* ]]; then
      branches="$(mgo "${MONGODB_DB_BRANCH:-gpp_777ww}" --eval 'db.su_branch.countDocuments()' | tail -1)"
      check "gpp_777ww.su_branch (local seed)" "$([[ "${branches:-0}" -gt 0 ]] && echo ok || echo "count=$branches")"
    else
      echo "  · MONGODB_URI_READ → Atlas (read-only) — branch-report seed skipped by design"
      echo "  · Marketing reports use prod gpp_777ww data (no local seed)"
    fi
  fi
else
  echo "  · skip — no branch-report/.env.staging"
fi

echo ""
if [[ $fail -eq 0 ]]; then
  echo "✓ staging seed verification passed"
else
  echo "✗ staging seed verification failed — run: bash scripts/staging-seed-all.sh"
  exit 1
fi
