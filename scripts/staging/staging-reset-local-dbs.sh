#!/usr/bin/env bash
# Drop local staging MongoDB databases (Docker on 127.0.0.1:27017).
# Does NOT touch prod Atlas read replicas.
set -euo pipefail

MONGO_URI="${MONGO_URI:-mongodb://127.0.0.1:27017}"
MONGO_CONTAINER="${MONGO_CONTAINER:-zero-platform-mongodb}"

run_mongosh() {
  local js="$1"
  if command -v mongosh >/dev/null 2>&1; then
    mongosh "$MONGO_URI" --quiet --eval "$js"
  elif docker ps --format '{{.Names}}' | grep -qx "$MONGO_CONTAINER"; then
    docker exec "$MONGO_CONTAINER" mongosh "$MONGO_URI" --quiet --eval "$js"
  else
    echo "mongosh not found and container $MONGO_CONTAINER not running" >&2
    exit 1
  fi
}

echo "=== staging-reset-local-dbs ==="
echo "URI: $MONGO_URI"
echo "Dropping: zero-platform zero-agent-invoice zero-smart-report auth_login"
echo ""

run_mongosh '
const names = ["zero-platform", "zero-agent-invoice", "zero-smart-report", "auth_login"];
for (const name of names) {
  const r = db.getSiblingDB(name).dropDatabase();
  print("  " + name + ": " + (r.ok ? "dropped" : JSON.stringify(r)));
}
'

echo ""
echo "✓ local staging DBs reset"
