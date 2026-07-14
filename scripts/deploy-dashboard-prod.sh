#!/usr/bin/env bash
# Rebuild and restart ONLY the production dashboard (nginx static UI).
# Leaves postgres, server, and caddy running.
#
# Usage (from repo root on the VPS):
#   ./scripts/deploy-dashboard-prod.sh
#   ./scripts/deploy-dashboard-prod.sh --pull
#   ./scripts/deploy-dashboard-prod.sh --no-cache
#
# VITE_API_URL is baked in at build time — keep it as https://api.schemory.org
# in .env.production (never http://server:3000).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_PROJECT_NAME=schemory-prod
export COMPOSE_PROJECT_NAME

HEALTH_TIMEOUT_SEC="${HEALTH_TIMEOUT_SEC:-120}"
SITE_URL="${SITE_URL:-https://schemory.org}"

PULL_GIT=0
NO_CACHE=0
ENV_FILE=""

for arg in "$@"; do
  case "$arg" in
    --pull) PULL_GIT=1 ;;
    --no-cache) NO_CACHE=1 ;;
    -h|--help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Use --help for usage." >&2
      exit 2
      ;;
  esac
done

log()  { printf '\n==> %s\n' "$*"; }
ok()   { printf '    OK  %s\n' "$*"; }
die() {
  echo "" >&2
  echo "ERROR: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

resolve_env_file() {
  if [ -f .env.production ]; then
    ENV_FILE=.env.production
  elif [ -f .env ]; then
    ENV_FILE=.env
  else
    die "Missing production env file (.env.production or .env)"
  fi
}

looks_like_dev_env() {
  if grep -Eq '^[[:space:]]*SCHEMORY_ENV[[:space:]]*=[[:space:]]*development' "$ENV_FILE"; then
    return 0
  fi
  if grep -Eq '^[[:space:]]*VITE_API_URL[[:space:]]*=[[:space:]]*https?://(localhost|127\.0\.0\.1|server)' "$ENV_FILE"; then
    return 0
  fi
  return 1
}

wait_for_container_healthy() {
  local name="$1"
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SEC))
  local health status

  while (( SECONDS < deadline )); do
    status="$(docker inspect -f '{{.State.Status}}' "$name" 2>/dev/null || echo missing)"
    health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$name" 2>/dev/null || echo missing)"

    if [ "$status" = "running" ] && [ "$health" = "healthy" ]; then
      ok "$name is healthy"
      return 0
    fi
    if [ "$status" = "exited" ] || [ "$status" = "dead" ] || [ "$status" = "missing" ] || [ "$health" = "unhealthy" ]; then
      docker logs --tail 60 "$name" >&2 || true
      die "$name failed (status=$status health=$health)"
    fi
    sleep 2
  done

  docker logs --tail 60 "$name" >&2 || true
  die "$name did not become healthy within ${HEALTH_TIMEOUT_SEC}s"
}

# --- main ---

require_cmd docker
require_cmd curl
resolve_env_file

if looks_like_dev_env; then
  die "$ENV_FILE looks like local/dev. Use a production VITE_API_URL (https://api.schemory.org)."
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

COMPOSE=(
  docker compose
  --project-name schemory-prod
  --env-file "$ENV_FILE"
  -f docker-compose.prod.yml
)

[ -n "${VITE_API_URL:-}" ] || die "VITE_API_URL missing in $ENV_FILE"

case "${VITE_API_URL}" in
  http://server:*|http://server/*|http://localhost:*|http://127.0.0.1:*)
    die "VITE_API_URL must be public (https://api.schemory.org), got: ${VITE_API_URL}"
    ;;
esac

docker info >/dev/null 2>&1 || die "Docker daemon not reachable."

if [ "$PULL_GIT" -eq 1 ]; then
  log "Pulling latest code"
  require_cmd git
  git pull --ff-only origin main
  ok "git pull --ff-only origin main"
fi

log "Building dashboard only (VITE_API_URL=${VITE_API_URL})"
if [ "$NO_CACHE" -eq 1 ]; then
  "${COMPOSE[@]}" build --no-cache --pull dashboard
else
  "${COMPOSE[@]}" build --pull dashboard
fi
ok "dashboard image built"

log "Recreating dashboard container (postgres/server/caddy untouched)"
"${COMPOSE[@]}" up -d --no-deps --force-recreate dashboard
ok "dashboard recreated"

log "Verifying dashboard"
wait_for_container_healthy schemory-dashboard-prod

docker exec schemory-dashboard-prod wget -q -O - http://127.0.0.1/health | grep -q ok \
  || die "Dashboard nginx /health failed"
ok "Dashboard /health ok"

if curl -ksS -o /dev/null -w '%{http_code}' "$SITE_URL" | grep -qE '200|301|302'; then
  ok "Public site $SITE_URL reachable"
else
  echo "    WARN Public site $SITE_URL not reachable yet — check DNS/Caddy/IPv6."
fi

echo ""
echo "Dashboard update succeeded."
echo "  Site:  $SITE_URL"
echo "  Logs:  docker compose --project-name schemory-prod -f docker-compose.prod.yml logs -f dashboard"
echo "  Env:   $ENV_FILE"
