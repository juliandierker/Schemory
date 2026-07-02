import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { Client } from 'pg';
import Database from 'better-sqlite3';
import {
  teamsPg,
  schemasPg,
  typeDefinitionsPg,
  schemaHistoryPg,
  teamsSqlite,
  schemasSqlite,
  typeDefinitionsSqlite,
  schemaHistorySqlite,
} from './schema';

let db: any = null;
let dbType: 'pg' | 'sqlite' | null = null;

function getPgClient(databaseUrl: string): Client {
  const client = new Client({
    connectionString: databaseUrl,
  });
  return client;
}

function getSqliteDatabase(databaseUrl: string): Database.Database {
  // Extract path from file: URL
  const path = databaseUrl.replace(/^file:/, '');
  return new Database(path);
}

function createPgDrizzle(client: Client) {
  return drizzle(client, {
    schema: {
      teams: teamsPg,
      schemas: schemasPg,
      typeDefinitions: typeDefinitionsPg,
      schemaHistory: schemaHistoryPg,
    },
  });
}

function createSqliteDrizzle(db: Database.Database) {
  return drizzleSqlite(db, {
    schema: {
      teams: teamsSqlite,
      schemas: schemasSqlite,
      typeDefinitions: typeDefinitionsSqlite,
      schemaHistory: schemaHistorySqlite,
    },
  });
}

export async function connect(databaseUrl: string) {
  if (db) {
    return { db, dbType };
  }

  if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
    dbType = 'pg';
    const client = getPgClient(databaseUrl);
    await client.connect();
    db = createPgDrizzle(client);
    console.log('🗄️  Connected to PostgreSQL database');
  } else if (databaseUrl.startsWith('file:')) {
    dbType = 'sqlite';
    const sqliteDb = getSqliteDatabase(databaseUrl);
    db = createSqliteDrizzle(sqliteDb);
    console.log('🗄️  Connected to SQLite database');
  } else {
    throw new Error(`Unsupported database URL: ${databaseUrl}`);
  }

  return { db, dbType };
}

export function disconnect() {
  if (dbType === 'pg' && db?._client) {
    return db._client.end();
  }
  // SQLite doesn't need explicit disconnect
  return Promise.resolve();
}

export function getDb() {
  if (!db) {
    throw new Error('Database not connected. Call connect() first.');
  }
  return db;
}

export function getDbType() {
  return dbType;
}
