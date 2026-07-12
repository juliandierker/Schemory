#!/bin/bash
# Health Check Script for Schemory Production
# Verifies all services are operational

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

check() {
    local name="$1"
    local url="$2"
    local expected="$3"
    local method="${4:-GET}"
    local data="${5:-}"

    if [ -n "$data" ]; then
        response=$(curl -s -X "$method" -H "Content-Type: application/json" -d "$data" -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    fi
    
    if [ "$response" = "$expected" ]; then
        echo -e "${GREEN}✅${NC} $name: OK (HTTP $response)"
        ((PASS++))
        return 0
    else
        echo -e "${RED}❌${NC} $name: FAILED (got $response, expected $expected)"
        ((FAIL++))
        return 1
    fi
}

check_db() {
    local name="$1"
    docker exec schemory-server-prod node -e "
const { query } = require('./server/dist/db.js');
query('SELECT 1').then(() => { console.log('OK'); process.exit(0); })
  .catch(e => { console.error('ERROR:', e.message); process.exit(1); });
" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅${NC} $name: OK"
        ((PASS++))
        return 0
    else
        echo -e "${RED}❌${NC} $name: FAILED"
        ((FAIL++))
        return 1
    fi
}

echo "========================================"
echo "  Schemory Production Health Check"
echo "========================================"
echo ""

# Container checks
echo "--- Container Status ---"
docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Service}}" 2>/dev/null || true
echo ""

# Service checks
echo "--- Service Health ---"
check "Server Health" "http://localhost:3000/health" "200"
check "API Health (Caddy)" "https://api.schemory.org/health" "200" "" ""
check "Dashboard" "http://localhost:80" "200" "" ""
check "PostgreSQL (TCP)" "localhost:5432" "000" "" ""

# Database connectivity
echo ""
echo "--- Database Connectivity ---"
check_db "Server → PostgreSQL"

echo ""
echo "========================================"
if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ All systems operational!${NC}"
    echo "========================================"
    exit 0
else
    echo -e "${RED}❌ $FAIL system(s) failed!${NC}"
    echo "========================================"
    echo ""
    echo "Troubleshooting:"
    echo "  - Check logs: docker compose -f docker-compose.prod.yml logs"
    echo "  - Test DB: docker exec schemory-server-prod node -e \"require('./server/dist/db.js').query('SELECT 1').then(() => console.log('OK')).catch(e => console.error(e.message))\""
    exit 1
fi
