// Schemory server entry point
// Fastify server with auth routes

import fastify from 'fastify';
import { authRoutes } from './routes/auth.js';
import { teamRoutes } from './routes/teams.js';
import { itemRoutes } from './routes/items.js';

const server = fastify({ logger: true });

// Register auth routes
void server.register(authRoutes);

// Register team routes
void server.register(teamRoutes);

// Register item routes
void server.register(itemRoutes);

// Health check endpoint
server.get('/health', async () => {
  return { status: 'ok' };
});

// Start server
const start = async () => {
  try {
    await server.listen({ port: parseInt(process.env.PORT || '3000', 10), host: '0.0.0.0' });
    console.log(`Server listening on ${server.server.address()}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Export server for testing
export { server, start };

export default server;
