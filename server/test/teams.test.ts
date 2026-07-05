// Team routes integration test
// login -> join a new team -> assert team_members row exists -> joining again is idempotent

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { server } from '../src/index.js';
import { Client } from 'pg';
import { testDbName, TEST_DB_CONFIG } from './setup.js';
import { setEmailService, EmailService } from '../src/email.js';

// Test email service that captures activation tokens
class TestEmailService implements EmailService {
  capturedEmails: Map<string, string> = new Map();

  async sendActivationEmail(email: string, activationToken: string): Promise<void> {
    this.capturedEmails.set(email, activationToken);
  }

  getActivationToken(email: string): string | undefined {
    return this.capturedEmails.get(email);
  }
}

// Helper to get a DB client for the test database
function getTestDbClient() {
  return new Client({
    host: TEST_DB_CONFIG.host,
    port: TEST_DB_CONFIG.port,
    user: TEST_DB_CONFIG.user,
    password: TEST_DB_CONFIG.password,
    database: testDbName,
  });
}

// Helper to make requests to the server
async function request(
  method: string,
  path: string,
  body?: object,
  headers?: Record<string, string>
) {
  const baseHeaders: Record<string, string> = { ...headers };
  // Only set Content-Type if we have a body
  if (body !== undefined) {
    baseHeaders['Content-Type'] = 'application/json';
  }
  
  const response = await server.inject({
    method,
    url: path,
    payload: body,
    headers: baseHeaders,
  });
  return response;
}

/**
 * Stage 3 helper: login and return access token
 * This replicates the signup -> activate -> login flow
 */
async function getAccessToken(testEmailService: TestEmailService): Promise<string> {
  const testEmail = `test_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;

  // Signup
  const signupResponse = await request('POST', '/auth/signup', { email: testEmail });
  expect(signupResponse.statusCode).toBe(202);

  // Get activation token
  const activationToken = testEmailService.getActivationToken(testEmail);
  expect(activationToken).toBeDefined();

  // Activate
  const activateResponse = await request('GET', `/auth/activate/${activationToken}`);
  expect(activateResponse.statusCode).toBe(200);
  const activateBody = activateResponse.json();
  expect(activateBody.accessToken).toBeDefined();

  return activateBody.accessToken;
}

describe('team routes', () => {
  let dbClient: Client;
  let testEmailService: TestEmailService;

  beforeAll(async () => {
    // Setup test email service
    testEmailService = new TestEmailService();
    setEmailService(testEmailService);

    // The setup.ts has already created the DB and run migrations
    dbClient = await getTestDbClient().connect();
  });

  afterAll(async () => {
    await dbClient.end();
    await server.close();
  });

  beforeEach(async () => {
    // Clear captured emails before each test
    testEmailService.capturedEmails.clear();

    // Clear all data from previous tests
    await dbClient.query('DELETE FROM team_members');
    await dbClient.query('DELETE FROM teams');
    await dbClient.query('DELETE FROM auth_tokens');
    await dbClient.query('DELETE FROM activation_tokens');
    await dbClient.query('DELETE FROM users');
  });

  it('login -> join a new team -> assert team_members row exists -> joining again is idempotent', async () => {
    // Step 1: Login (reuse Stage 3 helper)
    const accessToken = await getAccessToken(testEmailService);

    // Step 2: Join a new team
    const teamName = `test-team-${Date.now()}`;
    const joinResponse = await request('POST', `/teams/${teamName}/join`, undefined, {
      Authorization: `Bearer ${accessToken}`,
    });

    expect(joinResponse.statusCode).toBe(200);
    const joinBody = joinResponse.json();

    // Assert team info
    expect(joinBody.team).toBeDefined();
    expect(joinBody.team.name).toBe(teamName);
    expect(joinBody.team.id).toBeDefined();
    expect(joinBody.team.createdAt).toBeDefined();

    // Assert membership info
    expect(joinBody.membership).toBeDefined();
    expect(joinBody.membership.userId).toBeDefined();
    expect(joinBody.membership.teamId).toBe(joinBody.team.id);
    expect(joinBody.membership.role).toBe('member');
    expect(joinBody.membership.joinedAt).toBeDefined();

    // Step 3: Assert team_members row exists in database
    const membershipResult = await dbClient.query(
      `SELECT * FROM team_members WHERE team_id = (SELECT id FROM teams WHERE name = $1)`,
      [teamName]
    );
    expect(membershipResult.rows.length).toBe(1);
    const membershipRow = membershipResult.rows[0];
    expect(membershipRow.role).toBe('member');
    expect(membershipRow.joined_at).toBeDefined();

    // Step 4: Joining again should be idempotent (no duplicate row)
    const joinAgainResponse = await request('POST', `/teams/${teamName}/join`, undefined, {
      Authorization: `Bearer ${accessToken}`,
    });

    expect(joinAgainResponse.statusCode).toBe(200);

    // Verify still only one team_members row
    const membershipResultAfter = await dbClient.query(
      `SELECT * FROM team_members WHERE team_id = (SELECT id FROM teams WHERE name = $1)`,
      [teamName]
    );
    expect(membershipResultAfter.rows.length).toBe(1);
    
    // The response should still contain the same membership info
    const joinAgainBody = joinAgainResponse.json();
    expect(joinAgainBody.membership.userId).toBe(joinBody.membership.userId);
    expect(joinAgainBody.membership.teamId).toBe(joinBody.membership.teamId);
  });

  it('join without authentication returns 401', async () => {
    const teamName = `test-team-unauth-${Date.now()}`;
    const response = await request('POST', `/teams/${teamName}/join`);

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('join with invalid token returns 401', async () => {
    const teamName = `test-team-invalid-${Date.now()}`;
    const response = await request('POST', `/teams/${teamName}/join`, undefined, {
      Authorization: 'Bearer invalid_token_xyz',
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error.code).toBe('INVALID_TOKEN');
  });

  it('join with empty team name returns 400', async () => {
    const accessToken = await getAccessToken(testEmailService);
    const response = await request('POST', '/teams/ /join', undefined, {
      Authorization: `Bearer ${accessToken}`,
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error.code).toBe('INVALID_TEAM_NAME');
  });

  it('join auto-creates team when it does not exist', async () => {
    const accessToken = await getAccessToken(testEmailService);
    const teamName = `newly-created-team-${Date.now()}`;

    // Verify team doesn't exist before joining
    const teamBefore = await dbClient.query('SELECT * FROM teams WHERE name = $1', [teamName]);
    expect(teamBefore.rows.length).toBe(0);

    // Join the team
    const response = await request('POST', `/teams/${teamName}/join`, undefined, {
      Authorization: `Bearer ${accessToken}`,
    });

    expect(response.statusCode).toBe(200);

    // Verify team was created
    const teamAfter = await dbClient.query('SELECT * FROM teams WHERE name = $1', [teamName]);
    expect(teamAfter.rows.length).toBe(1);
    expect(teamAfter.rows[0].name).toBe(teamName);
  });

  it('GET /teams returns users teams with role', async () => {
    const accessToken = await getAccessToken(testEmailService);

    // Join a couple of teams
    const teamName1 = `user-team-1-${Date.now()}`;
    const teamName2 = `user-team-2-${Date.now()}`;

    await request('POST', `/teams/${teamName1}/join`, undefined, {
      Authorization: `Bearer ${accessToken}`,
    });
    await request('POST', `/teams/${teamName2}/join`, undefined, {
      Authorization: `Bearer ${accessToken}`,
    });

    // Get teams
    const response = await request('GET', '/teams', undefined, {
      Authorization: `Bearer ${accessToken}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.teams).toBeDefined();
    expect(body.teams.length).toBe(2);
    
    const teamNames = body.teams.map((t: { name: string }) => t.name).sort();
    expect(teamNames).toEqual([teamName1, teamName2].sort());
    
    // Verify each team has a role
    body.teams.forEach((team: { id: number; name: string; role: string }) => {
      expect(team.id).toBeDefined();
      expect(team.name).toBeDefined();
      expect(team.role).toBe('member');
    });
  });

  it('GET /teams without authentication returns 401', async () => {
    const response = await request('GET', '/teams');

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /teams returns empty array for user with no teams', async () => {
    const accessToken = await getAccessToken(testEmailService);

    // Don't join any teams, just get the teams list
    const response = await request('GET', '/teams', undefined, {
      Authorization: `Bearer ${accessToken}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.teams).toBeDefined();
    expect(body.teams).toEqual([]);
  });

  it('GET /teams returns both teams for user in two teams with correct roles', async () => {
    const accessToken = await getAccessToken(testEmailService);

    // Join two teams
    const teamName1 = `multi-team-test-1-${Date.now()}`;
    const teamName2 = `multi-team-test-2-${Date.now()}`;

    const joinResponse1 = await request('POST', `/teams/${teamName1}/join`, undefined, {
      Authorization: `Bearer ${accessToken}`,
    });
    expect(joinResponse1.statusCode).toBe(200);

    const joinResponse2 = await request('POST', `/teams/${teamName2}/join`, undefined, {
      Authorization: `Bearer ${accessToken}`,
    });
    expect(joinResponse2.statusCode).toBe(200);

    // Get teams
    const response = await request('GET', '/teams', undefined, {
      Authorization: `Bearer ${accessToken}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.teams).toBeDefined();
    expect(body.teams.length).toBe(2);

    // Verify both teams are returned with correct role
    const teamsByName = body.teams.reduce((acc: Record<string, { id: number; role: string }>, team: { id: number; name: string; role: string }) => {
      acc[team.name] = { id: team.id, role: team.role };
      return acc;
    }, {});

    expect(teamsByName[teamName1]).toBeDefined();
    expect(teamsByName[teamName1].role).toBe('member');
    expect(teamsByName[teamName2]).toBeDefined();
    expect(teamsByName[teamName2].role).toBe('member');
  });
});
