// Teams repository - database queries for team management

import { query } from '../db.js';
import { DbUser } from './auth.js';

/**
 * Database team record
 */
export interface DbTeam {
  id: number;
  name: string;
  created_at: string;
}

/**
 * Database team member record (join table)
 */
export interface DbTeamMember {
  user_id: number;
  team_id: number;
  role: string;
  joined_at: string;
}

/**
 * Team with membership info
 */
export interface TeamWithMembership {
  team: DbTeam;
  membership: DbTeamMember;
}

/**
 * Get a team by name
 */
export async function getTeamByName(name: string): Promise<DbTeam | null> {
  const result = await query<DbTeam>(
    `SELECT id, name, created_at FROM teams WHERE name = $1`,
    [name]
  );

  return result.rows[0] || null;
}

/**
 * Get a team by ID
 */
export async function getTeamById(id: number): Promise<DbTeam | null> {
  const result = await query<DbTeam>(
    `SELECT id, name, created_at FROM teams WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Create a new team
 */
export async function createTeam(name: string): Promise<DbTeam> {
  const result = await query<DbTeam>(
    `INSERT INTO teams (name)
     VALUES ($1)
     RETURNING id, name, created_at`,
    [name]
  );

  return result.rows[0];
}

/**
 * Get team membership for a user and team
 */
export async function getTeamMembership(
  userId: number,
  teamId: number
): Promise<DbTeamMember | null> {
  const result = await query<DbTeamMember>(
    `SELECT user_id, team_id, role, joined_at
     FROM team_members
     WHERE user_id = $1 AND team_id = $2`,
    [userId, teamId]
  );

  return result.rows[0] || null;
}

/**
 * Check if a user is a member of a team by team name
 */
export async function isUserMemberOfTeam(
  userId: number,
  teamName: string
): Promise<boolean> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM team_members tm
     JOIN teams t ON tm.team_id = t.id
     WHERE tm.user_id = $1 AND t.name = $2`,
    [userId, teamName]
  );

  return parseInt(result.rows[0]?.count || '0', 10) > 0;
}

/**
 * Join a team - creates team if it doesn't exist (auto-create behavior)
 * Returns the team and membership info
 * Idempotent: if user is already a member, returns existing membership
 */
export async function joinTeam(
  user: DbUser,
  teamName: string
): Promise<TeamWithMembership> {
  // Try to get existing team
  let team = await getTeamByName(teamName);

  // If team doesn't exist, create it (auto-create behavior)
  if (!team) {
    team = await createTeam(teamName);
  }

  // Check if user is already a member
  const existingMembership = await getTeamMembership(user.id, team.id);

  if (existingMembership) {
    // Already a member - return existing
    return {
      team,
      membership: existingMembership,
    };
  }

  // Add user to team
  const membershipResult = await query<DbTeamMember>(
    `INSERT INTO team_members (user_id, team_id, role, joined_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING user_id, team_id, role, joined_at`,
    [user.id, team.id, 'member']
  );

  const membership = membershipResult.rows[0];

  return {
    team,
    membership,
  };
}

/**
 * Get all teams for a user
 */
export async function getUserTeams(userId: number): Promise<DbTeam[]> {
  const result = await query<DbTeam>(
    `SELECT t.id, t.name, t.created_at
     FROM teams t
     JOIN team_members tm ON t.id = tm.team_id
     WHERE tm.user_id = $1
     ORDER BY t.name`,
    [userId]
  );

  return result.rows;
}
