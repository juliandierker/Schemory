// Auth routes integration test
// Full round trip: signup -> read activation token from captured email -> activate -> login -> assert session token

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
async function request(method: string, path: string, body?: object) {
  const response = await server.inject({
    method,
    url: path,
    payload: body,
    headers: { 'Content-Type': 'application/json' },
  });
  return response;
}

describe('auth routes', () => {
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
    
    // Clear users and tokens from previous tests
    await dbClient.query('DELETE FROM auth_tokens');
    await dbClient.query('DELETE FROM activation_tokens');
    await dbClient.query('DELETE FROM users');
  });

  it('full signup → activate → login round trip', async () => {
    // Step 1: Signup
    const testEmail = `test_${Date.now()}@example.com`;
    const signupResponse = await request('POST', '/auth/signup', { email: testEmail });
    
    expect(signupResponse.statusCode).toBe(202);
    const signupBody = signupResponse.json();
    expect(signupBody.status).toBe('pending');
    expect(signupBody.message).toBe('Activation email sent');

    // Step 2: Get activation token from captured email
    const activationToken = testEmailService.getActivationToken(testEmail);
    expect(activationToken).toBeDefined();
    expect(activationToken).toContain('act_');

    // Step 3: Activate using the token
    const activateResponse = await request('GET', `/auth/activate/${activationToken}`);
    
    expect(activateResponse.statusCode).toBe(200);
    const activateBody = activateResponse.json();
    
    // Should return user info and access token
    expect(activateBody.user).toBeDefined();
    expect(activateBody.user.email).toBe(testEmail);
    expect(activateBody.user.isActive).toBe(true);
    expect(activateBody.accessToken).toBeDefined();
    expect(activateBody.accessToken).toContain('sk_');
    expect(activateBody.expiresAt).toBeDefined();

    const accessToken = activateBody.accessToken;

    // Step 4: Login with access token
    const loginResponse = await request('POST', '/auth/login', { token: accessToken });
    
    expect(loginResponse.statusCode).toBe(200);
    const loginBody = loginResponse.json();
    
    // Should return user info
    expect(loginBody.user).toBeDefined();
    expect(loginBody.user.email).toBe(testEmail);
    expect(loginBody.user.isActive).toBe(true);
    expect(loginBody.teams).toBeDefined();
    expect(Array.isArray(loginBody.teams)).toBe(true);
  });

  it('signup with invalid email returns 400', async () => {
    const response = await request('POST', '/auth/signup', { email: 'not-an-email' });
    
    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error.code).toBe('INVALID_EMAIL');
  });

  it('signup with duplicate email returns 409', async () => {
    const testEmail = `duplicate_${Date.now()}@example.com`;
    
    // First signup
    const firstResponse = await request('POST', '/auth/signup', { email: testEmail });
    expect(firstResponse.statusCode).toBe(202);
    
    // Second signup with same email
    const secondResponse = await request('POST', '/auth/signup', { email: testEmail });
    expect(secondResponse.statusCode).toBe(409);
    const body = secondResponse.json();
    expect(body.error.code).toBe('EMAIL_EXISTS');
  });

  it('activate with invalid token returns 404', async () => {
    const response = await request('GET', '/auth/activate/invalid_token_xyz');
    
    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error.code).toBe('INVALID_TOKEN');
  });

  it('login with invalid token returns 401', async () => {
    const response = await request('POST', '/auth/login', { token: 'invalid_token_xyz' });
    
    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error.code).toBe('INVALID_TOKEN');
  });

  it('login with missing token returns 400', async () => {
    const response = await request('POST', '/auth/login', {});
    
    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error.code).toBe('MISSING_TOKEN');
  });
});
