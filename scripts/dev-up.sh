#!/usr/bin/env bash
# Start local development stack (never touches prod project/volumes/env).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Refuse to use production env files for local compose interpolation
if [ -f .env.production ]; then
  echo "Note: .env.production is ignored by this script (prod-only)."
fi

COMPOSE=(docker compose --project-name schemory-dev -f docker-compose.dev.yml)

# Prefer development env file if present (does not load .env.production)
if [ -f .env.development ]; then
  COMPOSE+=(--env-file .env.development)
elif [ -f .env.local ]; then
  COMPOSE+=(--env-file .env.local)
fi

# Guard: refuse if someone pointed SCHEMORY_ENV at production in the env file we load
ENV_FILE=""
[ -f .env.development ] && ENV_FILE=.env.development
[ -z "$ENV_FILE" ] && [ -f .env.local ] && ENV_FILE=.env.local
if [ -n "$ENV_FILE" ] && grep -Eq '^[[:space:]]*SCHEMORY_ENV[[:space:]]*=[[:space:]]*production' "$ENV_FILE"; then
  echo "ERROR: $ENV_FILE has SCHEMORY_ENV=production — use .env.development for local." >&2
  exit 1
fi

echo "==> Starting Schemory LOCAL dev (project=schemory-dev)"
"${COMPOSE[@]}" up --build "$@"
