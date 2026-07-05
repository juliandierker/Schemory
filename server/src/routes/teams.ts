// Team routes for Fastify server
// POST /teams/:teamName/join, GET /teams

import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { joinTeam, getUserTeams, DbTeam, DbTeamMember, TeamWithMembership } from '../repos/teams.js';

// Response types

export interface TeamJoinResponse {
  team: {
    id: number;
    name: string;
    createdAt: string;
  };
  membership: {
    userId: number;
    teamId: number;
    role: string;
    joinedAt: string;
  };
}

export interface TeamsListResponse {
  teams: {
    id: number;
    name: string;
    createdAt: string;
  }[];
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Map DB team to response format
 */
function mapDbTeamToResponse(team: DbTeam): TeamJoinResponse['team'] {
  return {
    id: team.id,
    name: team.name,
    createdAt: team.created_at,
  };
}

/**
 * Map DB team member to response format
 */
function mapDbTeamMemberToResponse(
  membership: DbTeamMember
): TeamJoinResponse['membership'] {
  return {
    userId: membership.user_id,
    teamId: membership.team_id,
    role: membership.role,
    joinedAt: membership.joined_at,
  };
}

/**
 * Team routes plugin for Fastify
 */
export const teamRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /teams/:teamName/join
  // Joins a team by name, auto-creates team if it doesn't exist
  // Requires valid session (Bearer token)
  fastify.post<{
    Params: { teamName: string };
    Reply: TeamJoinResponse | ErrorResponse;
  }>('/teams/:teamName/join', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { teamName } = request.params;

    // Validate team name
    if (!teamName || teamName.trim().length === 0) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_TEAM_NAME',
          message: 'Team name is required',
        },
      });
    }

    // User is guaranteed to be set by requireAuth middleware
    const user = request.user!;

    try {
      // Join team (auto-creates if doesn't exist, idempotent)
      const result: TeamWithMembership = await joinTeam(user, teamName);

      return reply.status(200).send({
        team: mapDbTeamToResponse(result.team),
        membership: mapDbTeamMemberToResponse(result.membership),
      });
    } catch (error: unknown) {
      console.error('Join team error:', error);
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  });

  // GET /teams
  // Lists all teams the user belongs to
  // Requires valid session (Bearer token)
  fastify.get<{
    Reply: TeamsListResponse | ErrorResponse;
  }>('/teams', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    // User is guaranteed to be set by requireAuth middleware
    const user = request.user!;

    try {
      const teams = await getUserTeams(user.id);

      return reply.status(200).send({
        teams: teams.map(mapDbTeamToResponse),
      });
    } catch (error: unknown) {
      console.error('Get teams error:', error);
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  });
};

export default teamRoutes;
