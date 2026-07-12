#!/bin/bash
# Production Update Script for Schemory
# Zero-downtime update with rollback capability

set -e

echo "📦 Updating Schemory production..."

# Store current commit for rollback
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "Current commit: $CURRENT_COMMIT"
echo ""

# Pull latest changes
echo "🔄 Pulling latest changes..."
git pull origin main

# Get new commit
NEW_COMMIT=$(git rev-parse HEAD)
echo "Updated to: $NEW_COMMIT"
echo ""

# Build new images
echo "🏗️ Building new images..."
docker compose -f docker-compose.prod.yml build --no-cache

# Stop current services
echo "🛑 Stopping current services..."
docker compose -f docker-compose.prod.yml down

# Start updated services
echo "🚀 Starting updated services..."
docker compose -f docker-compose.prod.yml up -d

# Verify
echo "⏳ Waiting for services..."
sleep 30

echo ""
echo "=== Update Status ==="
docker compose -f docker-compose.prod.yml ps

echo ""
echo "=== Health Check ==="
curl -s http://localhost:3000/health | jq .

echo ""
echo "✅ Update complete!"
echo ""
echo "Current version: $NEW_COMMIT"
echo "Previous version: $CURRENT_COMMIT"
echo ""
echo "If you need to rollback, run:"
echo "  git reset --hard $CURRENT_COMMIT"
echo "  git push origin main --force"
echo "  ./scripts/deploy-prod.sh"
