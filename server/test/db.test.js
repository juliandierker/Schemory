// Database migration test
// Run with: node --import tsx/esm test/db.test.js
// Requires PostgreSQL server to be running (via docker-compose up -d)

import { Client } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { runner as runMigrations } from 'node-pg-migrate';
import assert from 'assert';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Expected tables from ARCHITECTURE.md
const EXPECTED_TABLES = [
  'users',
  'teams',
  'team_members',
  'items',
  'auth_tokens',
  'activation_tokens',
];

// Expected columns per table
const EXPECTED_COLUMNS = {
  users: ['id', 'email', 'is_active', 'created_at', 'updated_at'],
  teams: ['id', 'name', 'created_at'],
  team_members: ['user_id', 'team_id', 'role', 'joined_at'],
  items: ['id', 'team_id', 'name', 'kind', 'content', 'version', 'created_at', 'updated_at'],
  auth_tokens: ['id', 'user_id', 'token_hash', 'expires_at', 'created_at', 'is_revoked'],
  activation_tokens: ['id', 'user_id', 'token_hash', 'expires_at', 'created_at'],
};

// Expected indexes
const EXPECTED_INDEXES = [
  'idx_users_email',
  'idx_teams_name',
  'idx_team_members_user',
  'idx_team_members_team',
  'idx_items_team',
  'idx_items_team_name',
  'idx_auth_tokens_user',
  'idx_auth_tokens_hash',
  'idx_activation_tokens_hash',
];

function generateTestDbName() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `schemory_test_${timestamp}_${random}`;
}

async function waitForPostgres(config, retries = 30, delay = 1000) {
  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: 'postgres',
  });

  for (let i = 0; i < retries; i++) {
    try {
      await client.connect();
      await client.end();
      return true;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error(`PostgreSQL not available at ${config.host}:${config.port} after ${retries * delay / 1000} seconds`);
}

async function createTestDatabase(config, dbName) {
  const adminClient = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: 'postgres',
  });

  await adminClient.connect();

  try {
    await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    await adminClient.query(`CREATE DATABASE "${dbName}"`);
    return { ...config, database: dbName };
  } finally {
    await adminClient.end();
  }
}

async function runMigrationsAgainst(dbConfig) {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  
  await runMigrations({
    databaseUrl: `postgres://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`,
    dir: migrationsDir,
    direction: 'up',
    count: Infinity,
    ignorePattern: '.*down\\.sql',
  });
}

async function cleanupTestDatabase(config, dbName) {
  const adminClient = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: 'postgres',
  });

  try {
    await adminClient.connect();
    await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  } finally {
    await adminClient.end();
  }
}

async function getAllTables(client) {
  const result = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  return result.rows.map(row => row.table_name);
}

async function getTableColumns(client, tableName) {
  const result = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
    [tableName]
  );
  return result.rows.map(row => row.column_name);
}

async function getAllIndexes(client) {
  const result = await client.query("SELECT indexname FROM pg_indexes WHERE schemaname = 'public'");
  return result.rows.map(row => row.indexname);
}

// Main test function
async function runTests() {
  const baseConfig = {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5433', 10),
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
  };

  const testDbName = generateTestDbName();
  let testDbConfig;
  let client;

  try {
    console.log('Waiting for PostgreSQL...');
    await waitForPostgres(baseConfig);
    console.log('PostgreSQL is available\n');

    console.log('Setting up test database...');
    testDbConfig = await createTestDatabase(baseConfig, testDbName);
    
    console.log('Running migrations...');
    await runMigrationsAgainst(testDbConfig);
    
    console.log('Connecting to test database...');
    client = new Client({
      host: testDbConfig.host,
      port: testDbConfig.port,
      user: testDbConfig.user,
      password: testDbConfig.password,
      database: testDbConfig.database,
    });
    await client.connect();

    console.log('Running assertions...\n');

    // Test 1: All expected tables exist
    console.log('Test 1: Checking all expected tables exist...');
    const actualTables = await getAllTables(client);
    for (const expectedTable of EXPECTED_TABLES) {
      assert.ok(actualTables.includes(expectedTable), `Table ${expectedTable} should exist`);
    }
    console.log('  PASS\n');

    // Test 2: Each table has expected columns
    console.log('Test 2: Checking expected columns for each table...');
    for (const tableName of EXPECTED_TABLES) {
      const expectedColumns = EXPECTED_COLUMNS[tableName];
      const actualColumns = await getTableColumns(client, tableName);
      
      for (const expectedColumn of expectedColumns) {
        assert.ok(actualColumns.includes(expectedColumn), 
          `Table ${tableName} should have column ${expectedColumn}`);
      }
    }
    console.log('  PASS\n');

    // Test 3: All expected indexes exist
    console.log('Test 3: Checking all expected indexes exist...');
    const actualIndexes = await getAllIndexes(client);
    for (const expectedIndex of EXPECTED_INDEXES) {
      assert.ok(actualIndexes.includes(expectedIndex), 
        `Index ${expectedIndex} should exist`);
    }
    console.log('  PASS\n');

    // Test 4: Unique constraint on items(team_id, name)
    console.log('Test 4: Checking unique constraint on items(team_id, name)...');
    const constraintResult = await client.query(
      `SELECT conname FROM pg_constraint WHERE conrelid = 'items'::regclass AND contype = 'u'`
    );
    assert.ok(constraintResult.rowCount > 0, 'Should have unique constraint on items');
    console.log('  PASS\n');

    // Test 5: Foreign keys exist
    console.log('Test 5: Checking foreign keys exist...');
    const fkResult = await client.query(
      `SELECT tc.table_name, kcu.column_name 
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
       WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
       ORDER BY tc.table_name`
    );
    assert.ok(fkResult.rowCount > 0, 'Should have foreign keys');
    console.log('  PASS\n');

    console.log('All tests passed!\n');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
    try {
      await cleanupTestDatabase(baseConfig, testDbName);
    } catch (cleanupError) {
      console.error('Error cleaning up test database:', cleanupError);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(err => {
    console.error('Error running tests:', err);
    process.exit(1);
  });
}

export { runTests };
