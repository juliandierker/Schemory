#!/usr/bin/env node
const { runner } = require("node-pg-migrate");

async function runMigrations() {
  const maxRetries = 30;
  const retryDelay = 2000; // 2 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const databaseUrl = process.env.DATABASE_URL || 
      `postgres://${process.env.DB_USER || "postgres"}:${process.env.DB_PASSWORD || "postgres"}@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"}/${process.env.DB_NAME || "schemory"}`;
    
    try {
      await runner({ databaseUrl, dir: "/app/server/migrations", direction: "up" });
      console.log("Migrations completed successfully");
      return;
    } catch (err) {
      console.error(`Migration attempt ${attempt} failed:`, err.message);
      if (attempt >= maxRetries) {
        console.error("Max retries reached. Migration failed.");
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

runMigrations().catch(err => { console.error("Migration failed:", err); process.exit(1); });
