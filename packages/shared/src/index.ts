// Shared types for Schemory
// Source: ARCHITECTURE.md design document

// ============================================================================
// User types
// ============================================================================

export interface User {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export interface UserSignupRequest {
  email: string;
}

export interface UserActivationRequest {
  token: string;
}

export interface UserActivationResponse {
  user: User;
  accessToken: string;
  expiresAt: string; // ISO 8601
}

// ============================================================================
// Team types
// ============================================================================

export type TeamRole = "member" | "admin";

export interface Team {
  id: string;
  name: string;
  createdAt: string;
  joinCode?: string;
}

export interface TeamMember {
  userId: string;
  teamId: string;
  role: TeamRole;
  joinedAt: string;
}

// ============================================================================
// Item types
// ============================================================================

export type ItemKind = "schema" | "type";

export interface Item {
  id: string;
  teamId: string;
  teamName?: string;
  name: string;
  kind: ItemKind;
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ItemCreateUpdateRequest {
  kind: ItemKind;
  content: string;
  lastKnownVersion?: number; // Required for updates, optional for creates
}

export interface ItemsResponse {
  items: Item[];
}

export interface ItemWithTeam extends Item {
  teamName: string;
}

export interface ItemResponse {
  item: Item;
}

// ============================================================================
// Auth types
// ============================================================================

export interface AuthVerifyResponse {
  user: User;
  teams: Team[];
}

// Token types (never stored raw in DB, only hashed)
export interface AuthToken {
  id: string;
  userId: string;
  token: string; // Raw token (in-memory only)
  expiresAt: string;
  createdAt: string;
  isRevoked: boolean;
}

export interface ActivationToken {
  id: string;
  userId: string;
  token: string; // Raw token
  expiresAt: string;
  createdAt: string;
}

// ============================================================================
// API Response types
// ============================================================================

// Success responses
export interface SuccessResponse<T = unknown> {
  data: T;
}

// Error responses
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// HTTP status code helpers
export type HttpStatus = 200 | 201 | 202 | 204 | 400 | 401 | 403 | 404 | 409 | 500;

// ============================================================================
// CLI Configuration types
// ============================================================================

export interface SchemoryConfig {
  version: string; // Config schema version (e.g., "1")
  auth?: {
    token: string; // CLI access token
    expiresAt: string; // ISO 8601
    userId: string;
  };
  teams: Team[]; // Cached list of user's teams
  defaultTeam?: string; // Default team for push/pull when ambiguous
  lastSyncAt?: string; // ISO 8601, last successful sync
  apiUrl?: string; // Custom API URL (default: https://api.schemory.org)
}
