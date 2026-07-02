import fetch from 'node:fetch';

// Type definitions that match the server's schema
// These should eventually be shared via a shared package
export interface Team {
  id: string;
  name: string;
  createdAt: string;
}

export interface Schema {
  id: string;
  teamId: string;
  name: string;
  fileName: string;
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TypeDefinition {
  id: string;
  teamId: string;
  name: string;
  fileName: string;
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SchemoryClientOptions {
  baseUrl: string;
  teamId?: string;
}

export interface SchemoryError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

function isErrorResponse(response: Response): boolean {
  return response.status >= 400;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (isErrorResponse(response)) {
    const error: SchemoryError = await response.json();
    throw new Error(
      `Schemory API Error [${response.status}]: ${error.error.code} - ${error.error.message}`
    );
  }
  return response.json() as Promise<T>;
}

export class SchemoryClient {
  private baseUrl: string;
  private teamId?: string;

  constructor(options: SchemoryClientOptions) {
    this.baseUrl = options.baseUrl.endsWith('/') 
      ? options.baseUrl.slice(0, -1) 
      : options.baseUrl;
    this.teamId = options.teamId;
  }

  /**
   * Set the team ID for subsequent requests
   */
  setTeam(teamId: string): void {
    this.teamId = teamId;
  }

  /**
   * Check if the server is healthy
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; database: string; version: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    return handleResponse(response);
  }

  /**
   * Get API info
   */
  async getApiInfo(): Promise<{
    name: string;
    version: string;
    description: string;
    endpoints: Record<string, string>;
  }> {
    const response = await fetch(`${this.baseUrl}/api`);
    return handleResponse(response);
  }

  // ==========================================================================
  // Teams
  // ==========================================================================

  /**
   * List all teams
   */
  async listTeams(): Promise<{ teams: Team[] }> {
    const response = await fetch(`${this.baseUrl}/api/teams`);
    return handleResponse(response);
  }

  /**
   * Create a new team
   */
  async createTeam(name: string): Promise<{ team: Team }> {
    const response = await fetch(`${this.baseUrl}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return handleResponse(response);
  }

  /**
   * Get a specific team
   */
  async getTeam(teamId: string): Promise<{ team: Team }> {
    const response = await fetch(`${this.baseUrl}/api/teams/${teamId}`);
    return handleResponse(response);
  }

  // ==========================================================================
  // Schemas
  // ==========================================================================

  /**
   * List all schemas for a team
   */
  async listSchemas(teamId?: string): Promise<{ schemas: Schema[] }> {
    const id = teamId || this.teamId;
    if (!id) {
      throw new Error('teamId is required');
    }
    const response = await fetch(`${this.baseUrl}/api/teams/${id}/schemas`);
    return handleResponse(response);
  }

  /**
   * Get a single schema
   */
  async getSchema(teamId: string, schemaId: string): Promise<{ schema: Schema }> {
    const response = await fetch(`${this.baseUrl}/api/teams/${teamId}/schemas/${schemaId}`);
    return handleResponse(response);
  }

  /**
   * Create a new schema
   */
  async createSchema(schema: Omit<Schema, 'id' | 'teamId' | 'version' | 'createdAt' | 'updatedAt'>, teamId?: string): Promise<{ schema: Schema }> {
    const id = teamId || this.teamId;
    if (!id) {
      throw new Error('teamId is required');
    }
    const response = await fetch(`${this.baseUrl}/api/teams/${id}/schemas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schema),
    });
    return handleResponse(response);
  }

  /**
   * Update a schema
   */
  async updateSchema(
    teamId: string,
    schemaId: string,
    updates: Partial<Omit<Schema, 'id' | 'teamId' | 'version' | 'createdAt' | 'updatedAt'>>
  ): Promise<{ schema: Schema }> {
    const response = await fetch(`${this.baseUrl}/api/teams/${teamId}/schemas/${schemaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  }

  /**
   * Delete a schema
   */
  async deleteSchema(teamId: string, schemaId: string): Promise<{ schema: Schema; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/teams/${teamId}/schemas/${schemaId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  }

  /**
   * Bulk upload schemas
   */
  async bulkCreateSchemas(
    schemas: Omit<Schema, 'id' | 'teamId' | 'version' | 'createdAt' | 'updatedAt'>[],
    teamId?: string
  ): Promise<{ schemas: Schema[]; count: number }> {
    const id = teamId || this.teamId;
    if (!id) {
      throw new Error('teamId is required');
    }
    const response = await fetch(`${this.baseUrl}/api/teams/${id}/schemas/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schemas),
    });
    return handleResponse(response);
  }

  // ==========================================================================
  // Type Definitions
  // ==========================================================================

  /**
   * List all type definitions for a team
   */
  async listTypes(teamId?: string): Promise<{ types: TypeDefinition[] }> {
    const id = teamId || this.teamId;
    if (!id) {
      throw new Error('teamId is required');
    }
    const response = await fetch(`${this.baseUrl}/api/teams/${id}/types`);
    return handleResponse(response);
  }

  /**
   * Get a single type definition
   */
  async getType(teamId: string, typeId: string): Promise<{ type: TypeDefinition }> {
    const response = await fetch(`${this.baseUrl}/api/teams/${teamId}/types/${typeId}`);
    return handleResponse(response);
  }

  /**
   * Create a new type definition
   */
  async createType(
    typeDef: Omit<TypeDefinition, 'id' | 'teamId' | 'version' | 'createdAt' | 'updatedAt'>,
    teamId?: string
  ): Promise<{ type: TypeDefinition }> {
    const id = teamId || this.teamId;
    if (!id) {
      throw new Error('teamId is required');
    }
    const response = await fetch(`${this.baseUrl}/api/teams/${id}/types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(typeDef),
    });
    return handleResponse(response);
  }

  /**
   * Update a type definition
   */
  async updateType(
    teamId: string,
    typeId: string,
    updates: Partial<Omit<TypeDefinition, 'id' | 'teamId' | 'version' | 'createdAt' | 'updatedAt'>>
  ): Promise<{ type: TypeDefinition }> {
    const response = await fetch(`${this.baseUrl}/api/teams/${teamId}/types/${typeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  }

  /**
   * Delete a type definition
   */
  async deleteType(teamId: string, typeId: string): Promise<{ type: TypeDefinition; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/teams/${teamId}/types/${typeId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  }

  /**
   * Bulk upload type definitions
   */
  async bulkCreateTypes(
    types: Omit<TypeDefinition, 'id' | 'teamId' | 'version' | 'createdAt' | 'updatedAt'>[],
    teamId?: string
  ): Promise<{ types: TypeDefinition[]; count: number }> {
    const id = teamId || this.teamId;
    if (!id) {
      throw new Error('teamId is required');
    }
    const response = await fetch(`${this.baseUrl}/api/teams/${id}/types/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(types),
    });
    return handleResponse(response);
  }
}
