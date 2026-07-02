import { FastifyPluginAsync } from 'fastify';
import { getDb, getDbType } from '../db/connection';
import { Schema, NewSchema } from '../db/schema';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

// Helper to get the correct table based on database type
async function getSchemasTable() {
  const dbType = getDbType();
  if (dbType === 'pg') {
    const { schemasPg } = await import('../db/schema');
    return schemasPg;
  } else {
    const { schemasSqlite } = await import('../db/schema');
    return schemasSqlite;
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

export const schemasRoutes: FastifyPluginAsync = async (fastify) => {
  // List all schemas for a team
  fastify.get('/:teamId/schemas', async (request, reply) => {
    const db = getDb();
    const { teamId } = request.params as { teamId: string };

    try {
      const schemasTable = await getSchemasTable();
      const schemas = await db.query.schemas.findMany({
        where: (schemas, { eq }) => eq(schemas.teamId, teamId),
      });
      return { schemas };
    } catch (error) {
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch schemas',
        },
      });
    }
  });

  // Get a single schema
  fastify.get('/:teamId/schemas/:id', async (request, reply) => {
    const db = getDb();
    const { id, teamId } = request.params as { id: string; teamId: string };

    try {
      const schemasTable = await getSchemasTable();
      const schema = await db.query.schemas.findFirst({
        where: (schemas, { and, eq }) => and(
          eq(schemas.id, id),
          eq(schemas.teamId, teamId)
        ),
      });

      if (!schema) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Schema not found',
          },
        });
      }
      return { schema };
    } catch (error) {
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch schema',
        },
      });
    }
  });

  // Create a new schema
  fastify.post('/:teamId/schemas', async (request, reply) => {
    const db = getDb();
    const { teamId } = request.params as { teamId: string };
    const body = request.body as NewSchema;

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

      // Check if schema with this name already exists for the team
      const schemasTable = await getSchemasTable();
      const existing = await db.query.schemas.findFirst({
        where: (schemas, { and, eq }) => and(
          eq(schemas.teamId, teamId),
          eq(schemas.name, body.name)
        ),
      });

      if (existing) {
        return reply.status(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Schema with this name already exists for the team',
          },
        });
      }

      const newSchema: Schema = {
        id: randomUUID(),
        teamId,
        name: body.name,
        fileName: body.fileName,
        content: body.content,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(schemasTable).values(newSchema);

      return reply.status(201).send({ schema: newSchema });
    } catch (error: any) {
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create schema',
        },
      });
    }
  });

  // Update a schema
  fastify.put('/:teamId/schemas/:id', async (request, reply) => {
    const db = getDb();
    const { id, teamId } = request.params as { id: string; teamId: string };
    const body = request.body as Partial<NewSchema>;

    if (!body.name && !body.content && !body.fileName) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one of name, content, or fileName must be provided',
        },
      });
    }

    try {
      const schemasTable = await getSchemasTable();
      
      // Get current schema to check ownership and increment version
      const currentSchema = await db.query.schemas.findFirst({
        where: (schemas, { and, eq }) => and(
          eq(schemas.id, id),
          eq(schemas.teamId, teamId)
        ),
      });

      if (!currentSchema) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Schema not found',
          },
        });
      }

      // Build update object
      const updateData: Partial<Schema> = {
        ...(body.name && { name: body.name }),
        ...(body.content && { content: body.content }),
        ...(body.fileName && { fileName: body.fileName }),
        version: currentSchema.version + 1,
        updatedAt: new Date(),
      };

      const [updatedSchema] = await db
        .update(schemasTable)
        .set(updateData)
        .where(eq(schemasTable.id, id))
        .returning();

      return { schema: updatedSchema };
    } catch (error: any) {
      if (error.message?.includes('unique constraint') || error.message?.includes('UNIQUE constraint failed')) {
        return reply.status(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Schema with this name already exists for the team',
          },
        });
      }
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update schema',
        },
      });
    }
  });

  // Delete a schema
  fastify.delete('/:teamId/schemas/:id', async (request, reply) => {
    const db = getDb();
    const { id, teamId } = request.params as { id: string; teamId: string };

    try {
      const schemasTable = await getSchemasTable();
      const [deletedSchema] = await db
        .delete(schemasTable)
        .where(eq(schemasTable.id, id))
        .returning();

      if (!deletedSchema) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Schema not found',
          },
        });
      }

      return { schema: deletedSchema, message: 'Schema deleted' };
    } catch (error) {
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to delete schema',
        },
      });
    }
  });

  // Bulk upload schemas
  fastify.post('/:teamId/schemas/bulk', async (request, reply) => {
    const db = getDb();
    const { teamId } = request.params as { teamId: string };
    const schemas = request.body as NewSchema[];

    if (!Array.isArray(schemas) || schemas.length === 0) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Array of schemas is required',
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

      const schemasTable = await getSchemasTable();
      const newSchemas: Schema[] = [];

      for (const schemaData of schemas) {
        // Check for duplicates
        const existing = await db.query.schemas.findFirst({
          where: (schemas, { and, eq }) => and(
            eq(schemas.teamId, teamId),
            eq(schemas.name, schemaData.name)
          ),
        });

        if (existing) {
          return reply.status(409).send({
            error: {
              code: 'CONFLICT',
              message: `Schema with name '${schemaData.name}' already exists for the team`,
            },
          });
        }

        const newSchema: Schema = {
          id: randomUUID(),
          teamId,
          name: schemaData.name,
          fileName: schemaData.fileName,
          content: schemaData.content,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        newSchemas.push(newSchema);
      }

      await db.insert(schemasTable).values(newSchemas);

      return reply.status(201).send({ schemas: newSchemas, count: newSchemas.length });
    } catch (error: any) {
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to bulk upload schemas',
        },
      });
    }
  });
};
