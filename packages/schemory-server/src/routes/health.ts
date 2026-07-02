import { FastifyPluginAsync } from 'fastify';
import { getDb, getDbType } from '../db/connection';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (request, reply) => {
    const dbType = getDbType();
    
    // Test database connection
    try {
      const db = getDb();
      // Simple query to test connection
      if (dbType === 'pg') {
        const { teamsPg } = await import('../db/schema');
        await db.select().from(teamsPg).limit(1);
      } else {
        const { teamsSqlite } = await import('../db/schema');
        await db.select().from(teamsSqlite).limit(1);
      }
      
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbType,
        version: '0.1.0',
      };
    } catch (error) {
      return reply.status(503).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: dbType,
        error: 'Database connection failed',
      });
    }
  });

  fastify.get('/api', async (request, reply) => {
    return {
      name: 'Schemory API',
      version: '0.1.0',
      description: 'A vault for TypeScript types and JSON schemas',
      endpoints: {
        teams: '/api/teams',
        schemas: '/api/teams/:teamId/schemas',
        types: '/api/teams/:teamId/types',
        health: '/health',
      },
    };
  });
};
