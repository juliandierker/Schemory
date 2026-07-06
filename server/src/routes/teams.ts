// Team routes for Fastify server
// POST /teams/:teamName/join, GET /teams, POST /teams, GET /teams/:teamId/joincode

import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { 
  joinTeamByJoinCode, 
  createAndJoinTeam, 
  getUserTeams, 
  getUserTeamsWithRoles, 
  getTeamById,
  DbTeam, 
  DbTeamMember, 
  TeamWithMembership, 
  UserTeam 
} from '../repos/teams.js';

// Response types

export interface TeamJoinResponse {
  team: {
    id: number;
    name: string;
    createdAt: string;
    joinCode?: string;
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
    joinCode?: string;
    role: string;
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
    joinCode: team.join_code,
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
 * Map UserTeam (team with role) to response format for GET /teams
 */
function mapUserTeamToResponse(team: UserTeam): TeamsListResponse['teams'][0] {
  return {
    id: team.id,
    name: team.name,
    joinCode: team.join_code,
    role: team.role,
  };
}

/**
 * Team routes plugin for Fastify
 */
export const teamRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /teams/:joinCode/join
  // Joins a team by join code
  // Requires valid session (Bearer token)
  fastify.post<{
    Params: { joinCode: string };
    Reply: TeamJoinResponse | ErrorResponse;
  }>('/teams/:joinCode/join', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { joinCode } = request.params;

    // Validate join code
    if (!joinCode || joinCode.trim().length === 0) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_JOIN_CODE',
          message: 'Join code is required',
        },
      });
    }

    // User is guaranteed to be set by requireAuth middleware
    const user = request.user!;

    try {
      // Join team by join code
      const result: TeamWithMembership = await joinTeamByJoinCode(user, joinCode);

      return reply.status(200).send({
        team: mapDbTeamToResponse(result.team),
        membership: mapDbTeamMemberToResponse(result.membership),
      });
    } catch (error: unknown) {
      console.error('Join team error:', error);
      
      // Check for specific error
      if (error instanceof Error && error.message === 'Team not found') {
        return reply.status(404).send({
          error: {
            code: 'TEAM_NOT_FOUND',
            message: 'Team with this join code not found',
          },
        });
      }
      
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  });

  // POST /teams
  // Creates a new team and joins it
  // Requires valid session (Bearer token)
  fastify.post<{
    Body: { name: string };
    Reply: TeamJoinResponse | ErrorResponse;
  }>('/teams', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { name } = request.body;

    // Validate team name
    if (!name || name.trim().length === 0) {
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
      // Create and join team
      const result: TeamWithMembership = await createAndJoinTeam(user, name);

      return reply.status(201).send({
        team: mapDbTeamToResponse(result.team),
        membership: mapDbTeamMemberToResponse(result.membership),
      });
    } catch (error: unknown) {
      console.error('Create team error:', error);
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  });

  // GET /teams/:teamId/joincode
  // Get the join code for a team (only accessible by team members)
  // Requires valid session (Bearer token)
  fastify.get<{
    Params: { teamId: string };
    Reply: { joinCode: string } | ErrorResponse;
  }>('/teams/:teamId/joincode', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { teamId } = request.params;
    const user = request.user!;

    try {
      const teamIdNum = parseInt(teamId, 10);
      
      if (isNaN(teamIdNum)) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_TEAM_ID',
            message: 'Invalid team ID',
          },
        });
      }

      // Get the team
      const team = await getTeamById(teamIdNum);
      
      if (!team) {
        return reply.status(404).send({
          error: {
            code: 'TEAM_NOT_FOUND',
            message: 'Team not found',
          },
        });
      }

      // Check if user is a member of this team
      // For now, we'll just check if the user has access to the team
      // A more thorough check would be needed in production
      const userTeams = await getUserTeams(user.id);
      const isMember = userTeams.some(t => t.id === teamIdNum);
      
      if (!isMember) {
        return reply.status(403).send({
          error: {
            code: 'ACCESS_DENIED',
            message: 'You are not a member of this team',
          },
        });
      }

      if (!team.join_code) {
        return reply.status(500).send({
          error: {
            code: 'MISSING_JOIN_CODE',
            message: 'Team does not have a join code',
          },
        });
      }

      return reply.status(200).send({
        joinCode: team.join_code,
      });
    } catch (error: unknown) {
      console.error('Get join code error:', error);
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  });

  // GET /teams
  // Lists all teams the user belongs to with their role
  // Requires valid session (Bearer token)
  fastify.get<{
    Reply: TeamsListResponse | ErrorResponse;
  }>('/teams', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    // User is guaranteed to be set by requireAuth middleware
    const user = request.user!;

    try {
      const teams = await getUserTeamsWithRoles(user.id);

      return reply.status(200).send({
        teams: teams.map(mapUserTeamToResponse),
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
