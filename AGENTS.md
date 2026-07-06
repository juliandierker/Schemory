# schemory

Open source web app for teams to share TypeScript types and JSON schemas.
Stack preference: European or open source only.

> **Architecture & Design**: See [ARCHITECTURE.md](./ARCHITECTURE.md) for database schema, API contract, shared types, and CLI config details.

## Concepts
- **Centralized management** — all types/schemas live in one place
- **Team collaboration** — share types/schemas across a team
- **CLI-first** — sync via `npx schemory <command>`

## CLI Commands (in order of use)

| Step | Command | Requires | Result |
|------|---------|----------|--------|
| 1 | `npx schemory signup <email>` | — | sends confirmation email with activation token |
| 2 | `npx schemory activate <act_...>` | step 1 | activates account, prompts to set password, and authenticates CLI |
| 3 | `npx schemory login <email>` | registered account | prompts for password, authenticates CLI |
| 4 | `npx schemory create <teamName>` | logged in | creates a new team, returns join code |
| 4a | `npx schemory invite <teamId>` | logged in, team member | returns the team's join code |
| 4b | `npx schemory join <joinCode>` | logged in | joins a team via join code |
| 5 | `npx schemory pull <schema\|type>` | joined team | pulls one item |
| 5b | `npx schemory pullAll` | joined team | pulls all team items |
| 5c | `npx schemory push <schema\|type>` | joined team | pushes one item |

Steps 1–2 are one-time setup. Step 3 is for authentication. Step 4 creates your first team. Steps 4a–4b are for team management. Steps 5+ repeat for sharing items.

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