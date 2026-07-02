// Types for the dashboard
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

export interface ExportManifest {
  version: string;
  exportedAt: string;
  schemoryVersion: string;
  team: {
    id: string;
    name?: string;
  };
  contents: {
    schemas: number;
    types: number;
    totalSize?: number;
  };
}
