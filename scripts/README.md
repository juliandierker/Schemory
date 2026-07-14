# Schemory Production Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `dev-up.sh` | Local hot-reload stack (`schemory-dev`) | `./scripts/dev-up.sh` |
| `deploy-prod.sh` | Full production deploy (`schemory-prod`) | `./scripts/deploy-prod.sh` |
| `deploy-dashboard-prod.sh` | Rebuild/restart **dashboard only** | `./scripts/deploy-dashboard-prod.sh` |
| `health-check.sh` | Verify **prod** stack only | `./scripts/health-check.sh` |
| `update-prod.sh` | `deploy-prod.sh --pull` | `./scripts/update-prod.sh` |
| `rollback-prod.sh` | Checkout commit + redeploy | `./scripts/rollback-prod.sh <commit>` |

## Local vs production (do not mix)

| | Local | Production (VPS) |
|--|-------|------------------|
| Compose file | `docker-compose.dev.yml` | `docker-compose.prod.yml` |
| Project name | `schemory-dev` | `schemory-prod` |
| Env file | `.env.development` | `.env.production` |
| Containers | `*-dev` | `*-prod` |
| Postgres volume | `schemory_dev_postgres_data` | `schemory_postgres_data` |
| Network | `schemory_dev_net` | `schemory_prod_net` |
| API URL | `http://localhost:3000` | `https://api.schemory.org` |

```bash
# Laptop
cp .env.development.example .env.development
./scripts/dev-up.sh

# Hetzner VPS
cp .env.production.example .env.production
# edit secrets, then:
./scripts/deploy-prod.sh --pull
./scripts/health-check.sh
```

`deploy-prod.sh` refuses env files that look like local/dev (`localhost` API URLs, `SCHEMORY_ENV=development`).

### Deploy flags

```bash
./scripts/deploy-prod.sh --pull
./scripts/deploy-prod.sh --no-cache
./scripts/deploy-prod.sh --skip-build
./scripts/deploy-prod.sh --wipe-data   # DESTROYS postgres volume (type DELETE)

# UI-only (Create Team fix, styling, etc.) — leaves API/DB running
./scripts/deploy-dashboard-prod.sh --pull --no-cache
```

**Volumes are preserved by default.** Never use `docker compose down -v` on production unless you intend to wipe the database.
