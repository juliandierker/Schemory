// Item routes for Fastify server
// GET /items, GET /items/:name, PUT /items/:name

import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import {
  getAllItemsForUser,
  getItemByNameForUser,
  getItemByNameInTeam,
  upsertItem,
  deleteItem,
  CreateUpdateItemRequest,
  DbItem,
  Item,
  mapDbItemToItem,
  getAllItemsForUserWithTeams,
  getItemsByTeamWithTeamInfo,
} from '../repos/items.js';
import { getUserTeams, DbTeam } from '../repos/teams.js';
import { DbUser } from '../repos/auth.js';

// Response types

export interface ItemsResponse {
  items: Item[];
}

export interface ItemResponse {
  item: Item;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Map error message to response format
 */
function errorResponse(code: string, message: string): ErrorResponse {
  return {
    error: {
      code,
      message,
    },
  };
}

/**
 * Get the first team for a user (sorted by name for determinism)
 */
async function getFirstTeamForUser(userId: number): Promise<{ teamId: number; teamName: string } | null> {
  const teams = await getUserTeams(userId);
  if (teams.length === 0) {
    return null;
  }
  // Sort by name for deterministic behavior
  teams.sort((a: DbTeam, b: DbTeam) => a.name.localeCompare(b.name));
  return { teamId: teams[0].id, teamName: teams[0].name };
}

/**
 * Item routes plugin for Fastify
 */
export const itemRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /items
  // Returns all items across all teams the user belongs to, with optional team filtering
  fastify.get<{
    Querystring: { teamId?: string };
    Reply: ItemsResponse | ErrorResponse;
  }>('/items', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const user = request.user!;
    const { teamId } = request.query;

    try {
      if (teamId) {
        // Filter by specific team
        const teamIdNum = parseInt(teamId, 10);
        if (isNaN(teamIdNum)) {
          return reply.status(400).send(errorResponse('INVALID_TEAM_ID', 'teamId must be a valid number'));
        }

        const itemsWithTeams = await getItemsByTeamWithTeamInfo(user.id, teamIdNum);
        const items = itemsWithTeams.map(({ item, teamName }) => mapDbItemToItem(item, teamName));

        return reply.status(200).send({
          items,
        });
      } else {
        // Get all items with team information
        const itemsWithTeams = await getAllItemsForUserWithTeams(user.id);
        const items = itemsWithTeams.map(({ item, teamName }) => mapDbItemToItem(item, teamName));

        return reply.status(200).send({
          items,
        });
      }
    } catch (error: unknown) {
      console.error('Get items error:', error);
      return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Internal server error'));
    }
  });

  // GET /items/:name
  // Returns a single item by name, searches across all teams user belongs to
  fastify.get<{
    Params: { name: string };
    Reply: ItemResponse | ErrorResponse;
  }>('/items/:name', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const user = request.user!;
    const { name } = request.params;

    try {
      const dbItem = await getItemByNameForUser(user.id, name);

      if (!dbItem) {
        return reply.status(404).send(errorResponse('ITEM_NOT_FOUND', 'Item not found or user lacks access'));
      }

      // Get team name for this item
      const teamNameResult = await query<{ name: string }>(
        `SELECT name FROM teams WHERE id = $1`,
        [dbItem.team_id]
      );
      const teamName = teamNameResult.rows[0]?.name;

      return reply.status(200).send({
        item: mapDbItemToItem(dbItem, teamName),
      });
    } catch (error: unknown) {
      console.error('Get item error:', error);
      return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Internal server error'));
    }
  });

  // PUT /items/:name
  // Creates or updates an item with optimistic concurrency control
  fastify.put<{
    Params: { name: string };
    Body: CreateUpdateItemRequest;
    Reply: ItemResponse | ErrorResponse;
  }>('/items/:name', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const user = request.user!;
    const { name } = request.params;
    const { kind, content, lastKnownVersion, teamId } = request.body;

    // Validate request
    if (!kind || !content) {
      return reply.status(400).send(errorResponse('INVALID_REQUEST', 'kind and content are required'));
    }

    if (kind !== 'schema' && kind !== 'type') {
      return reply.status(400).send(errorResponse('INVALID_KIND', 'kind must be "schema" or "type"'));
    }

    try {
      // Get all teams for this user
      const userTeams = await getUserTeams(user.id);

      if (userTeams.length === 0) {
        return reply.status(404).send(errorResponse('TEAM_NOT_FOUND', 'Team not found or user not a member'));
      }

      let targetTeamId: number | null = null;

      if (teamId) {
        // Check if specified teamId is valid and user is a member
        const teamIdNum = parseInt(teamId.toString(), 10);
        if (isNaN(teamIdNum)) {
          return reply.status(400).send(errorResponse('INVALID_TEAM_ID', 'teamId must be a valid number'));
        }

        const isMember = userTeams.some(team => team.id === teamIdNum);
        if (!isMember) {
          return reply.status(404).send(errorResponse('TEAM_NOT_FOUND', 'Team not found or user not a member'));
        }
        targetTeamId = teamIdNum;
      } else {
        // Search for existing item with this name across all user's teams
        // If found in a team, use that team; otherwise use first team for creation
        for (const team of userTeams) {
          // Check if item exists in this team (sorted by team_id for determinism)
          const item = await getItemByNameInTeam(team.id, name);
          if (item) {
            // Found the item in this team - update it
            targetTeamId = team.id;
            break;
          }
        }

        // If we didn't find an existing item, use the first team for creation
        if (!targetTeamId) {
          // Sort teams by name for deterministic behavior
          const sortedTeams = [...userTeams].sort((a: DbTeam, b: DbTeam) => a.name.localeCompare(b.name));
          targetTeamId = sortedTeams[0].id;
        }
      }

      // Now perform the upsert
      // targetTeamId is guaranteed to be non-null here because we checked userTeams.length > 0
      const result = await upsertItem(
        user,
        targetTeamId!,
        name,
        kind,
        content,
        lastKnownVersion
      );

      // Get team name for the response
      const teamNameResult = await query<{ name: string }>(
        `SELECT name FROM teams WHERE id = $1`,
        [targetTeamId!]
      );
      const teamName = teamNameResult.rows[0]?.name;

      return reply.status(200).send({
        item: mapDbItemToItem(result.item, teamName),
      });
    } catch (error: unknown) {
      const errorMessage = (error as Error).message;

      if (errorMessage.includes('Conflict')) {
        return reply.status(409).send(errorResponse('CONFLICT', errorMessage));
      }

      if (errorMessage.includes('Team not found') || errorMessage.includes('not a member')) {
        return reply.status(404).send(errorResponse('TEAM_NOT_FOUND', 'Team not found or user not a member'));
      }

      console.error('Put item error:', error);
      return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Internal server error'));
    }
  });

  // DELETE /items/:name
  // Deletes an item by name from a specific team
  fastify.delete<{
    Params: { name: string };
    Querystring: { teamId?: string };
    Reply: { success: boolean } | ErrorResponse;
  }>('/items/:name', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const user = request.user!;
    const { name } = request.params;
    const { teamId } = request.query;

    try {
      if (!teamId) {
        return reply.status(400).send(errorResponse('TEAM_ID_REQUIRED', 'teamId query parameter is required'));
      }

      const teamIdNum = parseInt(teamId.toString(), 10);
      if (isNaN(teamIdNum)) {
        return reply.status(400).send(errorResponse('INVALID_TEAM_ID', 'teamId must be a valid number'));
      }

      // Get the item to find its ID and verify it exists
      const item = await getItemByNameInTeam(teamIdNum, name);
      if (!item) {
        return reply.status(404).send(errorResponse('ITEM_NOT_FOUND', 'Item not found or user lacks access'));
      }

      // Delete the item
      const success = await deleteItem(item.id, teamIdNum, user.id);

      if (!success) {
        return reply.status(500).send(errorResponse('DELETE_FAILED', 'Failed to delete item'));
      }

      return reply.status(200).send({ success: true });
    } catch (error: unknown) {
      const errorMessage = (error as Error).message;

      if (errorMessage.includes('not a member') || errorMessage.includes('User is not a member')) {
        return reply.status(403).send(errorResponse('UNAUTHORIZED', 'User is not a member of this team'));
      }

      if (errorMessage.includes('not found') || errorMessage.includes('does not belong')) {
        return reply.status(404).send(errorResponse('ITEM_NOT_FOUND', 'Item not found or does not belong to this team'));
      }

      console.error('Delete item error:', error);
      return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Internal server error'));
    }
  });
};

export default itemRoutes;
