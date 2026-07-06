// Server configuration derived from environment
// Centralized config to avoid scattering env var checks

// Dashboard URL for web-based activation
// In production: https://schemory.org
// In development: http://localhost:5173 (Vite default port for dashboard)
// Can be overridden via DASHBOARD_URL environment variable
function getDashboardUrl(): string {
  if (process.env.DASHBOARD_URL) {
    return process.env.DASHBOARD_URL;
  }
  
  // In production, use the production domain
  if (process.env.NODE_ENV === 'production') {
    return 'https://schemory.org';
  }
  
  // In development, use localhost with Vite's default port
  return 'http://localhost:5173';
}

export const DASHBOARD_URL = getDashboardUrl();

// Activation link base URL - configurable via environment
// For web flow: should point to dashboard (e.g., https://schemory.org/activate)
// For CLI flow: can use the API endpoint (e.g., https://api.schemory.app/auth/activate)
export const ACTIVATION_BASE_URL = process.env.ACTIVATION_BASE_URL || `${DASHBOARD_URL}/activate`;

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
