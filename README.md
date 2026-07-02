# Schemory

> **Don't forget your data structures**

Schemory is an open-source tool that allows development teams to centrally store, share, and synchronize TypeScript type definitions and JSON schemas across projects. Think of it as `dotenv`, but for your data structures instead of environment variables.

## Features

- **Centralized Management**: Store all your TypeScript types and JSON schemas in one place
- **Team Collaboration**: Share types/schemas with your team without copy-pasting
- **CLI-First**: Use `npx schemory-vault pull/push` commands to sync types in your projects
- **Project Configuration**: Small config file (`.schemoryrc`) defines what to sync
- **Portable Vaults**: Export and import complete vaults as ZIP archives for backup, migration, and sharing
- **Zero Security Overhead**: Designed for non-sensitive data (types and schemas only)

## Quick Start

### 1. Install Dependencies

```bash
# Clone the repository
git clone https://github.com/schemory/schemory.git
cd schemory

# Install all dependencies (uses npm workspaces)
npm install
```

### 2. Start the Server

**Option A: With PostgreSQL (recommended for production)**
```bash
docker-compose up -d
```

**Option B: With SQLite (simpler, no database setup)**
```bash
docker-compose -f docker-compose.sqlite.yml up -d
```

### 3. Initialize a Project

```bash
# Navigate to your project
cd /path/to/your/project

# Initialize Schemory
npx schemory-vault init --vault-url http://localhost:5555

# Follow the prompts to set your team ID
```

### 4. Push and Pull

```bash
# Push your schemas and types to the vault
npx schemory-vault push

# Pull schemas and types from the vault
npx schemory-vault pull
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `init` | Initialize a new `.schemoryrc` file |
| `pull` | Pull schemas and types from the vault |
| `push` | Push schemas and types to the vault |
| `list` | List all schemas and types in the vault |
| `status` | Show what has changed between local and remote |
| `export` | Export vault as ZIP archive |
| `import` | Import from ZIP archive or single file |

### Pull Options

```bash
npx schemory-vault pull --force          # Overwrite local changes
npx schemory-vault pull --dry-run        # Preview without applying
npx schemory-vault pull --schemas-only   # Only pull schemas
npx schemory-vault pull --types-only     # Only pull types
npx schemory-vault pull -o ./custom-dir  # Output to custom directory
```

### Push Options

```bash
npx schemory-vault push -m "Added user types"   # With commit message
npx schemory-vault push --force               # Overwrite remote
npx schemory-vault push --dry-run             # Preview without applying
npx schemory-vault push --from ./src/types    # Source directory
```

### Export Options

```bash
npx schemory-vault export --team my-team-id       # Export team vault
npx schemory-vault export -o backup.zip          # Export to file
npx schemory-vault export --format dir           # Export to directory
npx schemory-vault export --schema user.json      # Export single schema
```

### Import Options

```bash
npx schemory-vault import -f backup.zip            # Import from ZIP
npx schemory-vault import --overwrite             # Overwrite existing
npx schemory-vault import --dry-run               # Preview without applying
```

## Configuration (`.schemoryrc`)

```json
{
  "vaultUrl": "https://schemory.dev",
  "teamId": "your-team-id",
  "schemas": {
    "pull": ["*.schema.json", "*.json"],
    "push": ["schemas/**/*.json"],
    "ignore": ["node_modules/**", ".git/**"]
  },
  "types": {
    "pull": ["*.d.ts"],
    "push": ["src/types/**/*.d.ts"],
    "ignore": ["node_modules/**"]
  },
  "outputDir": "./src/types/schemory"
}
```

## Dashboard

Run the dashboard for a visual management interface:

```bash
npm run dev:dashboard
```

Open `http://localhost:5173` in your browser.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teams` | List all teams |
| POST | `/api/teams` | Create a new team |
| GET | `/api/teams/:id/schemas` | List schemas for a team |
| POST | `/api/teams/:id/schemas` | Create a schema |
| GET | `/api/teams/:id/types` | List type definitions for a team |
| POST | `/api/teams/:id/types` | Create a type definition |
| GET | `/health` | Health check |
| GET | `/api` | API info |

## Self-Hosting

### Docker (Recommended)

```bash
# Clone and start
git clone https://github.com/schemory/schemory.git
cd schemory
docker-compose up -d

# Access
# - API: http://localhost:5555
# - Dashboard: http://localhost:5173
```

### Without Docker

```bash
# Install dependencies
npm install

# Start server
cd packages/schemory-server
npm run dev

# In another terminal, start dashboard
cd packages/schemory-dashboard
npm run dev
```

## Technology Stack

- **Backend**: Node.js, Fastify, Drizzle ORM
- **Database**: PostgreSQL or SQLite
- **Frontend**: React, Vite, Tailwind CSS, Monaco Editor
- **CLI**: Commander, Node.js
- **Infrastructure**: Docker, Docker Compose

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by `dotenv` for managing environment variables
- Built with open-source tools for the European tech community
