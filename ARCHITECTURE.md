# Schemory Architecture

Open source web app for teams to share TypeScript types and JSON schemas.

## Assumptions & Tradeoffs

### Session/Token Expiry and Refresh
- **Assumption**: Long-lived access tokens (1 year expiry) for CLI, no refresh flow
- **Rationale**: CLI usage is intermittent; short-lived tokens would force frequent re-authentication. Long-lived tokens can be server-revoked if compromised.
- **Decision**: Access tokens expire after 1 year. No automatic refresh. User obtains new token via web flow if expired.

### Push Conflict Resolution
- **Assumption**: Optimistic concurrency control — client sends `lastKnownVersion`, server rejects (409) if remote is newer
- **Rationale**: Last-write-wins can silently lose data. Auto-merge is complex for schemas/types and error-prone. Manual merge gives users control.
- **Decision**: Push requests must include `lastKnownVersion`. Server compares against current item version. If `remote.version > lastKnownVersion`, return 409 Conflict. Client must `pull` and merge manually.

### Item Identity
- **Assumption**: `name` is the user-facing identifier, unique per team; `id` is internal surrogate key
- **Rationale**: Names are memorable for CLI usage. Surrogate keys ensure stability if names change.
- **Decision**: Unique constraint on `(team_id, name)`. CLI commands use `name`. API paths use `name`. Internal references use `id`.

### Email Sending
- **Assumption**: Abstract email service behind an interface
- **Rationale**: Decouples business logic from infrastructure. Enables stub for development and easy swap for production EU-based provider.
- **Decision**: `EmailService` interface with single method: `sendActivationEmail(email: string, activationToken: string): Promise<void>`. Default implementation is a no-op logger (stub). Production implementation (e.g., MailPace for EU) injected at server startup. Seam is at dependency injection boundary.

---

## PostgreSQL Schema

### Tables

```sql
-- Users: account holders
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams: groups that share items
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members: many-to-many join table
CREATE TABLE team_members (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, team_id)
);

-- Items: schemas or types shared within a team
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('schema', 'type')),
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (team_id, name)
);

-- Auth tokens: CLI access tokens (long-lived)
CREATE TABLE auth_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_revoked BOOLEAN DEFAULT false
);

-- Activation tokens: one-time tokens for email confirmation
CREATE TABLE activation_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_teams_name ON teams(name);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_items_team ON items(team_id);
CREATE INDEX idx_items_team_name ON items(team_id, name);
CREATE INDEX idx_auth_tokens_user ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_hash ON auth_tokens(token_hash);
CREATE INDEX idx_activation_tokens_hash ON activation_tokens(token_hash);
```

### Notes
- All `token` values stored as hashes (bcrypt or similar) — never plaintext
- `auth_tokens.expires_at` default: 1 year from creation
- `activation_tokens.expires_at` default: 24 hours from creation
- `items.content`: JSON string for schemas, TypeScript source for types
- `items.version`: increments on each update, used for conflict detection

---

## REST API Contract

Base URL: `https://schemory.org/api` (configurable)
All responses are JSON. All authenticated routes require `Authorization: Bearer <token>` header.

### Authentication Routes

| Method | Path | Auth | Request | Response | Status Codes |
|--------|------|------|---------|----------|--------------|
| POST | `/api/users/signup` | None | `{ email: string }` | `{ status: "pending", message: "Activation email sent" }` | 202, 400, 409 |
| POST | `/api/users/activate` | None | `{ token: string }` | `{ user: User, accessToken: string, expiresAt: string }` | 200, 400, 404, 409 |
| POST | `/api/auth/verify` | Bearer | — | `{ user: User, teams: Team[] }` | 200, 401 |

### Team Routes

| Method | Path | Auth | Request | Response | Status Codes |
|--------|------|------|---------|----------|--------------|
| POST | `/api/teams/:teamName/join` | Bearer | — | `{ team: Team, membership: TeamMember }` | 200, 401, 404, 409 |
| GET | `/api/teams` | Bearer | — | `{ teams: Team[] }` | 200, 401 |

### Item Routes

| Method | Path | Auth | Request | Response | Status Codes |
|--------|------|------|---------|----------|--------------|
| GET | `/api/items` | Bearer | — | `{ items: Item[] }` | 200, 401 |
| GET | `/api/items/:name` | Bearer | — | `{ item: Item }` | 200, 401, 404 |
| PUT | `/api/items/:name` | Bearer | `{ kind: Kind, content: string, lastKnownVersion: number }` | `{ item: Item }` | 200, 401, 404, 409 |
| DELETE | `/api/items/:name` | Bearer | — | `{ message: string }` | 200, 401, 404 |

### Route Details

#### POST /api/users/signup
Starts account creation. Sends activation email asynchronously.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (202):**
```json
{
  "status": "pending",
  "message": "Activation email sent"
}
```

**Errors:**
- 400: Invalid email format
- 409: Email already registered

---

#### POST /api/users/activate
Activates account using one-time token from email. Returns access token for CLI.

**Request:**
```json
{
  "token": "activation_token_from_email"
}
```

**Response (200):**
```json
{
  "user": { "id": "usr_...", "email": "user@example.com", "isActive": true, ... },
  "accessToken": "sk_live_...",
  "expiresAt": "2025-01-01T00:00:00Z"
}
```

**Errors:**
- 400: Missing token
- 404: Token not found or expired
- 409: User already activated

---

#### POST /api/auth/verify
Verifies CLI access token is valid. Used by `npx schemory login <token>`.

**Headers:**
```
Authorization: Bearer sk_live_...
```

**Response (200):**
```json
{
  "user": { "id": "usr_...", "email": "...", ... },
  "teams": [{ "id": "tm_...", "name": "...", ... }]
}
```

**Errors:**
- 401: Invalid or revoked token

---

#### POST /api/teams/:teamName/join
Joins a team by name. User must be authenticated.

**Headers:**
```
Authorization: Bearer sk_live_...
```

**Response (200):**
```json
{
  "team": { "id": "tm_...", "name": "my-team", "createdAt": "..." },
  "membership": { "userId": "usr_...", "teamId": "tm_...", "role": "member", "joinedAt": "..." }
}
```

**Errors:**
- 401: Unauthorized (invalid token)
- 404: Team not found
- 409: Already a member of this team

---

#### GET /api/items
Returns all items across all teams the user belongs to.

**Headers:**
```
Authorization: Bearer sk_live_...
```

**Response (200):**
```json
{
  "items": [
    { "id": "it_...", "teamId": "tm_...", "name": "UserSchema", "kind": "schema", "content": "{...}", "version": 1, ... },
    { "id": "it_...", "teamId": "tm_...", "name": "ConfigType", "kind": "type", "content": "type Config = {...}", "version": 3, ... }
  ]
}
```

---

#### GET /api/items/:name
Returns a single item by name. Searches across all teams user belongs to.

**Headers:**
```
Authorization: Bearer sk_live_...
```

**Response (200):**
```json
{
  "item": { "id": "it_...", "teamId": "tm_...", "name": "UserSchema", "kind": "schema", "content": "{...}", "version": 1, ... }
}
```

**Errors:**
- 404: Item not found or user lacks access

---

#### PUT /api/items/:name
Creates or updates an item. Uses optimistic concurrency control.

**Headers:**
```
Authorization: Bearer sk_live_...
```

**Request:**
```json
{
  "kind": "schema",
  "content": "{\"type\": \"object\", \"properties\": {...}}",
  "lastKnownVersion": 1
}
```

**Response (200):**
```json
{
  "item": { "id": "it_...", "name": "UserSchema", "kind": "schema", "content": "...", "version": 2, ... }
}
```

**Errors:**
- 401: Unauthorized
- 404: Team not found or user not a member
- 409: Conflict (remote version > lastKnownVersion)

**Conflict Resolution:**
If server's current version for the item is greater than `lastKnownVersion`, the request is rejected with 409. Client must `pull` the current version, merge changes, and retry with updated `lastKnownVersion`.

---

## Shared TypeScript Types

These types are shared between server and CLI. Stored in a shared package (e.g., `/packages/types`).

### Core Domain Types

```typescript
// User types
export interface User {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export interface UserSignupRequest {
  email: string;
}

export interface UserActivationRequest {
  token: string;
}

export interface UserActivationResponse {
  user: User;
  accessToken: string;
  expiresAt: string; // ISO 8601
}

// Team types
export type TeamRole = 'member' | 'admin';

export interface Team {
  id: string;
  name: string;
  createdAt: string;
}

export interface TeamMember {
  userId: string;
  teamId: string;
  role: TeamRole;
  joinedAt: string;
}

// Item types
export type ItemKind = 'schema' | 'type';

export interface Item {
  id: string;
  teamId: string;
  name: string;
  kind: ItemKind;
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ItemCreateUpdateRequest {
  kind: ItemKind;
  content: string;
  lastKnownVersion?: number; // Required for updates, optional for creates
}

export interface ItemsResponse {
  items: Item[];
}

export interface ItemResponse {
  item: Item;
}

// Auth types
export interface AuthVerifyResponse {
  user: User;
  teams: Team[];
}

// Token types (never stored raw in DB, only hashed)
export interface AuthToken {
  id: string;
  userId: string;
  token: string; // Raw token (in-memory only)
  expiresAt: string;
  createdAt: string;
  isRevoked: boolean;
}

export interface ActivationToken {
  id: string;
  userId: string;
  token: string; // Raw token
  expiresAt: string;
  createdAt: string;
}
```

### API Response Types

```typescript
// Success responses
export interface SuccessResponse<T = unknown> {
  data: T;
}

// Error responses
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// HTTP status code helpers
export type HttpStatus = 
  | 200 | 201 | 202 | 204
  | 400 | 401 | 403 | 404 | 409
  | 500;
```

---

## CLI Local Configuration

### Configuration File

The CLI stores configuration locally for persistence across sessions.

| Property | Path | Format | Purpose |
|----------|------|--------|---------|
| Config file | `~/.schemory/config.json` | JSON | Global CLI configuration |
| Project config | `.schemory/config.json` | JSON | Project-specific override |

### Configuration Schema

```typescript
// Global and project-level configuration
export interface SchemoryConfig {
  version: string; // Config schema version (e.g., "1")
  auth?: {
    token: string; // CLI access token
    expiresAt: string; // ISO 8601
    userId: string;
  };
  teams: Team[]; // Cached list of user's teams
  defaultTeam?: string; // Default team for push/pull when ambiguous
  lastSyncAt?: string; // ISO 8601, last successful sync
  apiUrl?: string; // Custom API URL (default: https://api.schemory.app)
}
```

### Example Configuration File

`~/.schemory/config.json`:
```json
{
  "version": "1",
  "auth": {
    "token": "sk_live_abc123...",
    "expiresAt": "2025-07-05T00:00:00Z",
    "userId": "usr_xyz789"
  },
  "teams": [
    { "id": "tm_1", "name": "acme-inc", "createdAt": "2024-01-01T00:00:00Z" },
    { "id": "tm_2", "name": "open-source", "createdAt": "2024-02-01T00:00:00Z" }
  ],
  "defaultTeam": "acme-inc",
  "lastSyncAt": "2024-07-01T12:00:00Z",
  "apiUrl": "https://api.schemory.app"
}
```

### Configuration Precedence

1. Command-line flags (highest priority)
2. Project-level config (`.schemory/config.json`)
3. Global config (`~/.schemory/config.json`)
4. Environment variables (`SCHEMORY_API_URL`, etc.)
5. Defaults (lowest priority)

### Security Notes

- Config file permissions: `0600` (owner read/write only)
- Token is stored in plaintext locally (encrypted at rest is a future enhancement)
- `.schemory/` is added to `.gitignore` by default to prevent accidental commits

---

## File Locations

```
/
├── cli/
│   └── src/
│       ├── config/           # Config loading/saving
│       └── commands/         # CLI command implementations
├── server/
│   ├── src/
│   │   ├── routes/          # Fastify route handlers
│   │   ├── services/        # Business logic
│   │   ├── db/              # Database schema, migrations
│   │   └── types/           # Shared types (symlinked or copied)
│   └── ...
├── dashboard/
│   └── ...
└── packages/
    └── types/               # Shared TypeScript types (optional)
```

---

## Open Questions

1. **Rate limiting**: Should the API have rate limits? If so, what thresholds?
2. **Item history**: Should we store previous versions of items for rollback?
3. **Team invites**: Should team joining require approval, or is it open?
4. **Token rotation**: Should we support token rotation for security?
5. **Offline mode**: Should the CLI support queued operations for offline use?
