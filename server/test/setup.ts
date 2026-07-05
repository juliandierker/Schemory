// Test setup for vitest
// Creates a test database and runs migrations before tests
// Cleans up after tests

import { Client } from 'pg';
import { runner as runMigrations } from 'node-pg-migrate';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test database configuration
const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5433', 10),
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
};

// Global test DB name
let testDbName: string;

async function createTestDatabase() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  testDbName = `schemory_test_${timestamp}_${random}`;

  const adminClient = new Client({
    host: TEST_DB_CONFIG.host,
    port: TEST_DB_CONFIG.port,
    user: TEST_DB_CONFIG.user,
    password: TEST_DB_CONFIG.password,
    database: 'postgres',
  });

  await adminClient.connect();

  try {
    // Drop if exists
    await adminClient.query(`DROP DATABASE IF EXISTS "${testDbName}" WITH (FORCE)`);
    
    // Create
    await adminClient.query(`CREATE DATABASE "${testDbName}"`);
    
    console.log(`Created test database: ${testDbName}`);
  } finally {
    await adminClient.end();
  }
}

async function runTestMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  
  await runMigrations({
    databaseUrl: `postgres://${TEST_DB_CONFIG.user}:${TEST_DB_CONFIG.password}@${TEST_DB_CONFIG.host}:${TEST_DB_CONFIG.port}/${testDbName}`,
    dir: migrationsDir,
    direction: 'up',
    count: Infinity,
    ignorePattern: '.*down\\.sql',
  });

  console.log('Ran test migrations');
}

async function cleanupTestDatabase() {
  const adminClient = new Client({
    host: TEST_DB_CONFIG.host,
    port: TEST_DB_CONFIG.port,
    user: TEST_DB_CONFIG.user,
    password: TEST_DB_CONFIG.password,
    database: 'postgres',
  });

  try {
    await adminClient.connect();
    await adminClient.query(`DROP DATABASE IF EXISTS "${testDbName}" WITH (FORCE)`);
    console.log(`Dropped test database: ${testDbName}`);
  } finally {
    await adminClient.end();
  }
}

// Setup before all tests
beforeAll(async () => {
  await createTestDatabase();
  await runTestMigrations();
  
  // Set environment variables for the server
  process.env.DB_NAME = testDbName;
  process.env.DB_HOST = TEST_DB_CONFIG.host;
  process.env.DB_PORT = TEST_DB_CONFIG.port.toString();
  process.env.DB_USER = TEST_DB_CONFIG.user;
  process.env.DB_PASSWORD = TEST_DB_CONFIG.password;
}, 60000);

// Cleanup after all tests
afterAll(async () => {
  await cleanupTestDatabase();
}, 30000);

// Export test DB name for use in tests
export { testDbName, TEST_DB_CONFIG };
