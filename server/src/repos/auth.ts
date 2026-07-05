// Auth repository - database queries for authentication
// Uses the query functions from db.ts

import { query } from '../db.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Token configuration
const ACTIVATION_TOKEN_EXPIRY_HOURS = 24;
const ACCESS_TOKEN_EXPIRY_HOURS = 24 * 365; // 1 year
const TOKEN_HASH_ROUNDS = 10;

/**
 * Generate a random token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Hash a token for storage
 */
async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, TOKEN_HASH_ROUNDS);
}

/**
 * Verify a token against its hash
 */
async function verifyToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash);
}

/**
 * Token types for type safety
 */
export type ActivationTokenRaw = string;
export type AccessTokenRaw = string;

/**
 * User data returned from DB
 */
export interface DbUser {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Auth token data from DB
 */
export interface DbAuthToken {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: string;
  created_at: string;
  is_revoked: boolean;
}

/**
 * Activation token data from DB
 */
export interface DbActivationToken {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

/**
 * Signup: Create a new user and activation token
 */
export async function createUserWithActivationToken(
  email: string
): Promise<{ userId: number; activationToken: ActivationTokenRaw }> {
  // Create user (inactive by default)
  const userResult = await query<DbUser>(
    `INSERT INTO users (email, is_active)
     VALUES ($1, false)
     RETURNING id, email, is_active, created_at, updated_at`,
    [email]
  );
  
  const user = userResult.rows[0];
  const userId = user.id;

  // Generate activation token
  const activationToken = 'act_' + generateToken();
  const tokenHash = await hashToken(activationToken);
  
  // Calculate expiry (24 hours from now)
  const expiresAt = new Date(Date.now() + ACTIVATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  // Store activation token
  await query(
    `INSERT INTO activation_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt.toISOString()]
  );

  return { userId, activationToken };
}

/**
 * Activate: Look up activation token, activate user, generate access token
 */
export async function activateUserAndGenerateAccessToken(
  activationToken: string
): Promise<{ userId: number; accessToken: AccessTokenRaw } | null> {
  // Find activation token
  const tokenResult = await query<DbActivationToken>(
    `SELECT at.id, at.user_id, at.token_hash, at.expires_at
     FROM activation_tokens at
     WHERE at.expires_at > NOW()
     ORDER BY at.created_at DESC
     LIMIT 1`
  );

  if (tokenResult.rows.length === 0) {
    return null; // No valid activation token found
  }

  const activationTokenRecord = tokenResult.rows[0];
  
  // Verify token matches
  const isValid = await verifyToken(activationToken, activationTokenRecord.token_hash);
  if (!isValid) {
    return null;
  }

  const userId = activationTokenRecord.user_id;

  // Activate user
  await query(
    `UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1`,
    [userId]
  );

  // Delete activation token (one-time use)
  await query(
    `DELETE FROM activation_tokens WHERE id = $1`,
    [activationTokenRecord.id]
  );

  // Generate access token
  const accessToken = 'sk_' + generateToken();
  const accessTokenHash = await hashToken(accessToken);
  
  // Calculate expiry (1 year from now)
  const accessExpiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  // Store access token
  await query(
    `INSERT INTO auth_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, accessTokenHash, accessExpiresAt.toISOString()]
  );

  return { userId, accessToken };
}

/**
 * Login: Verify access token and return user info
 */
export async function verifyAccessToken(
  accessToken: string
): Promise<{ user: DbUser; token: DbAuthToken } | null> {
  // Find active, non-revoked, non-expired token
  const tokenResult = await query<DbAuthToken>(
    `SELECT at.id, at.user_id, at.token_hash, at.expires_at, at.created_at, at.is_revoked
     FROM auth_tokens at
     WHERE at.expires_at > NOW()
       AND at.is_revoked = false
     ORDER BY at.created_at DESC`
  );

  if (tokenResult.rows.length === 0) {
    return null;
  }

  // Try each token (there could be multiple valid tokens for a user)
  for (const tokenRecord of tokenResult.rows) {
    const isValid = await verifyToken(accessToken, tokenRecord.token_hash);
    if (isValid) {
      // Get user info
      const userResult = await query<DbUser>(
        `SELECT id, email, is_active, created_at, updated_at
         FROM users WHERE id = $1`,
        [tokenRecord.user_id]
      );
      
      if (userResult.rows.length === 0) {
        return null;
      }

      return { user: userResult.rows[0], token: tokenRecord };
    }
  }

  return null;
}

/**
 * Get user by email (for future password-based auth if needed)
 */
export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const result = await query<DbUser>(
    `SELECT id, email, is_active, created_at, updated_at
     FROM users WHERE email = $1`,
    [email]
  );
  
  return result.rows[0] || null;
}

/**
 * Get user by ID
 */
export async function getUserById(id: number): Promise<DbUser | null> {
  const result = await query<DbUser>(
    `SELECT id, email, is_active, created_at, updated_at
     FROM users WHERE id = $1`,
    [id]
  );
  
  return result.rows[0] || null;
}
