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
| 1 | `npx schemory signup <email>` | — | sends confirmation email |
| 2 | (click link in email) | step 1 | activates account |
| 3 | `npx schemory login <token>` | activated account | authenticates CLI |
| 4 | `npx schemory join <team>` | logged in | joins a team |
| 5 | `npx schemory pull <schema\|type>` | joined team | pulls one item |
| 5b | `npx schemory pullAll` | joined team | pulls all team items |
| 5c | `npx schemory push <schema\|type>` | joined team | pushes one item |

Steps 1–4 are one-time setup. Steps 5+ repeat.

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