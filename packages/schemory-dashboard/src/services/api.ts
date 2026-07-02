const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5555';

export type ApiResponse<T> = {
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
} & T;

function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    return response.json().then((error) => {
      throw new Error(
        `API Error [${response.status}]: ${error.error?.code || 'UNKNOWN'} - ${error.error?.message || 'Unknown error'}`
      );
    });
  }
  return response.json() as Promise<T>;
}

export const api = {
  // Health check
  health: (): Promise<{ status: string; timestamp: string; database: string; version: string }> =>
    fetch(`${API_URL}/health`).then(handleResponse<{ status: string; timestamp: string; database: string; version: string }>),

  // Teams
  listTeams: (): Promise<{ teams: any[] }> =>
    fetch(`${API_URL}/api/teams`).then(handleResponse<{ teams: any[] }>),

  createTeam: (name: string): Promise<{ team: any }> =>
    fetch(`${API_URL}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(handleResponse<{ team: any }>),

  // Schemas
  listSchemas: (teamId: string): Promise<{ schemas: any[] }> =>
    fetch(`${API_URL}/api/teams/${teamId}/schemas`).then(handleResponse<{ schemas: any[] }>),

  getSchema: (teamId: string, schemaId: string): Promise<{ schema: any }> =>
    fetch(`${API_URL}/api/teams/${teamId}/schemas/${schemaId}`).then(handleResponse<{ schema: any }>),

  createSchema: (teamId: string, schema: Omit<any, 'id' | 'teamId' | 'version' | 'createdAt' | 'updatedAt'>): Promise<{ schema: any }> =>
    fetch(`${API_URL}/api/teams/${teamId}/schemas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schema),
    }).then(handleResponse<{ schema: any }>),

  updateSchema: (teamId: string, schemaId: string, updates: Partial<any>): Promise<{ schema: any }> =>
    fetch(`${API_URL}/api/teams/${teamId}/schemas/${schemaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).then(handleResponse<{ schema: any }>),

  deleteSchema: (teamId: string, schemaId: string): Promise<{ schema: any; message: string }> =>
    fetch(`${API_URL}/api/teams/${teamId}/schemas/${schemaId}`, {
      method: 'DELETE',
    }).then(handleResponse<{ schema: any; message: string }>),

  // Types
  listTypes: (teamId: string): Promise<{ types: any[] }> =>
    fetch(`${API_URL}/api/teams/${teamId}/types`).then(handleResponse<{ types: any[] }>),

  getType: (teamId: string, typeId: string): Promise<{ type: any }> =>
    fetch(`${API_URL}/api/teams/${teamId}/types/${typeId}`).then(handleResponse<{ type: any }>),

  createType: (teamId: string, typeDef: Omit<any, 'id' | 'teamId' | 'version' | 'createdAt' | 'updatedAt'>): Promise<{ type: any }> =>
    fetch(`${API_URL}/api/teams/${teamId}/types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(typeDef),
    }).then(handleResponse<{ type: any }>),

  updateType: (teamId: string, typeId: string, updates: Partial<any>): Promise<{ type: any }> =>
    fetch(`${API_URL}/api/teams/${teamId}/types/${typeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).then(handleResponse<{ type: any }>),

  deleteType: (teamId: string, typeId: string): Promise<{ type: any; message: string }> =>
    fetch(`${API_URL}/api/teams/${teamId}/types/${typeId}`, {
      method: 'DELETE',
    }).then(handleResponse<{ type: any; message: string }>),
};

export default api;
