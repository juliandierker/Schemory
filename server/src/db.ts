import { Pool, PoolClient, PoolConfig } from 'pg';

// Database configuration type
export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

// Default configuration (can be overridden by environment variables)
function getDefaultConfig(): DbConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'schemory',
  };
}

// Connection pool (singleton)
let pool: Pool | null = null;

export function getPool(config?: DbConfig): Pool {
  if (!pool) {
    const actualConfig = config || getDefaultConfig();
    pool = new Pool({
      host: actualConfig.host,
      port: actualConfig.port,
      user: actualConfig.user,
      password: actualConfig.password,
      database: actualConfig.database,
      // Connection pool settings
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    } as PoolConfig);

    // Log pool errors
    pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });
  }
  return pool;
}

// Reset pool (useful for tests)
export async function resetPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Create a new pool with a specific configuration (for test isolation)
export function createPool(config: DbConfig): Pool {
  return new Pool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 2000,
  } as PoolConfig);
}

// Query helper for convenience
export async function query<T = Record<string, unknown> >(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return { rows: result.rows as T[], rowCount: result.rowCount || 0 };
  } finally {
    client.release();
  }
}

// Get a client from the pool for transactions
export async function getClient(): Promise<PoolClient> {
  return getPool().connect();
}

// Export types
export type { Pool, PoolClient, PoolConfig };
