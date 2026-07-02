import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import {
  teamsSqlite,
  schemasSqlite,
  typeDefinitionsSqlite,
  schemaHistorySqlite,
} from './schema';

const DATABASE_URL = process.env.DATABASE_URL || 'file:./data/schemory.db';

function getSqliteDatabase(databaseUrl: string): Database.Database {
  const path = databaseUrl.replace(/^file:/, '');
  return new Database(path);
}

async function runMigrations() {
  console.log('📱 Running SQLite migrations...');
  
  const sqliteDb = getSqliteDatabase(DATABASE_URL);
  const db = drizzle(sqliteDb, {
    schema: {
      teams: teamsSqlite,
      schemas: schemasSqlite,
      typeDefinitions: typeDefinitionsSqlite,
      schemaHistory: schemaHistorySqlite,
    },
  });

  // For SQLite with better-sqlite3, we need to manually create tables
  // Drizzle doesn't auto-create tables
  const client = sqliteDb;

  // Create tables using raw SQL
  // Note: Use snake_case column names to match drizzle-orm pg-core defaults
  client.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schemas (
      id TEXT PRIMARY KEY NOT NULL,
      team_id TEXT NOT NULL,
      name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      content TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS type_definitions (
      id TEXT PRIMARY KEY NOT NULL,
      team_id TEXT NOT NULL,
      name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      content TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS schema_history (
      id TEXT PRIMARY KEY NOT NULL,
      schema_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      content TEXT NOT NULL,
      changed_by TEXT,
      change_message TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (schema_id) REFERENCES schemas(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS unique_team_name ON schemas (team_id, name);
    CREATE UNIQUE INDEX IF NOT EXISTS unique_team_name_types ON type_definitions (team_id, name);
  `);

  console.log('✅ SQLite tables created/verified');
  client.close();
}

runMigrations().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
