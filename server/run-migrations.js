#!/usr/bin/env node
const { runner } = require("node-pg-migrate");

async function runMigrations() {
  const maxRetries = 30;
  const retryDelay = 2000; // 2 seconds
  
  // Build connection string from environment
  const dbUser = process.env.DB_USER || process.env.POSTGRES_USER || "postgres";
  const dbPassword = process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || "postgres";
  const dbHost = process.env.DB_HOST || "postgres";
  const dbPort = process.env.DB_PORT || "5432";
  const dbName = process.env.DB_NAME || process.env.POSTGRES_DB || "schemory";
  
  const databaseUrl = process.env.DATABASE_URL ||
    `postgres://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
  
  console.log(`[MIGRATIONS] Connecting to: ${databaseUrl.replace(/:\/[^:]+@/, ':***@')}`);
  console.log(`[MIGRATIONS] Directory: /app/server/migrations`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[MIGRATIONS] Attempt ${attempt}/${maxRetries}...`);
      await runner({ databaseUrl, dir: "/app/server/migrations", direction: "up" });
      console.log("[MIGRATIONS] Completed successfully!");
      return;
    } catch (err) {
      const errorMessage = err.message || String(err);
      console.error(`[MIGRATIONS] Attempt ${attempt} failed:`, errorMessage);
      
      if (attempt >= maxRetries) {
        console.error("[MIGRATIONS] Max retries reached. Migration failed. Exiting.");
        process.exit(1);
      }
      
      console.log(`[MIGRATIONS] Retrying in ${retryDelay/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

runMigrations().catch(err => { 
  console.error("[MIGRATIONS] Fatal error:", err); 
  process.exit(1); 
});
