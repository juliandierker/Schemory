#!/usr/bin/env bash
# Verify Schemory PRODUCTION stack health (project=schemory-prod only)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

PASS=0
FAIL=0

ok()   { echo -e "${GREEN}OK${NC}   $*"; PASS=$((PASS + 1)); }
fail() { echo -e "${RED}FAIL${NC} $*"; FAIL=$((FAIL + 1)); }

COMPOSE=(docker compose --project-name schemory-prod -f docker-compose.prod.yml)

echo "========================================"
echo "  Schemory Production Health Check"
echo "  (project=schemory-prod)"
echo "========================================"
echo ""

if docker ps --format '{{.Names}}' | grep -Eq 'schemory-(postgres|server|dashboard)-(dev|local)$'; then
  echo "Note: local/dev containers are also running — this check only inspects *-prod."
  echo ""
fi

echo "--- Containers ---"
"${COMPOSE[@]}" ps || true
echo ""

echo "--- Container health ---"
for name in schemory-postgres-prod schemory-server-prod schemory-dashboard-prod; do
  status="$(docker inspect -f '{{.State.Status}}' "$name" 2>/dev/null || echo missing)"
  health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$name" 2>/dev/null || echo missing)"
  if [ "$status" = "running" ] && [ "$health" = "healthy" ]; then
    ok "$name ($health)"
  else
    fail "$name (status=$status health=$health)"
  fi
done

caddy_status="$(docker inspect -f '{{.State.Status}}' schemory-caddy-prod 2>/dev/null || echo missing)"
if [ "$caddy_status" = "running" ]; then
  ok "schemory-caddy-prod (running)"
else
  fail "schemory-caddy-prod (status=$caddy_status)"
fi

echo ""
echo "--- In-network checks ---"
if docker exec schemory-server-prod wget -q -O - http://127.0.0.1:3000/health 2>/dev/null | grep -q '"status":"ok"'; then
  ok "Server /health reports status=ok"
else
  fail "Server /health"
fi

if docker exec schemory-server-prod node -e "
  const { query } = require('./server/dist/db.js');
  query('SELECT 1').then(() => process.exit(0)).catch(() => process.exit(1));
" >/dev/null 2>&1; then
  ok "Server → Postgres"
else
  fail "Server → Postgres"
fi

if docker exec schemory-dashboard-prod wget -q -O - http://127.0.0.1/health 2>/dev/null | grep -q ok; then
  ok "Dashboard /health"
else
  fail "Dashboard /health"
fi

echo ""
echo "--- Public edge ---"
api_code="$(curl -ksS -o /tmp/schemory-api-health.json -w '%{http_code}' https://api.schemory.org/health 2>/dev/null || echo 000)"
if [ "$api_code" = "200" ] && grep -q '"status":"ok"' /tmp/schemory-api-health.json 2>/dev/null; then
  ok "https://api.schemory.org/health"
else
  fail "https://api.schemory.org/health (HTTP $api_code)"
fi

site_code="$(curl -ksS -o /dev/null -w '%{http_code}' https://schemory.org 2>/dev/null || echo 000)"
if echo "$site_code" | grep -qE '200|301|302'; then
  ok "https://schemory.org (HTTP $site_code)"
else
  fail "https://schemory.org (HTTP $site_code)"
fi

echo ""
echo "========================================"
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}All checks passed ($PASS)${NC}"
  exit 0
fi
echo -e "${RED}$FAIL check(s) failed ($PASS passed)${NC}"
exit 1
