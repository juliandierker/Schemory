// Items repository - database queries for item management

import { query } from '../db.js';
import { DbUser } from './auth.js';

/**
 * Database item record
 */
export interface DbItem {
  id: number;
  team_id: number;
  name: string;
  kind: string;
  content: string;
  version: number;
  created_at: string;
  updated_at: string;
}

/**
 * Item type for API responses
 */
export interface Item {
  id: number;
  teamId: number;
  teamName?: string;
  name: string;
  kind: string;
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request type for creating/updating items
 */
export interface CreateUpdateItemRequest {
  kind: string;
  content: string;
  lastKnownVersion?: number;
  teamId?: number;
}

/**
 * Map DB item to API response format
 */
export function mapDbItemToItem(dbItem: DbItem, teamName?: string): Item {
  return {
    id: dbItem.id,
    teamId: dbItem.team_id,
    teamName,
    name: dbItem.name,
    kind: dbItem.kind,
    content: dbItem.content,
    version: dbItem.version,
    createdAt: dbItem.created_at,
    updatedAt: dbItem.updated_at,
  };
}

/**
 * Get all items across all teams the user belongs to, with team names
 */
export async function getAllItemsForUser(userId: number): Promise<DbItem[]> {
  const result = await query<DbItem>(
    `SELECT i.id, i.team_id, i.name, i.kind, i.content, i.version, i.created_at, i.updated_at
     FROM items i
     JOIN team_members tm ON i.team_id = tm.team_id
     WHERE tm.user_id = $1
     ORDER BY i.name`,
    [userId]
  );

  return result.rows;
}

/**
 * Get all items for a specific team that the user belongs to, with team name
 */
export async function getAllItemsForUserWithTeams(userId: number): Promise<{item: DbItem; teamName: string}[]> {
  const result = await query<{
    id: number;
    team_id: number;
    name: string;
    kind: string;
    content: string;
    version: number;
    created_at: string;
    updated_at: string;
    team_name: string;
  }>(
    `SELECT i.id, i.team_id, i.name, i.kind, i.content, i.version, i.created_at, i.updated_at, t.name as team_name
     FROM items i
     JOIN team_members tm ON i.team_id = tm.team_id
     JOIN teams t ON i.team_id = t.id
     WHERE tm.user_id = $1
     ORDER BY t.name, i.name`,
    [userId]
  );

  return result.rows.map(row => ({
    item: {
      id: row.id,
      team_id: row.team_id,
      name: row.name,
      kind: row.kind,
      content: row.content,
      version: row.version,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    teamName: row.team_name,
  }));
}

/**
 * Get all items for a specific team that the user belongs to
 */
export async function getItemsByTeamWithTeamInfo(userId: number, teamId: number): Promise<{item: DbItem; teamName: string}[]> {
  const result = await query<{
    id: number;
    team_id: number;
    name: string;
    kind: string;
    content: string;
    version: number;
    created_at: string;
    updated_at: string;
    team_name: string;
  }>(
    `SELECT i.id, i.team_id, i.name, i.kind, i.content, i.version, i.created_at, i.updated_at, t.name as team_name
     FROM items i
     JOIN team_members tm ON i.team_id = tm.team_id
     JOIN teams t ON i.team_id = t.id
     WHERE tm.user_id = $1 AND i.team_id = $2
     ORDER BY i.name`,
    [userId, teamId]
  );

  return result.rows.map(row => ({
    item: {
      id: row.id,
      team_id: row.team_id,
      name: row.name,
      kind: row.kind,
      content: row.content,
      version: row.version,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    teamName: row.team_name,
  }));
}

/**
 * Get a single item by name across all teams the user belongs to
 * Returns the first match (there could be items with same name in different teams)
 */
export async function getItemByNameForUser(
  userId: number,
  itemName: string
): Promise<DbItem | null> {
  const result = await query<DbItem>(
    `SELECT i.id, i.team_id, i.name, i.kind, i.content, i.version, i.created_at, i.updated_at
     FROM items i
     JOIN team_members tm ON i.team_id = tm.team_id
     WHERE tm.user_id = $1 AND i.name = $2
     ORDER BY i.team_id, i.name
     LIMIT 1`,
    [userId, itemName]
  );

  return result.rows[0] || null;
}

/**
 * Get an item by name within a specific team
 */
export async function getItemByNameInTeam(
  teamId: number,
  itemName: string
): Promise<DbItem | null> {
  const result = await query<DbItem>(
    `SELECT id, team_id, name, kind, content, version, created_at, updated_at
     FROM items
     WHERE team_id = $1 AND name = $2`,
    [teamId, itemName]
  );

  return result.rows[0] || null;
}

/**
 * Get an item by ID and team ID (for checking team membership)
 */
export async function getItemByIdAndTeam(
  itemId: number,
  teamId: number
): Promise<DbItem | null> {
  const result = await query<DbItem>(
    `SELECT id, team_id, name, kind, content, version, created_at, updated_at
     FROM items
     WHERE id = $1 AND team_id = $2`,
    [itemId, teamId]
  );

  return result.rows[0] || null;
}

/**
 * Check if user is a member of a team
 */
export async function isUserMemberOfTeam(
  userId: number,
  teamId: number
): Promise<boolean> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM team_members
     WHERE user_id = $1 AND team_id = $2`,
    [userId, teamId]
  );

  return parseInt(result.rows[0]?.count || '0', 10) > 0;
}

/**
 * Get the current version of an item
 */
export async function getItemVersion(teamId: number, itemName: string): Promise<number | null> {
  const result = await query<{ version: number }>(
    `SELECT version FROM items WHERE team_id = $1 AND name = $2`,
    [teamId, itemName]
  );

  return result.rows[0]?.version || null;
}

/**
 * Create a new item
 */
export async function createItem(
  teamId: number,
  name: string,
  kind: string,
  content: string
): Promise<DbItem> {
  const result = await query<DbItem>(
    `INSERT INTO items (team_id, name, kind, content, version)
     VALUES ($1, $2, $3, $4, 1)
     RETURNING id, team_id, name, kind, content, version, created_at, updated_at`,
    [teamId, name, kind, content]
  );

  return result.rows[0];
}

/**
 * Update an existing item and increment version
 */
export async function updateItem(
  id: number,
  content: string,
  version: number
): Promise<DbItem> {
  const newVersion = version + 1;
  const result = await query<DbItem>(
    `UPDATE items
     SET content = $2, version = $3, updated_at = NOW()
     WHERE id = $1
     RETURNING id, team_id, name, kind, content, version, created_at, updated_at`,
    [id, content, newVersion]
  );

  return result.rows[0];
}

/**
 * Create or update an item with optimistic concurrency control
 * 
 * Rules:
 * - If item doesn't exist: create with version 1 (if lastKnownVersion is 0 or undefined)
 * - If item exists:
 *   - If lastKnownVersion < current version: return conflict (409)
 *   - If lastKnownVersion == current version: update and increment version
 *   - If lastKnownVersion is not provided and item exists: treat as conflict (409)
 * 
 * Note: For PUT /items/:name, we need to find the item first, which requires knowing the team.
 * Since items have unique (team_id, name) constraint, we search across user's teams.
 */
export async function upsertItem(
  user: DbUser,
  teamId: number,
  itemName: string,
  kind: string,
  content: string,
  lastKnownVersion?: number
): Promise<{ item: DbItem; conflict: boolean }> {
  // Check if user is a member of this team
  const isMember = await isUserMemberOfTeam(user.id, teamId);
  if (!isMember) {
    throw new Error('User is not a member of this team');
  }

  // Check if item already exists for this team
  const existingItem = await query<DbItem>(
    `SELECT id, team_id, name, kind, content, version, created_at, updated_at
     FROM items
     WHERE team_id = $1 AND name = $2`,
    [teamId, itemName]
  ).then(r => r.rows[0] || null);

  if (!existingItem) {
    // Item doesn't exist - create it if lastKnownVersion is 0 or undefined
    if (lastKnownVersion !== undefined && lastKnownVersion !== 0) {
      // Can't create with non-zero lastKnownVersion
      throw new Error('Conflict: item does not exist but lastKnownVersion is not 0');
    }
    const newItem = await createItem(teamId, itemName, kind, content);
    return { item: newItem, conflict: false };
  }

  // Item exists - check version
  if (lastKnownVersion === undefined) {
    // No lastKnownVersion provided for an existing item - conflict
    throw new Error('Conflict: item exists but lastKnownVersion not provided');
  }

  if (lastKnownVersion < existingItem.version) {
    // Conflict: remote version is newer
    throw new Error(`Conflict: remote version ${existingItem.version} > lastKnownVersion ${lastKnownVersion}`);
  }

  if (lastKnownVersion === existingItem.version) {
    // Update the item and increment version
    const updatedItem = await updateItem(existingItem.id, content, existingItem.version);
    return { item: updatedItem, conflict: false };
  }

  // lastKnownVersion > existingItem.version - this shouldn't happen in normal flow
  // but we'll treat it as a conflict to be safe
  throw new Error(`Conflict: lastKnownVersion ${lastKnownVersion} > remote version ${existingItem.version}`);
}

/**
 * Get all items for a specific team that the user belongs to
 */
export async function getItemsByTeam(userId: number, teamId: number): Promise<DbItem[]> {
  const result = await query<DbItem>(
    `SELECT i.id, i.team_id, i.name, i.kind, i.content, i.version, i.created_at, i.updated_at
     FROM items i
     JOIN team_members tm ON i.team_id = tm.team_id
     WHERE tm.user_id = $1 AND i.team_id = $2
     ORDER BY i.name`,
    [userId, teamId]
  );

  return result.rows;
}

/**
 * Delete an item
 */
export async function deleteItem(itemId: number, teamId: number, userId: number): Promise<boolean> {
  // First, check if the user is a member of the team
  const isMember = await isUserMemberOfTeam(userId, teamId);
  if (!isMember) {
    throw new Error('User is not a member of this team');
  }

  // Check if the item exists and belongs to the specified team
  const existingItem = await query<{ id: number; team_id: number }>(
    `SELECT id, team_id FROM items WHERE id = $1 AND team_id = $2`,
    [itemId, teamId]
  );

  if (existingItem.rows.length === 0) {
    throw new Error('Item not found or does not belong to this team');
  }

  // Delete the item
  await query(
    `DELETE FROM items WHERE id = $1 AND team_id = $2`,
    [itemId, teamId]
  );

  return true;
}
