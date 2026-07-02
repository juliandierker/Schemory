import fastify from 'fastify';
import { fastifyCors } from '@fastify/cors';
import { fastifyHelmet } from '@fastify/helmet';
import { fastifyRateLimit } from '@fastify/rate-limit';
import { connect } from './db/connection';
import { teamsRoutes } from './routes/teams';
import { schemasRoutes } from './routes/schemas';
import { typesRoutes } from './routes/types';
import { healthRoutes } from './routes/health';

interface AppOptions {
  port: number;
  databaseUrl: string;
}

export async function buildApp(options: AppOptions) {
  const app = fastify({
    logger: process.env.NODE_ENV === 'development',
  });

  // Connect to database
  const databaseUrl = options.databaseUrl || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  await connect(databaseUrl);

  // Security plugins
  await app.register(fastifyCors, {
    origin: process.env.NODE_ENV === 'development' ? true : ['http://localhost:5173'],
  });
  await app.register(fastifyHelmet);

  // Rate limiting (optional - can be disabled for local dev)
  if (process.env.RATE_LIMIT_MAX) {
    await app.register(fastifyRateLimit, {
      max: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
      timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'),
    });
  }

  // Health check
  await app.register(healthRoutes);

  // API Routes
  await app.register(teamsRoutes, { prefix: '/api/teams' });
  await app.register(schemasRoutes, { prefix: '/api/teams' });
  await app.register(typesRoutes, { prefix: '/api/teams' });

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      },
    });
  });

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  return app;
}

export async function startServer(port: number = 5555) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const app = await buildApp({ port, databaseUrl });

  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Schemory Server running on http://localhost:${port}`);
    console.log(`📊 API Docs: http://localhost:${port}/api`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  return app;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n👋 Shutting down gracefully...');
  const { disconnect } = await import('./db/connection');
  await disconnect();
  process.exit(0);
});
