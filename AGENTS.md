# schemory

Open source web app for teams to share TypeScript types and JSON schemas.
Stack preference: European or open source only.

> **Architecture & Design**: See [ARCHITECTURE.md](./ARCHITECTURE.md) for database schema, API contract, shared types, and CLI config details.

## Concepts
- **Centralized management** — all types/schemas live in one place
- **Team collaboration** — share types/schemas across a team
- **CLI-first** — sync via `npx schemory <command>`
- **Team-required** — all file operations (push/pull) require being in a team

## CLI Commands (in order of use)

| Step | Command | Requires | Result |
|------|---------|----------|--------|
| 1 | `npx schemory signup <email>` | — | sends confirmation email with activation token |
| 1b | `npx schemory resignup <email>` | — | resends activation email for existing account |
| 1c | `npx schemory resend-activation <email>` | — | server endpoint: resends activation email for existing account |
| 2 | `npx schemory activate <act_...>` | step 1 | activates account, prompts to set password, and authenticates CLI |
| 3 | `npx schemory login <email>` | registered account | prompts for password, authenticates CLI, displays welcome message with icon, and shows status |
| 3b | `npx schemory logout` | logged in | clears authentication token, logs out of current session |
| 4 | `npx schemory create <teamName>` | logged in | creates a new team, returns join code |
| 4a | `npx schemory invite <teamId>` | logged in, team member | returns the team's join code |
| 4b | `npx schemory join <joinCode>` | logged in | joins a team via join code |
| 4c | `npx schemory use <teamName>` | logged in, team member | switches active team for push/pull operations |
| 4d | `npx schemory status` | any | shows current login status, active team, and file count |
| 4e | `npx schemory help` | any | shows available CLI commands and usage information |
| 4f | `npx schemory sync` | logged in | syncs local CLI configuration with server data |
| 4g | `npx schemory completion [bash|zsh]` | any | generates shell completion script for tab autocomplete |
| 5 | `npx schemory push <filePath>` | joined team | pushes a type/schema file to team (tab autocomplete for .ts/.json files) |
| 5b | `npx schemory pull [name]` | joined team | pulls all team items, or a single item by name |
| 5c | `npx schemory pullAll` | joined team | pulls all team items (legacy) |

**Note:** Being in a team is required for all file operations (push/pull).

Steps 1–2 are one-time setup. Step 3 is for authentication (including logout). Step 4 creates your first team. Steps 4a–4f are for team management. Steps 5+ repeat for sharing items.

> **CLI Development Note**: When adding or modifying CLI commands, ensure the AGENTS.md CLI commands table and help command are updated accordingly.

> **Security Note**: All passwords use industry-standard bcrypt hashing with salt. Authentication uses secure token-based sessions.

## Tech Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Frontend (dashboard) | React + Vite | keep lightweight, avoid heavy UI frameworks/deps |
| API (server) | Fastify | Node.js |
| Database | PostgreSQL | |
| CLI | Node.js | talks to Fastify API |

## Project Structure (monorepo)
- `/cli` — command-line tool (Node.js, calls API)
- `/server` — Fastify API + PostgreSQL
- `/dashboard` — React + Vite web UI

## Development Principles

| Principle | Rule |
|-----------|------|
| Think before coding | Surface assumptions and tradeoffs before writing code |
| Simplicity first | No abstraction unless it removes real duplication |
| Surgical changes | Only touch files/lines required for the task |
| Goal-driven execution | Write a test or success criterion before implementing |

---

## Infrastructure & Operations

### Local Development Setup

**Server Development**:
- Server source files use `.js` import extensions for compatibility with compiled output
- Development workflow: `pnpm build` + `node dist/index.js` (updated dev script)
- Server requires PostgreSQL connection and runs on port 3000 by default
- Environment variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `ACTIVATION_BASE_URL`, `RESEND_API_KEY`

**CLI Configuration**:
- CLI defaults to `https://api.schemory.org` in production mode, `http://localhost:3000` in development
- Use `NODE_ENV=development` and `SCHEMORY_API_URL=http://localhost:3000` for local testing
- Password prompts use raw mode and may not work in non-interactive shells

### Email Delivery
- **Development**: Emails are logged to console with full activation links (convenience for local testing)
- **Production**: Uses Resend API via `RESEND_API_KEY` environment variable
- **Test**: Uses stub implementation that captures tokens for test verification
- Activation links point to `ACTIVATION_BASE_URL` (default: dashboard URL + `/activate`)

### Database Configuration
- **Default connection**: PostgreSQL on localhost:5432 with user `postgres`/`postgres`
- **Local testing**: Create `schemory` database: `CREATE DATABASE schemory;`
- **Migrations**: Run `npx node-pg-migrate up -m ./migrations` from server directory
- **Docker**: PostgreSQL 16 Alpine image with health checks

### Production Deployment
- **Server**: Uses compiled TypeScript files from `dist/` directory
- **Docker**: Multi-stage build with builder (dev deps) and final (production only) stages
- **Health check**: `GET /health` endpoint returns `{"status": "ok"}`
- **CORS**: Configured for localhost:5173, schemory.org, and wildcards

### Known Issues & Workarounds

1. **CLI Password Prompts**: Don't work in non-interactive shells. Workaround: Use API directly for testing.
2. **TypeScript Imports**: Source files use `.js` extensions for compatibility with compiled output.
3. **Development Script**: Updated from `tsx src/index.ts` to `tsc && node dist/index.js` for reliability.
4. **Database Role**: Some systems may not have `postgres` role. Use existing role (e.g., current user).

### Testing Checklist

- [ ] Database connection (`psql -h localhost -p 5432 -U user -d schemory`)
- [ ] Database migrations (`npx node-pg-migrate up`)
- [ ] Server health (`curl http://localhost:3000/health`)
- [ ] Signup flow (`POST /auth/signup`)
- [ ] Activation flow (`POST /auth/activate`)
- [ ] Login flow (`POST /auth/login`)
- [ ] Team creation (`POST /api/teams`)
- [ ] Item push/pull (`PUT /api/items/:name`, `GET /api/items`)
- [ ] Email logging in dev mode
- [ ] Resend integration in production (requires `RESEND_API_KEY`)

---

## Production Deployment (Fixed)

### 🚀 Robust Docker Production Setup

**IMPORTANT**: The production setup has been completely redesigned for reliability. All services now run in a single Docker Compose network with proper dependencies and health checks.

#### Updated Architecture:
- **postgres**: PostgreSQL database with health checks (10 retries, 10s start period)
- **server**: Fastify API with database connectivity health check
- **dashboard**: React static files, depends on server being healthy
- **caddy**: Reverse proxy with automatic SSL (Let's Encrypt), integrated into Docker Compose
- **All services** on the same `schemory-network` for reliable DNS resolution

#### Files Added/Updated:
- `docker-compose.prod.yml` - Complete production compose with all 4 services
- `Caddyfile` - Reverse proxy configuration for schemory.org and api.schemory.org
- `server/src/index.ts` - Health endpoint now checks database connectivity
- `server/run-migrations.js` - Enhanced error logging and connection string building

### Production Configuration Files

#### 1. `.env` (Required for Production)
```bash
# Application
NODE_ENV=production
SERVER_PORT=3000
DASHBOARD_PORT=80

# Database - MUST match docker-compose.prod.yml
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=schemory
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=schemory

# Email (for production)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM_ADDRESS=noreply@schemory.org
ACTIVATION_BASE_URL=https://schemory.org/activate

# Dashboard API URL (Docker internal)
VITE_API_URL=http://server:3000
```

#### 2. `Caddyfile` (Required)
```caddy
schemory.org {
    reverse_proxy dashboard:80
}

api.schemory.org {
    reverse_proxy server:3000
}
```

### Production Deployment Commands

#### First-time deployment:
```bash
# 1. Create .env file with your configuration
cp .env.example .env
# Edit .env with your production values

# 2. Build all images
docker compose -f docker-compose.prod.yml build

# 3. Start all services (creates volumes, networks, containers)
docker compose -f docker-compose.prod.yml up -d

# 4. Monitor startup
docker compose -f docker-compose.prod.yml logs -f
```

#### Updating to new version:
```bash
# 1. Pull latest changes
git pull

# 2. Rebuild and restart
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# 3. Verify
docker compose -f docker-compose.prod.yml ps
curl -k https://schemory.org
curl -k https://api.schemory.org/health
```

#### Debugging production issues:
```bash
# Check all containers
olver compose -f docker-compose.prod.yml ps

# View logs for specific service
docker compose -f docker-compose.prod.yml logs server

# Test database from server container
docker exec schemory-server-prod node -e "
const { query } = require('./dist/db.js');
query('SELECT 1').then(() => console.log('DB OK')).catch(e => console.error('DB ERROR:', e.message));
"

# Enter server container for debugging
docker exec -it schemory-server-prod sh

# Check environment variables
docker exec schemory-server-prod env | grep -E "DB_|POSTGRES_"
```

### Production Troubleshooting Guide

| Symptom | Root Cause | Solution |
|---------|------------|----------|
| All APIs return 500 | DB connection failed | Check `docker exec schemory-server-prod env \| grep DB_` |
| Server "Waiting" state | PostgreSQL not healthy | `docker logs schemory-postgres-prod` |
| Dashboard 502 | Caddy can't reach dashboard | Check Caddyfile, use `dashboard:80` not `localhost` |
| Migrations fail | Wrong DB credentials in run-migrations.js | Use `DB_USER`/`DB_PASSWORD` env vars |
| Port 80 in use | External web server running | Stop Apache/Nginx: `sudo systemctl stop apache2 nginx` |
| PostgreSQL auth fails | Volume has old credentials | `docker volume rm schemory_postgres_data; docker compose up -d` |

### Health Check Endpoints

| Endpoint | Checks | Expected Response |
|----------|--------|------------------|
| `GET /health` | Server + Database | `{ status: "ok", database: "connected" }` |
| `GET /` | Dashboard | HTML page |
| `https://schemory.org` | Full stack | Dashboard via Caddy |
| `https://api.schemory.org/health` | Full stack | `{ status: "ok", database: "connected" }` |

### Database Connection Verification

The production health endpoint now **verifies database connectivity**. This catches connection issues early:

```bash
# Test health endpoint (should include database status)
curl http://localhost:3000/health
# OR via Caddy
curl -k https://api.schemory.org/health
```

**✅ Healthy:** `{ "status": "ok", "database": "connected" }`
**❌ Unhealthy:** `{ "status": "error", "database": "disconnected", "error": "..." }`

### Migration Reliability

The migration script (`server/run-migrations.js`) has been enhanced with:
- Explicit connection string building from multiple env var sources
- Better error logging with `[MIGRATIONS]` prefix
- Progress reporting for each attempt
- Automatic retry on failure (30 attempts, 2s delay)

To manually run migrations:
```bash
docker exec schemory-server-prod node /app/run-migrations.js
```

### Network Architecture

All production services are on the **`schemory-network`** bridge network:
- `postgres` → PostgreSQL database (port 5432)
- `server` → Fastify API (port 3000)
- `dashboard` → React static files (port 80)
- `caddy` → Reverse proxy (ports 80, 443)

Services can resolve each other by **service name** (e.g., `postgres:5432`, `server:3000`).

### Caddy SSL Configuration

Caddy automatically:
- Obtains Let's Encrypt certificates for your domains
- Renews certificates automatically
- Proxies to the correct internal services
- Handles HTTP → HTTPS redirects

Caddy is now **integrated into Docker Compose** (not standalone), ensuring it starts after the server and dashboard are ready.