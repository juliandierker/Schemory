# Schemory Production Scripts

This directory contains production-grade deployment scripts for Schemory.

## Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| `deploy-prod.sh` | Full clean deployment | `./scripts/deploy-prod.sh` |
| `update-prod.sh` | Zero-downtime update | `./scripts/update-prod.sh` |
| `health-check.sh` | Verify all services | `./scripts/health-check.sh` |
| `rollback-prod.sh` | Emergency rollback | `./scripts/rollback-prod.sh <commit>` |

## Quick Start

### First Time Deployment
```bash
# Run the deploy script
./scripts/deploy-prod.sh

# Verify everything works
./scripts/health-check.sh
```

### Regular Updates
```bash
# Update to latest version
./scripts/update-prod.sh
```

### Emergency Rollback
```bash
# Find a good commit
git log --oneline -5

# Rollback to that commit
./scripts/rollback-prod.sh <commit-hash>
```

## Requirements

- Docker and Docker Compose installed
- Node.js >= 18.0.0
- `.env` file configured (see AGENTS.md)
- `jq` installed for JSON parsing (optional, for pretty output)

## Script Details

### deploy-prod.sh
- Stops all existing containers
- Removes old volumes
- Pulls latest images
- Builds fresh images
- Starts all services
- Waits 30 seconds for initialization
- Shows deployment status

**Use for:** First-time deployments, major version updates

### update-prod.sh
- Pulls latest code
- Builds new images
- Stops current services
- Starts updated services
- Shows update status

**Use for:** Regular updates, bug fixes, minor version bumps

### health-check.sh
- Checks container status
- Tests HTTP endpoints
- Verifies database connectivity
- Color-coded output (green=OK, red=FAILED)
- Returns exit code 0 if all healthy, 1 if any failures

**Use for:** Verifying deployments, monitoring, CI/CD pipelines

### rollback-prod.sh
- Resets to specified commit
- Force pushes to origin (rewrites history)
- Redeploys from that commit

**Use for:** Emergency rollbacks when updates fail

**Warning:** Force pushing rewrites Git history. Only use for emergency rollbacks.

## Environment Configuration

Before running any scripts, ensure your `.env` file exists and contains:

```bash
NODE_ENV=production
SERVER_PORT=3000
DASHBOARD_PORT=80
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=schemory
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=schemory
RESEND_API_KEY=your_key
EMAIL_FROM_ADDRESS=noreply@schemory.org
ACTIVATION_BASE_URL=https://schemory.org/activate
VITE_API_URL=http://server:3000
```

See AGENTS.md for complete configuration details.

## Troubleshooting

If scripts fail:

1. **Check logs:**
   ```bash
   docker compose -f docker-compose.prod.yml logs
   ```

2. **Manual verification:**
   ```bash
   docker compose -f docker-compose.prod.yml ps
   curl http://localhost:3000/health
   ```

3. **Clean slate:**
   ```bash
   docker compose -f docker-compose.prod.yml down -v
   docker volume prune -f
   ./scripts/deploy-prod.sh
   ```

## Security Notes

- Scripts use `set -e` to fail fast on errors
- No passwords or secrets are hardcoded
- All credentials come from environment variables
- Rollback script uses force push - use with caution
