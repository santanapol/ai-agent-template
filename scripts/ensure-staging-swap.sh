#!/usr/bin/env bash
# Ensure swap exists on small staging droplets (2GB RAM) before npm ci / next build.
set -euo pipefail

SWAP_FILE="${STAGING_SWAP_FILE:-/swapfile}"
SWAP_SIZE="${STAGING_SWAP_SIZE:-2G}"

if swapon --show | grep -q "$SWAP_FILE"; then
  echo "==> swap already active ($SWAP_FILE)"
  exit 0
fi

if [[ -f "$SWAP_FILE" ]]; then
  echo "==> enabling existing swap file $SWAP_FILE"
  chmod 600 "$SWAP_FILE"
  mkswap "$SWAP_FILE" >/dev/null 2>&1 || true
  swapon "$SWAP_FILE"
else
  echo "==> creating $SWAP_SIZE swap at $SWAP_FILE"
  fallocate -l "$SWAP_SIZE" "$SWAP_FILE" 2>/dev/null || dd if=/dev/zero of="$SWAP_FILE" bs=1M count=2048 status=none
  chmod 600 "$SWAP_FILE"
  mkswap "$SWAP_FILE"
  swapon "$SWAP_FILE"
fi

if ! grep -q "$SWAP_FILE" /etc/fstab 2>/dev/null; then
  echo "$SWAP_FILE none swap sw 0 0" >> /etc/fstab
fi

free -h | head -2
