#!/usr/bin/env tsx
/**
 * Test database setup script
 * Creates a fresh test database, runs migrations, and returns connection info.
 * 
 * Usage:
 *   npx tsx server/scripts/test-db-setup.ts [--cleanup]
 * 
 * Environment variables:
 *   TEST_DB_HOST: PostgreSQL host (default: localhost)
 *   TEST_DB_PORT: PostgreSQL port (default: 5433)
 *   TEST_DB_USER: PostgreSQL user (default: postgres)
 *   TEST_DB_PASSWORD: PostgreSQL password (default: postgres)
 *   TEST_DB_PREFIX: Database name prefix (default: schemory_test)
 */

import { Client } from 'pg';
import { runner as runMigrations } from 'node-pg-migrate';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface TestDbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

function getAdminConfig(): TestDbConfig {
  return {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5433', 10),
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
    database: 'postgres', // Connect to default DB to create test DB
  };
}

function generateTestDbName(): string {
  const prefix = process.env.TEST_DB_PREFIX || 'schemory_test';
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}_${timestamp}_${random}`;
}

async function createTestDatabase(adminConfig: TestDbConfig, dbName: string): Promise<TestDbConfig> {
  const client = new Client({
    host: adminConfig.host,
    port: adminConfig.port,
    user: adminConfig.user,
    password: adminConfig.password,
    database: adminConfig.database,
  });

  await client.connect();

  try {
    // Check if database exists and drop it if so
    const checkResult = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );
    if (checkResult.rowCount > 0) {
      await client.query('DROP DATABASE ' + dbName + ' WITH (FORCE)');
    }

    // Create the test database
    await client.query('CREATE DATABASE ' + dbName);

    console.log(`Created test database: ${dbName}`);

    return {
      ...adminConfig,
      database: dbName,
    };
  } finally {
    await client.end();
  }
}

async function runTestMigrations(dbConfig: TestDbConfig): Promise<void> {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  
  console.log(`Running migrations from: ${migrationsDir}`);
  console.log(`Target database: ${dbConfig.database}`);

  await runMigrations({
    databaseUrl: `postgres://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`,
    dir: migrationsDir,
    direction: 'up',
    count: Infinity,
    ignorePattern: '.*down\.sql',
  });

  console.log('Migrations completed successfully');
}

async function cleanupTestDatabase(adminConfig: TestDbConfig, dbName: string): Promise<void> {
  const client = new Client({
    host: adminConfig.host,
    port: adminConfig.port,
    user: adminConfig.user,
    password: adminConfig.password,
    database: adminConfig.database,
  });

  await client.connect();

  try {
    await client.query('DROP DATABASE IF EXISTS ' + dbName + ' WITH (FORCE)');
    console.log(`Dropped test database: ${dbName}`);
  } catch (error) {
    console.error('Failed to drop test database:', error);
  } finally {
    await client.end();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const shouldCleanup = args.includes('--cleanup');
  
  const adminConfig = getAdminConfig();
  const dbName = generateTestDbName();

  let testDbConfig: TestDbConfig;

  try {
    // Create test database
    testDbConfig = await createTestDatabase(adminConfig, dbName);

    // Run migrations
    await runTestMigrations(testDbConfig);

    // Output connection info for tests to use
    console.log('\nTest database ready:');
    console.log(`  Host: ${testDbConfig.host}`);
    console.log(`  Port: ${testDbConfig.port}`);
    console.log(`  User: ${testDbConfig.user}`);
    console.log(`  Password: ${testDbConfig.password}`);
    console.log(`  Database: ${testDbConfig.database}`);
    console.log(`\nConnection URL: postgres://${testDbConfig.user}:${testDbConfig.password}@${testDbConfig.host}:${testDbConfig.port}/${testDbConfig.database}`);

    // Export for test scripts
    process.env.TEST_DB_NAME = testDbConfig.database;
    process.env.DB_HOST = testDbConfig.host;
    process.env.DB_PORT = testDbConfig.port.toString();
    process.env.DB_USER = testDbConfig.user;
    process.env.DB_PASSWORD = testDbConfig.password;
    process.env.DB_NAME = testDbConfig.database;

    if (shouldCleanup) {
      await cleanupTestDatabase(adminConfig, dbName);
    }
  } catch (error) {
    console.error('Test database setup failed:', error);
    process.exit(1);
  }
}

main();
