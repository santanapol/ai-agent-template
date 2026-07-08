#!/usr/bin/env bash
# First-time staging server bootstrap (run on host after clone).
#
# Usage:
#   bash scripts/setup-staging.sh              # full app setup
#   bash scripts/setup-staging.sh --host       # OS packages + full app setup
#   bash scripts/setup-staging.sh --skip-seed  # skip DB init/seed
#   bash scripts/setup-staging.sh --nginx      # also install nginx site config
#
# Prereqs (without --host): Node >=24, Docker, docker compose, pm2, git
# Guide: server-environment/staging/RUNBOOK.md
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND="$ROOT/backend"
STAGING_DOMAIN="${STAGING_DOMAIN:-zero-staging.168bits.com}"
NGINX_SITE="/etc/nginx/sites-available/zero-staging"

DO_HOST=false
DO_SEED=true
DO_NGINX=false

for arg in "$@"; do
  case "$arg" in
    --host) DO_HOST=true ;;
    --skip-seed) DO_SEED=false ;;
    --nginx) DO_NGINX=true ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg (try --help)" >&2
      exit 1
      ;;
  esac
done

log() { echo ""; echo "==> $*"; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

wait_mongo() {
  local i=1
  while [[ $i -le 60 ]]; do
    if docker exec zero-platform-mongodb mongosh --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
      echo "  ✓ MongoDB ready"
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  echo "  ✗ MongoDB not ready after 60s" >&2
  return 1
}

wait_redis() {
  local i=1
  while [[ $i -le 30 ]]; do
    if docker exec zero-platform-redis redis-cli ping 2>/dev/null | grep -q PONG; then
      echo "  ✓ Redis ready"
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  echo "  ✗ Redis not ready after 30s" >&2
  return 1
}

if $DO_HOST; then
  log "Host bootstrap (apt, Node 24, pm2, nginx, ufw)"
  sudo apt update && sudo apt upgrade -y
  sudo apt install -y nginx docker.io docker-compose-v2 git curl
  if ! command -v node >/dev/null 2>&1 || [[ "$(node -p "process.versions.node.split('.')[0]")" -lt 24 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
    sudo apt install -y nodejs
  fi
  if ! command -v pm2 >/dev/null 2>&1; then
    sudo npm install -g pm2
  fi
  sudo ufw allow OpenSSH || true
  sudo ufw allow 'Nginx Full' || true
  sudo ufw --force enable || true
fi

log "Check prerequisites"
require_cmd node
require_cmd npm
require_cmd docker
require_cmd pm2
node -e "const m=Number(process.versions.node.split('.')[0]); if(m<24) { console.error('Node >=24 required'); process.exit(1) }"

log "Environment files (.env.staging)"
bash "$SCRIPT_DIR/staging-init-env.sh"
if [[ ! -f "$BACKEND/auth/.env.staging" ]]; then
  echo "Missing backend/auth/.env.staging — copy from dev machine or edit after staging-init-env.sh" >&2
  exit 1
fi

log "Docker — MongoDB + Redis (localhost bind)"
(
  cd "$BACKEND"
  docker compose -f docker-compose.staging.yml up -d
)
wait_mongo
wait_redis

log "npm ci — backend + frontend"
bash "$BACKEND/scripts/install-all-deps.sh"

if $DO_SEED; then
  log "Database init + seed"
  bash "$SCRIPT_DIR/staging-seed-all.sh"
  bash "$SCRIPT_DIR/staging-verify-seed.sh"
else
  echo "  (skipped — --skip-seed)"
fi

log "Frontend build (staging)"
npm run build:staging --prefix "$ROOT/frontend/backoffice-next"

log "PM2 — ecosystem.staging.config.js"
if pm2 describe zero-auth >/dev/null 2>&1; then
  pm2 reload "$BACKEND/ecosystem.staging.config.js"
else
  pm2 start "$BACKEND/ecosystem.staging.config.js"
fi
pm2 save
pm2 startup 2>/dev/null | tail -1 | grep -q 'sudo' && pm2 startup 2>/dev/null | tail -1 | bash || true

if $DO_NGINX; then
  log "Nginx site — $STAGING_DOMAIN"
  sudo tee "$NGINX_SITE" >/dev/null <<EOF
server {
    listen 80;
    server_name ${STAGING_DOMAIN};

    location /_next/static/ {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /auth/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
  sudo ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/zero-staging
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t
  sudo systemctl reload nginx
  echo "  ✓ Nginx configured — add SSL via Cloudflare origin cert or certbot"
fi

log "Done"
echo "  pm2 status"
pm2 status --no-color | head -20
echo ""
echo "  URL: https://${STAGING_DOMAIN}"
echo "  login: see server-environment/staging/credential.md"
echo "  re-deploy: bash scripts/deploy-staging.sh"
