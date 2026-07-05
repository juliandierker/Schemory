// Server configuration derived from environment
// Centralized config to avoid scattering env var checks

// Activation link base URL - configurable via environment
export const ACTIVATION_BASE_URL = process.env.ACTIVATION_BASE_URL || 'https://api.schemory.app/auth/activate';

/**
 * Check if currently in development mode
 * Runtime check, not module-load-time, so it respects NODE_ENV changes
 */
export function isDev(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * Check if currently in test mode
 * Runtime check, not module-load-time
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}
