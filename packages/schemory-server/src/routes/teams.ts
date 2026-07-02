import { FastifyPluginAsync } from 'fastify';
import { getDb, getDbType } from '../db/connection';
import { Team, NewTeam } from '../db/schema';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

// Helper to get the correct table based on database type
async function getTeamsTable() {
  const dbType = getDbType();
  if (dbType === 'pg') {
    const { teamsPg } = await import('../db/schema');
    return teamsPg;
  } else {
    const { teamsSqlite } = await import('../db/schema');
    return teamsSqlite;
  }
}

export const teamsRoutes: FastifyPluginAsync = async (fastify) => {
  // List all teams
  fastify.get('/', async (request, reply) => {
    const db = getDb();
    const dbType = getDbType();
    
    try {
      const teamsTable = await getTeamsTable();
      const teams = await db.select().from(teamsTable);
      return { teams };
    } catch (error) {
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch teams',
        },
      });
    }
  });

  // Create a new team
  fastify.post('/', async (request, reply) => {
    const db = getDb();
    const dbType = getDbType();
    const body = request.body as NewTeam;

    if (!body.name) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Team name is required',
        },
      });
    }

    try {
      const newTeam: Team = {
        id: randomUUID(),
        name: body.name,
        createdAt: new Date(),
      };

      const teamsTable = await getTeamsTable();
      await db.insert(teamsTable).values(newTeam);

      return reply.status(201).send({ team: newTeam });
    } catch (error: any) {
      if (error.message?.includes('unique constraint') || error.message?.includes('UNIQUE constraint failed')) {
        return reply.status(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Team with this name already exists',
          },
        });
      }
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create team',
        },
      });
    }
  });

  // Get a specific team
  fastify.get('/:id', async (request, reply) => {
    const db = getDb();
    const { id } = request.params as { id: string };

    try {
      const team = await db.query.teams.findFirst({
        where: (teams, { eq }) => eq(teams.id, id),
      });
      
      if (!team) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Team not found',
          },
        });
      }
      return { team };
    } catch (error) {
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch team',
        },
      });
    }
  });

  // Update a team
  fastify.put('/:id', async (request, reply) => {
    const db = getDb();
    const { id } = request.params as { id: string };
    const body = request.body as Partial<NewTeam>;

    if (!body.name) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Team name is required',
        },
      });
    }

    try {
      const teamsTable = await getTeamsTable();
      const [updatedTeam] = await db
        .update(teamsTable)
        .set({ name: body.name })
        .where(eq(teamsTable.id, id))
        .returning();

      if (!updatedTeam) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Team not found',
          },
        });
      }
      return { team: updatedTeam };
    } catch (error: any) {
      if (error.message?.includes('unique constraint') || error.message?.includes('UNIQUE constraint failed')) {
        return reply.status(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Team with this name already exists',
          },
        });
      }
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update team',
        },
      });
    }
  });

  // Delete a team
  fastify.delete('/:id', async (request, reply) => {
    const db = getDb();
    const { id } = request.params as { id: string };

    try {
      const teamsTable = await getTeamsTable();
      const [deletedTeam] = await db
        .delete(teamsTable)
        .where(eq(teamsTable.id, id))
        .returning();

      if (!deletedTeam) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Team not found',
          },
        });
      }
      return { team: deletedTeam, message: 'Team deleted' };
    } catch (error) {
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to delete team',
        },
      });
    }
  });
};
