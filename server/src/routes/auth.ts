// Auth routes for Fastify server
// POST /auth/signup, GET /auth/activate/:token, POST /auth/login

import { FastifyPluginAsync } from 'fastify';
import {
  createUserWithActivationToken,
  activateUserAndGenerateAccessToken,
  verifyAccessToken,
  getUserById,
} from '../repos/auth.js';
import { getEmailService } from '../email.js';
import { DbUser, DbAuthToken } from '../repos/auth.js';

// Response types
export interface SignupResponse {
  status: string;
  message: string;
}

export interface ActivateResponse {
  user: {
    id: number;
    email: string;
    isActive: boolean;
  };
  accessToken: string;
  expiresAt: string;
}

export interface LoginResponse {
  user: {
    id: number;
    email: string;
    isActive: boolean;
  };
  teams: any[]; // Will be populated from team memberships
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

// Helper to map DbUser to response format
function mapDbUserToResponse(user: DbUser): LoginResponse['user'] {
  return {
    id: user.id,
    email: user.email,
    isActive: user.is_active,
  };
}

/**
 * Auth routes plugin for Fastify
 */
export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /auth/signup
  // Creates a new user, generates activation token, sends activation email
  fastify.post<{
    Body: { email: string };
    Reply: SignupResponse | ErrorResponse;
  }>('/auth/signup', async (request, reply) => {
    const { email } = request.body;

    // Validate email
    if (!email || !email.includes('@')) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_EMAIL',
          message: 'Invalid email format',
        },
      });
    }

    try {
      // Create user and activation token
      const { activationToken } = await createUserWithActivationToken(email);

      // Send activation email (stub logs to console)
      await getEmailService().sendActivationEmail(email, activationToken);

      return reply.status(202).send({
        status: 'pending',
        message: 'Activation email sent',
      });
    } catch (error: unknown) {
      // Check if email already exists
      const pgError = error as { code?: string };
      if (pgError.code === '23505') { // PostgreSQL unique violation
        return reply.status(409).send({
          error: {
            code: 'EMAIL_EXISTS',
            message: 'Email already registered',
          },
        });
      }

      console.error('Signup error:', error);
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  });

  // GET /auth/activate/:token
  // Activates user account using activation token, returns access token
  fastify.get<{
    Params: { token: string };
    Reply: ActivateResponse | ErrorResponse;
  }>('/auth/activate/:token', async (request, reply) => {
    const { token } = request.params;

    if (!token) {
      return reply.status(400).send({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Activation token is required',
        },
      });
    }

    try {
      // Remove the 'act_' prefix if present for lookup
      const rawToken = token.startsWith('act_') ? token : `act_${token}`;
      
      const result = await activateUserAndGenerateAccessToken(rawToken);

      if (!result) {
        return reply.status(404).send({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Activation token not found or expired',
          },
        });
      }

      // Get user info to return
      const user = await getUserById(result.userId);
      
      if (!user) {
        return reply.status(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'User not found after activation',
          },
        });
      }

      // Access token expires in 1 year
      const expiresAt = new Date(Date.now() + 24 * 365 * 60 * 60 * 1000).toISOString();

      return reply.status(200).send({
        user: mapDbUserToResponse(user),
        accessToken: result.accessToken,
        expiresAt,
      });
    } catch (error: unknown) {
      console.error('Activation error:', error);
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  });

  // POST /auth/login
  // Verifies access token and returns user info
  fastify.post<{
    Body: { token: string };
    Reply: LoginResponse | ErrorResponse;
  }>('/auth/login', async (request, reply) => {
    const { token } = request.body;

    if (!token) {
      return reply.status(400).send({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
        },
      });
    }

    try {
      // Remove the 'sk_' prefix if present for lookup
      const rawToken = token.startsWith('sk_') ? token : `sk_${token}`;
      
      const result = await verifyAccessToken(rawToken);

      if (!result) {
        return reply.status(401).send({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired access token',
          },
        });
      }

      // For now, return empty teams array
      // In future, fetch from team_members table
      const teams: any[] = [];

      return reply.status(200).send({
        user: mapDbUserToResponse(result.user),
        teams,
      });
    } catch (error: unknown) {
      console.error('Login error:', error);
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  });
};

export default authRoutes;
