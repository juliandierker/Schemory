#!/usr/bin/env bash
# Schemory production deploy for Hetzner (or any Docker VPS)
#
# Safe by default:
#   - NEVER deletes postgres/caddy volumes
#   - Fails fast on missing .env / required vars
#   - Waits on real health (DB-backed /health → HTTP 200)
#   - Prints diagnostics + password-mismatch hints on failure
#
# Usage (from repo root on the VPS):
#   ./scripts/deploy-prod.sh
#   ./scripts/deploy-prod.sh --pull          # git pull origin main first
#   ./scripts/deploy-prod.sh --no-cache      # rebuild images without cache
#   ./scripts/deploy-prod.sh --skip-build    # only recreate/restart containers
#
# Nuclear reset (DESTROYS DATABASE — confirmation required):
#   ./scripts/deploy-prod.sh --wipe-data

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Always isolate from local/dev compose projects
COMPOSE_PROJECT_NAME=schemory-prod
export COMPOSE_PROJECT_NAME

HEALTH_TIMEOUT_SEC="${HEALTH_TIMEOUT_SEC:-180}"
API_HOST_HEALTH_URL="${API_HOST_HEALTH_URL:-https://api.schemory.org/health}"
SITE_URL="${SITE_URL:-https://schemory.org}"

PULL_GIT=0
NO_CACHE=0
SKIP_BUILD=0
WIPE_DATA=0
ENV_FILE=""

for arg in "$@"; do
  case "$arg" in
    --pull) PULL_GIT=1 ;;
    --no-cache) NO_CACHE=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --wipe-data) WIPE_DATA=1 ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Use --help for usage." >&2
      exit 2
      ;;
  esac
done

resolve_env_file() {
  if [ -f .env.production ]; then
    ENV_FILE=.env.production
  elif [ -f .env ]; then
    ENV_FILE=.env
  else
    die "Missing production env file. On the VPS run: cp .env.production.example .env.production"
  fi
}

# Populated after resolve_env_file + load
COMPOSE=()

log()  { printf '\n==> %s\n' "$*"; }
ok()   { printf '    OK  %s\n' "$*"; }
fail() { printf '    FAIL %s\n' "$*" >&2; }

die() {
  echo "" >&2
  echo "ERROR: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

load_dotenv() {
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
}

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    die "Missing required env var in $ENV_FILE: $name"
  fi
}

looks_like_dev_env() {
  # Returns 0 if this file must NOT be used for production deploy
  if grep -Eq '^[[:space:]]*SCHEMORY_ENV[[:space:]]*=[[:space:]]*development' "$ENV_FILE"; then
    return 0
  fi
  if grep -Eq '^[[:space:]]*VITE_API_URL[[:space:]]*=[[:space:]]*https?://(localhost|127\.0\.0\.1)' "$ENV_FILE"; then
    return 0
  fi
  if grep -Eq '^[[:space:]]*ACTIVATION_BASE_URL[[:space:]]*=[[:space:]]*https?://(localhost|127\.0\.0\.1)' "$ENV_FILE"; then
    return 0
  fi
  return 1
}

preflight() {
  log "Preflight checks"
  require_cmd docker
  require_cmd curl

  [ -f docker-compose.prod.yml ] || die "docker-compose.prod.yml not found (run from repo root)."
  [ -f Caddyfile ] || die "Caddyfile not found."

  # Env isolation BEFORE docker — refuse local/dev configs immediately
  resolve_env_file
  if looks_like_dev_env; then
    die "$ENV_FILE looks like a LOCAL/dev config. Use .env.production on the VPS (see .env.production.example)."
  fi

  load_dotenv

  COMPOSE=(
    docker compose
    --project-name schemory-prod
    --env-file "$ENV_FILE"
    -f docker-compose.prod.yml
  )

  require_env POSTGRES_USER
  require_env POSTGRES_PASSWORD
  require_env POSTGRES_DB
  require_env VITE_API_URL
  require_env ACTIVATION_BASE_URL

  if [ "${SCHEMORY_ENV:-}" != "production" ] && [ "${NODE_ENV:-}" != "production" ]; then
    die "Set SCHEMORY_ENV=production (or NODE_ENV=production) in $ENV_FILE"
  fi

  case "${VITE_API_URL}" in
    http://server:*|http://server/*|http://localhost:*|http://127.0.0.1:*|https://localhost:*|https://127.0.0.1:*)
      die "VITE_API_URL must be browser-reachable public API (e.g. https://api.schemory.org), got: ${VITE_API_URL}"
      ;;
  esac

  docker info >/dev/null 2>&1 || die "Docker daemon not reachable. Start Docker and retry."
  docker compose version >/dev/null 2>&1 || die "Docker Compose v2 required (docker compose)."

  if [ -z "${RESEND_API_KEY:-}" ] || [[ "${RESEND_API_KEY}" == re_your_* ]]; then
    echo "    WARN RESEND_API_KEY unset/placeholder — activation emails will fail in production."
  fi

  # Warn if local/dev containers are also running on this host (laptop dry-run footgun)
  if docker ps --format '{{.Names}}' | grep -Eq 'schemory-(postgres|server|dashboard)-(dev|local)$'; then
    echo "    WARN Local/dev Schemory containers are running on this host."
    echo "         Prod project/volumes are isolated (schemory-prod), but ports 80/443 may conflict."
  fi

  # Port 80/443 must be free for Caddy (common VPS footgun: apache/nginx still bound)
  if command -v ss >/dev/null 2>&1; then
    if ss -ltn | grep -qE ':80\s'; then
      if ! docker ps --format '{{.Names}}' | grep -qx 'schemory-caddy-prod'; then
        die "Host port 80 is in use. Stop apache/nginx or the conflicting process, then retry."
      fi
    fi
    if ss -ltn | grep -qE ':443\s'; then
      if ! docker ps --format '{{.Names}}' | grep -qx 'schemory-caddy-prod'; then
        die "Host port 443 is in use. Free it before deploying."
      fi
    fi
  fi

  ok "project=schemory-prod env=$ENV_FILE (isolated from schemory-dev / schemory-local)"
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
    if [ "$status" = "exited" ] || [ "$status" = "dead" ] || [ "$status" = "missing" ]; then
      fail "$name status=$status health=$health"
      docker logs --tail 80 "$name" >&2 || true
      return 1
    fi
    if [ "$health" = "unhealthy" ]; then
      fail "$name became unhealthy"
      docker logs --tail 80 "$name" >&2 || true
      return 1
    fi
    sleep 3
  done

  fail "$name did not become healthy within ${HEALTH_TIMEOUT_SEC}s (status=$status health=$health)"
  docker logs --tail 80 "$name" >&2 || true
  return 1
}

wait_http_200() {
  local url="$1"
  local label="$2"
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SEC))
  local code body

  while (( SECONDS < deadline )); do
    body="$(curl -ksS -o /tmp/schemory-health.json -w '%{http_code}' "$url" 2>/dev/null || echo 000)"
    code="$body"
    if [ "$code" = "200" ]; then
      if command -v jq >/dev/null 2>&1; then
        ok "$label → HTTP 200 $(jq -c . </tmp/schemory-health.json 2>/dev/null || cat /tmp/schemory-health.json)"
      else
        ok "$label → HTTP 200"
      fi
      return 0
    fi
    sleep 3
  done

  fail "$label → expected HTTP 200 from $url (last=$code)"
  [ -f /tmp/schemory-health.json ] && cat /tmp/schemory-health.json >&2 || true
  return 1
}

verify_stack() {
  log "Waiting for container health"
  wait_for_container_healthy schemory-postgres-prod
  wait_for_container_healthy schemory-server-prod
  wait_for_container_healthy schemory-dashboard-prod
  # Caddy image has no HEALTHCHECK; ensure it is running
  local caddy_status
  caddy_status="$(docker inspect -f '{{.State.Status}}' schemory-caddy-prod 2>/dev/null || echo missing)"
  [ "$caddy_status" = "running" ] || die "Caddy is not running (status=$caddy_status)"
  ok "schemory-caddy-prod is running"

  log "HTTP / DB verification"
  # Internal API check via docker network (does not need published host port)
  docker exec schemory-server-prod wget -q -O - http://127.0.0.1:3000/health | grep -q '"status":"ok"' \
    || die "Server /health did not report status=ok inside container"
  ok "Server /health (in-container) reports status=ok"

  docker exec schemory-server-prod node -e "
    const { query } = require('./server/dist/db.js');
    query('SELECT 1 AS ok').then((r) => {
      if (!r.rows.length) process.exit(2);
      console.log('db-ok');
    }).catch((e) => { console.error(e.message); process.exit(1); });
  " | grep -q db-ok || die "Server → Postgres query failed"
  ok "Server → Postgres query succeeded"

  docker exec schemory-dashboard-prod wget -q -O - http://127.0.0.1/health | grep -q ok \
    || die "Dashboard nginx /health failed"
  ok "Dashboard nginx /health ok"

  # Public edge (best-effort if DNS/certs not ready yet on first boot)
  if wait_http_200 "$API_HOST_HEALTH_URL" "Public API $API_HOST_HEALTH_URL"; then
    :
  else
    echo "    WARN Public API check failed — containers are healthy; check DNS/Caddy/firewall."
  fi
  if curl -ksS -o /dev/null -w '%{http_code}' "$SITE_URL" | grep -qE '200|301|302'; then
    ok "Public site $SITE_URL reachable"
  else
    echo "    WARN Public site $SITE_URL not reachable yet — check DNS/Caddy."
  fi
}

dump_diagnostics() {
  echo "" >&2
  echo "=== Diagnostics ===" >&2
  "${COMPOSE[@]}" ps >&2 || true
  echo "" >&2
  echo "--- server logs ---" >&2
  docker logs --tail 100 schemory-server-prod >&2 || true
  echo "" >&2
  echo "--- postgres logs ---" >&2
  docker logs --tail 60 schemory-postgres-prod >&2 || true
  echo "" >&2
  echo "--- caddy logs ---" >&2
  docker logs --tail 60 schemory-caddy-prod >&2 || true

  if docker logs schemory-server-prod 2>&1 | grep -q 'password authentication failed'; then
    echo "" >&2
    echo "HINT: Postgres password auth failed." >&2
    echo "  POSTGRES_PASSWORD in .env must match the password used when the" >&2
    echo "  postgres_data volume was first created. Changing .env alone will NOT" >&2
    echo "  update an existing volume. Fix the password, or only if you accept" >&2
    echo "  data loss: ./scripts/deploy-prod.sh --wipe-data" >&2
  fi
}

# --- main ---

preflight

if [ "$PULL_GIT" -eq 1 ]; then
  log "Pulling latest code"
  require_cmd git
  git pull --ff-only origin main
  ok "git pull --ff-only origin main"
fi

if [ "$WIPE_DATA" -eq 1 ]; then
  log "WIPE DATA requested — this DESTROYS the Postgres volume"
  read -r -p "Type DELETE to confirm wiping production data: " confirm
  [ "$confirm" = "DELETE" ] || die "Wipe aborted."
  "${COMPOSE[@]}" down -v --remove-orphans
  ok "Containers and volumes removed"
else
  log "Stopping app containers (preserving volumes)"
  # Never use -v here — postgres_data / caddy_data must survive deploys
  "${COMPOSE[@]}" down --remove-orphans || true
  # Legacy project name (pre isolation) used directory default "schemory"
  docker compose -p schemory -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
  ok "Containers stopped; volumes preserved"
fi

if [ "$SKIP_BUILD" -eq 0 ]; then
  log "Building images (VITE_API_URL=${VITE_API_URL})"
  if [ "$NO_CACHE" -eq 1 ]; then
    "${COMPOSE[@]}" build --no-cache --pull
  else
    "${COMPOSE[@]}" build --pull
  fi
  ok "Images built"
else
  log "Skipping image build (--skip-build)"
fi

log "Starting stack"
"${COMPOSE[@]}" up -d --remove-orphans
ok "compose up -d"

if ! verify_stack; then
  dump_diagnostics
  die "Deploy verification failed. Stack left running for inspection; fix and re-run."
fi

log "Deployment status"
"${COMPOSE[@]}" ps

echo ""
echo "Production deploy succeeded."
echo "  API health:  $API_HOST_HEALTH_URL"
echo "  Dashboard:   $SITE_URL"
echo "  Logs:        docker compose --project-name schemory-prod -f docker-compose.prod.yml logs -f"
echo "  Health:      ./scripts/health-check.sh"
echo "  Env file:    $ENV_FILE"
