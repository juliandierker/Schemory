// Schemory server entry point
import cors from "@fastify/cors";
import fastify from "fastify";
import { authRoutes } from "./routes/auth.js";
import { itemRoutes } from "./routes/items.js";
import { teamRoutes } from "./routes/teams.js";

const server = fastify({ logger: true });

// Enable CORS for dashboard and production
void server.register(cors, {
  origin: [
    "http://localhost:5173",
    "https://schemory.org",
    "https://www.schemory.org",
    "https://api.schemory.org",
    "*",
  ],
});

// Register routes
void server.register(authRoutes);
void server.register(teamRoutes);
void server.register(itemRoutes);

// Health check - verifies both server and database connectivity
server.get("/health", async () => {
  try {
    // Check database connection
    const { query } = await import('./db.js');
    await query('SELECT 1');
    return { status: "ok", database: "connected" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Health check database error:', errorMessage);
    return {
      status: "error",
      database: "disconnected",
      error: errorMessage
    };
  }
});

// Start server
const start = async () => {
  try {
    await server.listen({ port: parseInt(process.env.PORT || "3000", 10), host: "0.0.0.0" });
    console.log(`Server listening on ${server.server.address()}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

export { server, start };
export default server;

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
