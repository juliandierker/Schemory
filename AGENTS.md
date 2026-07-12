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