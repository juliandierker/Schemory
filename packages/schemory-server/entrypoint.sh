#!/bin/sh
set -e

echo "🚀 Starting Schemory Server..."

# Run migrations based on database type
# Note: Only run migrations once, using if-elif-else to avoid duplicates
if echo "$DATABASE_URL" | grep -q "^file:"; then
  echo "📱 Running SQLite migrations..."
  node dist/db/migrate.js
  echo "✅ SQLite migrations complete"
elif echo "$DATABASE_URL" | grep -q "^postgres"; then
  echo "📱 Running PostgreSQL migrations..."
  # Wait for PostgreSQL to be ready before running migrations
  echo "⏳ Waiting for PostgreSQL to be ready..."
  until node -e "const { Client } = require('pg'); (async () => { try { const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect(); await c.end(); process.exit(0); } catch(e) { process.exit(1); } })()"; do
    echo "⏳ PostgreSQL not ready, retrying in 2 seconds..."
    sleep 2
  done
  echo "✅ PostgreSQL is ready!"
  node dist/db/migrate-pg.js
  echo "✅ PostgreSQL migrations complete"
fi

# Start the server
exec node dist/index.js
