// Item routes integration test
// Tests: push new item -> pull back and match; pullAll returns all team items only;
// push twice increments version; pull unknown name returns 404

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
 * Helper: get access token for a new user
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

  return activateBody.accessToken as string;
}

/**
 * Helper: join a team and return the team name
 */
async function joinTeam(accessToken: string, teamName: string): Promise<void> {
  const response = await request('POST', `/teams/${teamName}/join`, undefined, {
    Authorization: `Bearer ${accessToken}`,
  });
  expect(response.statusCode).toBe(200);
}

describe('item routes', () => {
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
    await dbClient.query('DELETE FROM items');
    await dbClient.query('DELETE FROM auth_tokens');
    await dbClient.query('DELETE FROM activation_tokens');
    await dbClient.query('DELETE FROM users');
  });

  it('push a new item -> pull it back and match content', async () => {
    // Setup: create user and join team
    const accessToken = await getAccessToken(testEmailService);
    const teamName = `test-team-push-pull-${Date.now()}`;
    await joinTeam(accessToken, teamName);

    // Push a new item
    const itemName = 'UserSchema';
    const itemContent = '{"type": "object", "properties": {"name": {"type": "string"}}}';
    const itemKind = 'schema';

    const pushResponse = await request('PUT', `/items/${itemName}`, {
      kind: itemKind,
      content: itemContent,
      lastKnownVersion: 0,
    }, {
      Authorization: `Bearer ${accessToken}`,
    });

    expect(pushResponse.statusCode).toBe(200);
    const pushBody = pushResponse.json();
    expect(pushBody.item).toBeDefined();
    expect(pushBody.item.name).toBe(itemName);
    expect(pushBody.item.kind).toBe(itemKind);
    expect(pushBody.item.content).toBe(itemContent);
    expect(pushBody.item.version).toBe(1);

    // Pull it back
    const pullResponse = await request('GET', `/items/${itemName}`, undefined, {
      Authorization: `Bearer ${accessToken}`,
    });

    expect(pullResponse.statusCode).toBe(200);
    const pullBody = pullResponse.json();
    expect(pullBody.item).toBeDefined();
    expect(pullBody.item.name).toBe(itemName);
    expect(pullBody.item.kind).toBe(itemKind);
    expect(pullBody.item.content).toBe(itemContent);
    expect(pullBody.item.version).toBe(1);
  });

  it('pullAll returns all team items and none from other teams', async () => {
    // Create two users with different teams
    const user1Token = await getAccessToken(testEmailService);
    const user2Token = await getAccessToken(testEmailService);

    // User 1 joins team A
    const teamA = `team-a-${Date.now()}`;
    await joinTeam(user1Token, teamA);

    // User 2 joins team B
    const teamB = `team-b-${Date.now()}`;
    await joinTeam(user2Token, teamB);

    // User 1 pushes item to team A
    await request('PUT', '/items/TeamAItem', {
      kind: 'schema',
      content: '{"team": "A"}',
      lastKnownVersion: 0,
    }, {
      Authorization: `Bearer ${user1Token}`,
    });

    // User 2 pushes item to team B
    await request('PUT', '/items/TeamBItem', {
      kind: 'schema',
      content: '{"team": "B"}',
      lastKnownVersion: 0,
    }, {
      Authorization: `Bearer ${user2Token}`,
    });

    // User 1's pullAll should only return TeamAItem, not TeamBItem
    const pullAllResponse1 = await request('GET', '/items', undefined, {
      Authorization: `Bearer ${user1Token}`,
    });

    expect(pullAllResponse1.statusCode).toBe(200);
    const body1 = pullAllResponse1.json();
    expect(body1.items).toBeDefined();
    expect(body1.items.length).toBe(1);
    expect(body1.items[0].name).toBe('TeamAItem');
    expect(body1.items[0].content).toBe('{"team": "A"}');

    // User 2's pullAll should only return TeamBItem, not TeamAItem
    const pullAllResponse2 = await request('GET', '/items', undefined, {
      Authorization: `Bearer ${user2Token}`,
    });

    expect(pullAllResponse2.statusCode).toBe(200);
    const body2 = pullAllResponse2.json();
    expect(body2.items).toBeDefined();
    expect(body2.items.length).toBe(1);
    expect(body2.items[0].name).toBe('TeamBItem');
    expect(body2.items[0].content).toBe('{"team": "B"}');
  });

  it('push twice increments version', async () => {
    const accessToken = await getAccessToken(testEmailService);
    const teamName = `test-team-version-${Date.now()}`;
    await joinTeam(accessToken, teamName);

    const itemName = 'VersionedItem';
    const content1 = '{"version": 1}';
    const content2 = '{"version": 2}';

    // First push - should create with version 1
    const pushResponse1 = await request('PUT', `/items/${itemName}`, {
      kind: 'schema',
      content: content1,
      lastKnownVersion: 0,
    }, {
      Authorization: `Bearer ${accessToken}`,
    });

    expect(pushResponse1.statusCode).toBe(200);
    const body1 = pushResponse1.json();
    expect(body1.item.version).toBe(1);

    // Second push with lastKnownVersion=1 - should update to version 2
    const pushResponse2 = await request('PUT', `/items/${itemName}`, {
      kind: 'schema',
      content: content2,
      lastKnownVersion: 1,
    }, {
      Authorization: `Bearer ${accessToken}`,
    });

    expect(pushResponse2.statusCode).toBe(200);
    const body2 = pushResponse2.json();
    expect(body2.item.version).toBe(2);
    expect(body2.item.content).toBe(content2);
  });

  it('pull of unknown name returns 404', async () => {
    const accessToken = await getAccessToken(testEmailService);
    const teamName = `test-team-404-${Date.now()}`;
    await joinTeam(accessToken, teamName);

    // Try to pull a non-existent item
    const response = await request('GET', '/items/NonExistentItem', undefined, {
      Authorization: `Bearer ${accessToken}`,
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('ITEM_NOT_FOUND');
    expect(body.error.message).toBe('Item not found or user lacks access');
  });

  it('push without lastKnownVersion for existing item returns 409', async () => {
    const accessToken = await getAccessToken(testEmailService);
    const teamName = `test-team-conflict-${Date.now()}`;
    await joinTeam(accessToken, teamName);

    const itemName = 'ConflictItem';

    // First push
    await request('PUT', `/items/${itemName}`, {
      kind: 'schema',
      content: '{"v": 1}',
      lastKnownVersion: 0,
    }, {
      Authorization: `Bearer ${accessToken}`,
    });

    // Second push without lastKnownVersion - should conflict
    const response = await request('PUT', `/items/${itemName}`, {
      kind: 'schema',
      content: '{"v": 2}',
    }, {
      Authorization: `Bearer ${accessToken}`,
    });

    expect(response.statusCode).toBe(409);
    const body = response.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('CONFLICT');
  });

  it('push with stale lastKnownVersion returns 409', async () => {
    const accessToken = await getAccessToken(testEmailService);
    const teamName = `test-team-stale-${Date.now()}`;
    await joinTeam(accessToken, teamName);

    const itemName = 'StaleItem';

    // First push
    await request('PUT', `/items/${itemName}`, {
      kind: 'schema',
      content: '{"v": 1}',
      lastKnownVersion: 0,
    }, {
      Authorization: `Bearer ${accessToken}`,
    });

    // Second push with correct version
    await request('PUT', `/items/${itemName}`, {
      kind: 'schema',
      content: '{"v": 2}',
      lastKnownVersion: 1,
    }, {
      Authorization: `Bearer ${accessToken}`,
    });

    // Third push with stale version (still says 1, but server is at 2)
    const response = await request('PUT', `/items/${itemName}`, {
      kind: 'schema',
      content: '{"v": 3}',
      lastKnownVersion: 1,
    }, {
      Authorization: `Bearer ${accessToken}`,
    });

    expect(response.statusCode).toBe(409);
    const body = response.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('CONFLICT');
  });

  it('get items without authentication returns 401', async () => {
    const response = await request('GET', '/items');
    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('get item by name without authentication returns 401', async () => {
    const response = await request('GET', '/items/some-item');
    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('put item without authentication returns 401', async () => {
    const response = await request('PUT', '/items/some-item', {
      kind: 'schema',
      content: '{}',
    });
    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('put item with invalid kind returns 400', async () => {
    const accessToken = await getAccessToken(testEmailService);
    const teamName = `test-team-invalid-${Date.now()}`;
    await joinTeam(accessToken, teamName);

    const response = await request('PUT', '/items/TestItem', {
      kind: 'invalid',
      content: '{}',
      lastKnownVersion: 0,
    }, {
      Authorization: `Bearer ${accessToken}`,
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error.code).toBe('INVALID_KIND');
  });

  it('put item with missing kind returns 400', async () => {
    const accessToken = await getAccessToken(testEmailService);
    const teamName = `test-team-missing-${Date.now()}`;
    await joinTeam(accessToken, teamName);

    const response = await request('PUT', '/items/TestItem', {
      content: '{}',
    } as { kind?: string; content: string },
    {
      Authorization: `Bearer ${accessToken}`,
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error.code).toBe('INVALID_REQUEST');
  });

  it('put item with missing content returns 400', async () => {
    const accessToken = await getAccessToken(testEmailService);
    const teamName = `test-team-nocontent-${Date.now()}`;
    await joinTeam(accessToken, teamName);

    const response = await request('PUT', '/items/TestItem', {
      kind: 'schema',
    } as { kind: string; content?: string },
    {
      Authorization: `Bearer ${accessToken}`,
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error.code).toBe('INVALID_REQUEST');
  });
});
