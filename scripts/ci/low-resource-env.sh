#!/usr/bin/env bash
# Shared env for small hosts (e.g. 2 vCPU / 2GB RAM production or staging droplets).
# Sourced by ci-all.sh and deploy scripts — do not execute directly.
set -euo pipefail

# Total physical RAM in MiB (integer). Returns 0 if /proc/meminfo is unavailable.
ci_total_mem_mib() {
  if [[ -r /proc/meminfo ]]; then
    awk '/^MemTotal:/ { print int($2 / 1024) }' /proc/meminfo
  else
    echo 0
  fi
}

# True when the host looks like a 2 vCPU / ~2GB RAM box (with small tolerance).
ci_detect_low_resource() {
  local cores mem_mib
  cores="$(nproc 2>/dev/null || echo 8)"
  mem_mib="$(ci_total_mem_mib)"

  if [[ "$cores" -le 2 ]] && [[ "$mem_mib" -gt 0 ]] && [[ "$mem_mib" -le 3072 ]]; then
    return 0
  fi
  return 1
}

# Export conservative Node/Vitest limits. Idempotent — safe to call more than once.
ci_apply_low_resource_env() {
  export CI_LOW_RESOURCE=1
  export VITEST_MAX_WORKERS="${VITEST_MAX_WORKERS:-1}"
  export VITEST_POOL="${VITEST_POOL:-forks}"

  # Leave headroom for OS, Docker Mongo/Redis, and PM2 processes on 2GB hosts.
  if [[ -z "${NODE_OPTIONS:-}" ]] || [[ "${NODE_OPTIONS}" != *max-old-space-size* ]]; then
    export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=1024"
  fi

  # Node test runner: serial suites reduce mongodb-memory-server RAM spikes (auth).
  echo "  · low-resource profile: VITEST_MAX_WORKERS=$VITEST_MAX_WORKERS NODE_OPTIONS=$NODE_OPTIONS (backend tests use --test-concurrency=1)"
}

# Optional swap for npm ci / next build on tiny droplets (no-op when swap already active).
ci_ensure_swap_if_low_resource() {
  if ! ci_detect_low_resource; then
    return 0
  fi
  local swap_script
  swap_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../staging/ensure-staging-swap.sh"
  if [[ -x "$swap_script" ]]; then
    bash "$swap_script"
  fi
}
