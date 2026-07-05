// Session authentication middleware for Fastify
// Verifies the Authorization: Bearer <token> header and attaches user to request

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../repos/auth.js';
import { DbUser } from '../repos/auth.js';

// Augment Fastify request type to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: DbUser;
  }
}

/**
 * Authentication middleware that verifies the Bearer token
 * and attaches the user to the request context
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Get Authorization header
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  if (!token) {
    return reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  // Verify the access token
  const result = await verifyAccessToken(token);

  if (!result) {
    return reply.status(401).send({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired access token',
      },
    });
  }

  // Attach user to request
  request.user = result.user;
}

/**
 * Fastify plugin that registers the auth middleware
 */
export const authMiddleware: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', requireAuth);
};

// Export the requireAuth function directly for use in route handlers
export { requireAuth as default };
