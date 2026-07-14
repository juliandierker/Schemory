# Docker Configuration

This document describes the Docker setup for Schemory, including development and production configurations.

## Overview

Schemory uses **separate Compose projects** for local and production so volumes, networks, and env files never collide.

| Stack | Compose file | Project name | Env file |
|-------|--------------|--------------|----------|
| Local hot-reload | `docker-compose.dev.yml` | `schemory-dev` | `.env.development` |
| Local lightweight | `docker-compose.yml` | `schemory-local` | (hardcoded / `.env.development`) |
| Production VPS | `docker-compose.prod.yml` | `schemory-prod` | `.env.production` |

Services: **server** (Fastify), **dashboard** (Vite/nginx), **postgres**, plus **caddy** in production only.

## Architecture Decisions

### Dashboard Serving Strategy
Production dashboard static files are served by **nginx** in a separate container. While we could have Fastify serve the static files directly (simpler, fewer containers), using nginx provides:
- Better performance for static file serving at scale
- Proper handling of React Router client-side routing
- Standard production practice for SPAs

### Database in Production
The production compose file **expects an externally-managed PostgreSQL instance** (recommended). Persistent data should not live in ephemeral containers. For local development, a containerized Postgres is included.

### Hot Reload (Development)
- **Server**: Uses `tsx` watch mode with bind-mounted source code
- **Dashboard**: Uses Vite's built-in dev server with bind-mounted source code
- Both containers have source code mounted from the host, enabling live reload without image rebuilds

## Quick Start

### Prerequisites
- Docker installed and running
- Docker Compose v2+ (included with modern Docker installations)

### Local Development

```bash
# Preferred
./scripts/dev-up.sh

# Equivalent
docker compose -f docker-compose.dev.yml up

docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml logs -f
```

**Services available:**
- Server: http://localhost:3000 (API + health check at /health)
- Dashboard: http://localhost:5173 (Vite dev server)
- Database: postgres://postgres:postgres@localhost:5432/schemory

**Hot reload:** Edit any source file in `server/src/` or `dashboard/src/` on your host machine, and changes will be reflected in the running containers without a rebuild.

### Production Deployment (VPS only)

```bash
cp .env.production.example .env.production
# edit secrets — VITE_API_URL=https://api.schemory.org

./scripts/deploy-prod.sh
./scripts/health-check.sh
```

Only Caddy publishes host ports 80/443. Do not use `docker-compose.prod.yml` for laptop day-to-day work.

## Dockerfiles

### Server Dockerfile (`server/Dockerfile`)
- **Builder stage**: Installs all dependencies, builds TypeScript
- **Final stage**: Minimal image with only production dependencies, non-root user
- Includes migration runner that supports both `DATABASE_URL` and individual DB_* variables
- Runs migrations automatically on startup before starting the server

### Dashboard Dockerfile (`dashboard/Dockerfile`)
- **Builder stage**: Installs all dependencies, builds with Vite
- **Final stage**: nginx:alpine serving static files, non-root user
- Configured to handle React Router client-side routing

## Environment Variables

### Development (`docker-compose.dev.yml`)
The development compose file uses hardcoded values for simplicity:
- Database: `postgres://postgres:postgres@postgres:5432/schemory`
- Server port: 3000
- Dashboard port: 5173
- Activation URL: `http://localhost:5173/auth/activate`

You can override these by creating a `.env` file or passing `-f docker-compose.dev.yml -f docker-compose.override.yml`.

### Production (`docker-compose.prod.yml`)
All configuration comes from environment variables:
- `SERVER_PORT`: API server port (default: 3000)
- `DASHBOARD_PORT`: Dashboard port (default: 80)
- `DATABASE_URL`: Full PostgreSQL connection string
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Alternative to DATABASE_URL
- `RESEND_API_KEY`: Resend API key for sending activation emails
- `EMAIL_FROM_ADDRESS`: From address for activation emails
- `ACTIVATION_BASE_URL`: Base URL for activation links
- `APP_BASE_URL`: Base URL for the application
- `NODE_ENV`: Should be "production"

## Running Migrations

### Development
Migrations are not automatically run in development. To run migrations:
```bash
docker compose -f docker-compose.dev.yml exec server pnpm --filter @schemory/server migrate
```

### Production
Migrations are automatically run when the server container starts (as part of the CMD in the Dockerfile). If you need to run them separately:
```bash
docker compose -f docker-compose.prod.yml run --rm server node /app/run-migrations.js
```

## Building and Pushing Images

```bash
# Build production images
docker compose -f docker-compose.prod.yml build

# Tag and push to registry
docker tag schemory-server-prod your-registry/schemory-server:latest
docker tag schemory-dashboard-prod your-registry/schemory-dashboard:latest

docker push your-registry/schemory-server:latest
docker push your-registry/schemory-dashboard:latest
```

## Troubleshooting

### Port already in use
Change the port mappings in your `.env` file or compose override:
```yaml
# In docker-compose.override.yml
services:
  server:
    ports:
      - "3001:3000"
  dashboard:
    ports:
      - "5174:5173"
```

### Database connection issues
Ensure the database service is healthy:
```bash
docker compose -f docker-compose.dev.yml logs postgres
```

Check that the server can connect:
```bash
docker compose -f docker-compose.dev.yml exec server ping -c 1 postgres
```

### Hot reload not working
Ensure you're editing files on the host (not inside the container). The mounted volumes in the dev compose file sync changes from host to container.

## Files Reference

| File | Purpose |
|------|---------|
| `server/Dockerfile` | Multi-stage Dockerfile for server (builder + production) |
| `dashboard/Dockerfile` | Multi-stage Dockerfile for dashboard (builder + nginx) |
| `docker-compose.dev.yml` | Development configuration with hot reload |
| `docker-compose.prod.yml` | Production configuration (no hardcoded values) |
| `docker-compose.yml` | Original Stage 2 file (test-only Postgres) |
| `.dockerignore` | Files to exclude from Docker builds |
| `.env.example` | Example environment variables |
| `docs/docker.md` | This documentation |
