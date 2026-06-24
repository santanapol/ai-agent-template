#!/usr/bin/env bash
# SC-8: Permission Admin API smoke — mirrors backend/_bruno/auth/admin/* (7 requests + login).
# Usage:
#   export AUTH_SMOKE_BASE_URL=http://127.0.0.1:3001
#   export AUTH_SMOKE_USERNAME=platform_admin
#   export AUTH_SMOKE_PASSWORD='your-password'
#   ./smoke-admin-api.sh
set -euo pipefail

BASE_URL="${AUTH_SMOKE_BASE_URL:-http://127.0.0.1:3001}"
USERNAME="${AUTH_SMOKE_USERNAME:-}"
PASSWORD="${AUTH_SMOKE_PASSWORD:-}"
TEST_MENU_KEY="${AUTH_SMOKE_MENU_KEY:-sit:smoke:test}"
TEST_ROLE="${AUTH_SMOKE_ROLE:-branch_admin}"

if [[ -z "$USERNAME" || -z "$PASSWORD" ]]; then
  echo "Set AUTH_SMOKE_USERNAME and AUTH_SMOKE_PASSWORD (or copy Local.yml credentials)." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for this smoke script." >&2
  exit 1
fi

step() { echo "==> $1"; }
fail() { echo "FAIL: $1" >&2; exit 1; }

step "1/8 Login"
LOGIN_BODY=$(curl -sf -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\",\"client_kind\":\"native\"}") \
  || fail "login request failed"
ACCESS_TOKEN=$(echo "$LOGIN_BODY" | jq -r '.access_token // empty')
[[ -n "$ACCESS_TOKEN" ]] || fail "login response missing access_token"

auth_hdr=(-H "Authorization: Bearer $ACCESS_TOKEN")

step "2/8 List menus"
LIST_BODY=$(curl -sf "${auth_hdr[@]}" "$BASE_URL/auth/admin/menus") \
  || fail "list menus failed"
MENU_UPD_DATE=$(echo "$LIST_BODY" | jq -r --arg k "$TEST_MENU_KEY" \
  '(.menus // []) | (map(select(.key == $k)) | .[0].upd_date) // empty')

step "3/8 Create menu node (idempotent — 201 or 400 duplicate)"
CREATE_STATUS=$(curl -s -o /tmp/smoke-create.json -w '%{http_code}' -X POST "$BASE_URL/auth/admin/menus" \
  "${auth_hdr[@]}" -H 'Content-Type: application/json' \
  -d "{\"key\":\"$TEST_MENU_KEY\",\"label\":\"Smoke test action\",\"type\":\"action\",\"parent_key\":\"settings\",\"sort_order\":99}")
if [[ "$CREATE_STATUS" == "201" ]]; then
  MENU_UPD_DATE=$(jq -r '.upd_date // empty' /tmp/smoke-create.json)
elif [[ "$CREATE_STATUS" != "400" ]]; then
  fail "create menu unexpected status $CREATE_STATUS"
fi
[[ -n "$MENU_UPD_DATE" ]] || fail "menu_upd_date not captured"

step "4/8 Update menu node (If-Match ISO)"
PATCH_BODY=$(curl -sf -X PATCH "$BASE_URL/auth/admin/menus/$TEST_MENU_KEY" \
  "${auth_hdr[@]}" -H 'Content-Type: application/json' -H "If-Match: $MENU_UPD_DATE" \
  -d '{"label":"Smoke test action (updated)"}') \
  || fail "patch menu failed"
MENU_UPD_DATE=$(echo "$PATCH_BODY" | jq -r '.upd_date // empty')
[[ -n "$MENU_UPD_DATE" ]] || fail "patch response missing upd_date"

step "5/8 SC-5 — stale If-Match returns 412"
STALE_STATUS=$(curl -s -o /tmp/smoke-stale.json -w '%{http_code}' -X PATCH "$BASE_URL/auth/admin/menus/$TEST_MENU_KEY" \
  "${auth_hdr[@]}" -H 'Content-Type: application/json' -H "If-Match: 2020-01-01T00:00:00.000Z" \
  -d '{"label":"Should not apply"}')
[[ "$STALE_STATUS" == "412" ]] || fail "expected 412 for stale If-Match, got $STALE_STATUS"
STALE_CODE=$(jq -r '.code // empty' /tmp/smoke-stale.json)
[[ "$STALE_CODE" == "AUTH_PRECONDITION_FAILED" ]] || fail "expected AUTH_PRECONDITION_FAILED"

step "6/8 List role permissions"
curl -sf "${auth_hdr[@]}" "$BASE_URL/auth/admin/role-permissions?role=$TEST_ROLE" >/dev/null \
  || fail "list role permissions failed"

step "7/8 Upsert role permissions (no If-Match)"
curl -sf -X PUT "$BASE_URL/auth/admin/role-permissions/null/$TEST_ROLE" \
  "${auth_hdr[@]}" -H 'Content-Type: application/json' \
  -d '{"menu_keys":["profiles:lookup","profiles:read"],"revoke_sessions":false}' >/dev/null \
  || fail "upsert role permissions failed"

step "8/8 Delete menu node"
DELETE_STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$BASE_URL/auth/admin/menus/$TEST_MENU_KEY" \
  "${auth_hdr[@]}" -H "If-Match: $MENU_UPD_DATE")
[[ "$DELETE_STATUS" == "204" ]] || fail "delete menu expected 204, got $DELETE_STATUS"

echo "OK — admin API smoke passed (login + 7 admin operations + SC-5 412 check)"
