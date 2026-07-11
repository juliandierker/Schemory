# Schemory CLI

Schemory CLI - Share TypeScript types and JSON schemas with your team.

## Installation

```bash
npx schemory --help
```

Or install globally:

```bash
npm install -g schemory
schemory --help
```

## Usage

### One-time Setup

1. **Signup** - Register a new account
```bash
schemory signup your@email.com
```

2. **Activate** - Click the activation link sent to your email

3. **Login** - Authenticate with your email and password
```bash
schemory login your@email.com
```

You will be prompted for your password.

4. **Join** - Join a team
```bash
schemory join your-team-name
```

### Sync Commands

5. **Push** - Push a schema or type to your team
```bash
schemory push UserSchema
```

6. **Pull** - Pull a schema or type from your team
```bash
schemory pull UserSchema
```

7. **Pull All** - Pull all schemas and types from your team
```bash
schemory pullAll
```

## Local File Format

- **Schemas**: Stored as `.schemory/items/schemas/{name}.json`
- **Types**: Stored as `.schemory/items/types/{name}.ts`

## Configuration

Configuration is stored in `~/.schemory/config.json` or `.schemory/config.json` in your project.

## Development

### Publishing new versions

```bash
cd cli
npm version patch  # or: minor, major
npm publish
```

Or as a one-liner:
```bash
cd cli && npm version patch && npm publish
```

### Version

0.1.0