import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import {
  teamsPg,
  schemasPg,
  typeDefinitionsPg,
  schemaHistoryPg,
} from './schema';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://schemory:schemory@postgres:5432/schemory';

async function runPgMigrations() {
  console.log('📱 Running PostgreSQL migrations...');
  
  const client = new Client({
    connectionString: DATABASE_URL,
  });
  
  await client.connect();
  const db = drizzle(client, {
    schema: {
      teams: teamsPg,
      schemas: schemasPg,
      typeDefinitions: typeDefinitionsPg,
      schemaHistory: schemaHistoryPg,
    },
  });

  // Check if tables exist, if not create them
  // PostgreSQL with drizzle-orm doesn't auto-create tables by default
  // We'll use raw SQL to create tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schemas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      version INTEGER DEFAULT 1 NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS type_definitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      version INTEGER DEFAULT 1 NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schema_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      schema_id UUID NOT NULL REFERENCES schemas(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      content TEXT NOT NULL,
      changed_by VARCHAR(255),
      change_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS unique_team_name 
      ON schemas (team_id, name);

    CREATE UNIQUE INDEX IF NOT EXISTS unique_team_name_types 
      ON type_definitions (team_id, name);
  `);

  console.log('✅ PostgreSQL tables created/verified');
  await client.end();
}

runPgMigrations().catch((error) => {
  console.error('❌ PostgreSQL migration failed:', error);
  process.exit(1);
});
