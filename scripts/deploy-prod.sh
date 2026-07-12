#!/bin/bash
# Production Deployment Script for Schemory
# This script provides a clean, reliable deployment process

set -e  # Exit on any error

echo "🧹 Cleaning up old containers and volumes..."
docker compose -f docker-compose.prod.yml down -v 2>/dev/null || true
docker stop caddy 2>/dev/null || true
docker rm caddy 2>/dev/null || true
docker volume prune -f 2>/dev/null || true
docker network prune -f 2>/dev/null || true

echo "🏗️ Pulling latest images..."
docker compose -f docker-compose.prod.yml pull

echo "🔨 Building fresh images..."
docker compose -f docker-compose.prod.yml build --no-cache

echo "🚀 Starting all services..."
docker compose -f docker-compose.prod.yml up -d

echo "⏳ Waiting for services to initialize..."
sleep 30

echo ""
echo "=== Deployment Status ==="
docker compose -f docker-compose.prod.yml ps

echo ""
echo "=== Health Check ==="
curl -s http://localhost:3000/health | jq .

echo ""
echo "🎉 Production deployment complete!"
echo ""
echo "Next steps:"
echo "  - Run: ./scripts/health-check.sh"
echo "  - Test: curl https://api.schemory.org/health"
echo "  - View logs: docker compose -f docker-compose.prod.yml logs -f"
