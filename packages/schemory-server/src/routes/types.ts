import { FastifyPluginAsync } from 'fastify';
import { getDb, getDbType } from '../db/connection';
import { TypeDefinition, NewTypeDefinition } from '../db/schema';
import { randomUUID } from 'crypto';
import { eq, and } from 'drizzle-orm';

// Helper to get the correct table based on database type
async function getTypesTable() {
  const dbType = getDbType();
  if (dbType === 'pg') {
    const { typeDefinitionsPg } = await import('../db/schema');
    return typeDefinitionsPg;
  } else {
    const { typeDefinitionsSqlite } = await import('../db/schema');
    return typeDefinitionsSqlite;
  }
}

// Helper to get teams table
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

export const typesRoutes: FastifyPluginAsync = async (fastify) => {
  // List all type definitions for a team
  fastify.get('/:teamId/types', async (request, reply) => {
    const db = getDb();
    const { teamId } = request.params as { teamId: string };

    try {
      const typesTable = await getTypesTable();
      const types = await db.query.typeDefinitions.findMany({
        where: (types, { eq }) => eq(types.teamId, teamId),
      });
      return { types };
    } catch (error) {
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch type definitions',
        },
      });
    }
  });

  // Get a single type definition
  fastify.get('/:teamId/types/:id', async (request, reply) => {
    const db = getDb();
    const { id, teamId } = request.params as { id: string; teamId: string };

    try {
      const typesTable = await getTypesTable();
      const typeDef = await db.query.typeDefinitions.findFirst({
        where: (types, { and, eq }) => and(
          eq(types.id, id),
          eq(types.teamId, teamId)
        ),
      });

      if (!typeDef) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Type definition not found',
          },
        });
      }
      return { type: typeDef };
    } catch (error) {
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch type definition',
        },
      });
    }
  });

  // Create a new type definition
  fastify.post('/:teamId/types', async (request, reply) => {
    const db = getDb();
    const { teamId } = request.params as { teamId: string };
    const body = request.body as NewTypeDefinition;

    if (!body.name || !body.content || !body.fileName) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'name, content, and fileName are required',
        },
      });
    }

    try {
      // Verify team exists
      const teamsTable = await getTeamsTable();
      const team = await db.query.teams.findFirst({
        where: (teams, { eq }) => eq(teams.id, teamId),
      });

      if (!team) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Team not found',
          },
        });
      }

      // Check if type with this name already exists for the team
      const typesTable = await getTypesTable();
      const existing = await db.query.typeDefinitions.findFirst({
        where: (types, { and, eq }) => and(
          eq(types.teamId, teamId),
          eq(types.name, body.name)
        ),
      });

      if (existing) {
        return reply.status(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Type definition with this name already exists for the team',
          },
        });
      }

      const newType: TypeDefinition = {
        id: randomUUID(),
        teamId,
        name: body.name,
        fileName: body.fileName,
        content: body.content,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(typesTable).values(newType);

      return reply.status(201).send({ type: newType });
    } catch (error: any) {
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create type definition',
        },
      });
    }
  });

  // Update a type definition
  fastify.put('/:teamId/types/:id', async (request, reply) => {
    const db = getDb();
    const { id, teamId } = request.params as { id: string; teamId: string };
    const body = request.body as Partial<NewTypeDefinition>;

    if (!body.name && !body.content && !body.fileName) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one of name, content, or fileName must be provided',
        },
      });
    }

    try {
      const typesTable = await getTypesTable();
      
      // Get current type to check ownership and increment version
      const currentType = await db.query.typeDefinitions.findFirst({
        where: (types, { and, eq }) => and(
          eq(types.id, id),
          eq(types.teamId, teamId)
        ),
      });

      if (!currentType) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Type definition not found',
          },
        });
      }

      // Build update object
      const updateData: Partial<TypeDefinition> = {
        ...(body.name && { name: body.name }),
        ...(body.content && { content: body.content }),
        ...(body.fileName && { fileName: body.fileName }),
        version: currentType.version + 1,
        updatedAt: new Date(),
      };

      const [updatedType] = await db
        .update(typesTable)
        .set(updateData)
        .where(eq(typesTable.id, id))
        .returning();

      return { type: updatedType };
    } catch (error: any) {
      if (error.message?.includes('unique constraint') || error.message?.includes('UNIQUE constraint failed')) {
        return reply.status(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Type definition with this name already exists for the team',
          },
        });
      }
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update type definition',
        },
      });
    }
  });

  // Delete a type definition
  fastify.delete('/:teamId/types/:id', async (request, reply) => {
    const db = getDb();
    const { id, teamId } = request.params as { id: string; teamId: string };

    try {
      const typesTable = await getTypesTable();
      const [deletedType] = await db
        .delete(typesTable)
        .where(eq(typesTable.id, id))
        .returning();

      if (!deletedType) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Type definition not found',
          },
        });
      }

      return { type: deletedType, message: 'Type definition deleted' };
    } catch (error) {
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to delete type definition',
        },
      });
    }
  });

  // Bulk upload type definitions
  fastify.post('/:teamId/types/bulk', async (request, reply) => {
    const db = getDb();
    const { teamId } = request.params as { teamId: string };
    const types = request.body as NewTypeDefinition[];

    if (!Array.isArray(types) || types.length === 0) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Array of type definitions is required',
        },
      });
    }

    try {
      // Verify team exists
      const teamsTable = await getTeamsTable();
      const team = await db.query.teams.findFirst({
        where: (teams, { eq }) => eq(teams.id, teamId),
      });

      if (!team) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Team not found',
          },
        });
      }

      const typesTable = await getTypesTable();
      const newTypes: TypeDefinition[] = [];

      for (const typeData of types) {
        // Check for duplicates
        const existing = await db.query.typeDefinitions.findFirst({
          where: (types, { and, eq }) => and(
            eq(types.teamId, teamId),
            eq(types.name, typeData.name)
          ),
        });

        if (existing) {
          return reply.status(409).send({
            error: {
              code: 'CONFLICT',
              message: `Type definition with name '${typeData.name}' already exists for the team`,
            },
          });
        }

        const newType: TypeDefinition = {
          id: randomUUID(),
          teamId,
          name: typeData.name,
          fileName: typeData.fileName,
          content: typeData.content,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        newTypes.push(newType);
      }

      await db.insert(typesTable).values(newTypes);

      return reply.status(201).send({ types: newTypes, count: newTypes.length });
    } catch (error: any) {
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to bulk upload type definitions',
        },
      });
    }
  });
};
