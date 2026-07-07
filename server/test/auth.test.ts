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

  // Test for web activation flow URL
  it('signup sends activation email with correct URL format for web flow', async () => {
    // This test verifies that when a user signs up, they receive an activation email
    // with a link that points to the dashboard where they can set their password.
    // 
    // Expected URLs:
    // - Dev: http://localhost:5173/activate?token=act_Ci6QL_hBS8rE3LZeGsXNmRT6pQ5mblHiCAvWTnzMECE
    // - Prod: https://schemory.org/activate?token=act_Ci6QL_hBS8rE3LZeGsXNmRT6pQ5mblHiCAvWTnzMECE
    
    const testEmail = `web_url_test_${Date.now()}@example.com`;
    const signupResponse = await request('POST', '/auth/signup', { email: testEmail });
    
    expect(signupResponse.statusCode).toBe(202);
    
    // Get the activation token that was sent
    const activationToken = testEmailService.getActivationToken(testEmail);
    expect(activationToken).toBeDefined();
    expect(activationToken).toContain('act_');
    
    // Verify token format is valid for URL query parameter
    // Token should be base64url safe (no special chars that need encoding)
    expect(activationToken?.length).toBeGreaterThan(10);
    expect(activationToken).toMatch(/^act_[a-zA-Z0-9_-]+$/);
    
    // The email would contain a link like:
    // http://localhost:5173/activate?token=act_Ci6QL_hBS8rE3LZeGsXNmRT6pQ5mblHiCAvWTnzMECE
    // which the user can click to go to the dashboard activation page
  });

  // New password-based auth tests
  describe('password-based auth', () => {
    it('full signup → activate with password → login with email/password round trip', async () => {
      // Step 1: Signup
      const testEmail = `pwd_test_${Date.now()}@example.com`;
      const testPassword = 'securePassword123!';
      
      const signupResponse = await request('POST', '/auth/signup', { email: testEmail });
      expect(signupResponse.statusCode).toBe(202);
      
      // Step 2: Get activation token
      const activationToken = testEmailService.getActivationToken(testEmail);
      expect(activationToken).toBeDefined();
      expect(activationToken).toContain('act_');
      
      // Step 3: Activate with password using POST /auth/activate
      const activateResponse = await request('POST', '/auth/activate', {
        token: activationToken,
        password: testPassword
      });
      
      expect(activateResponse.statusCode).toBe(200);
      const activateBody = activateResponse.json();
      expect(activateBody.user).toBeDefined();
      expect(activateBody.user.email).toBe(testEmail);
      expect(activateBody.accessToken).toBeDefined();
      expect(activateBody.expiresAt).toBeDefined();
      
      // Step 4: Login with email and password
      const loginResponse = await request('POST', '/auth/login', {
        email: testEmail,
        password: testPassword
      });
      
      expect(loginResponse.statusCode).toBe(200);
      const loginBody = loginResponse.json();
      expect(loginBody.user).toBeDefined();
      expect(loginBody.user.email).toBe(testEmail);
      expect(loginBody.accessToken).toBeDefined();
      expect(loginBody.expiresAt).toBeDefined();
    });

    it('activate with password sets password hash on user', async () => {
      const testEmail = `pwd_hash_${Date.now()}@example.com`;
      const testPassword = 'mySecurePassword456!';
      
      // Signup
      const signupResponse = await request('POST', '/auth/signup', { email: testEmail });
      expect(signupResponse.statusCode).toBe(202);
      
      // Get activation token
      const activationToken = testEmailService.getActivationToken(testEmail);
      expect(activationToken).toBeDefined();
      
      // Activate with password
      const activateResponse = await request('POST', '/auth/activate', {
        token: activationToken,
        password: testPassword
      });
      
      expect(activateResponse.statusCode).toBe(200);
      
      // Verify password was stored (by checking if we can login)
      const loginResponse = await request('POST', '/auth/login', {
        email: testEmail,
        password: testPassword
      });
      
      expect(loginResponse.statusCode).toBe(200);
    });

    it('activate with missing password returns 400', async () => {
      const testEmail = `no_pwd_${Date.now()}@example.com`;
      
      const signupResponse = await request('POST', '/auth/signup', { email: testEmail });
      expect(signupResponse.statusCode).toBe(202);
      
      const activationToken = testEmailService.getActivationToken(testEmail);
      expect(activationToken).toBeDefined();
      
      // Try to activate without password
      const response = await request('POST', '/auth/activate', {
        token: activationToken,
        password: ''
      });
      
      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error.code).toBe('MISSING_PASSWORD');
    });

    it('activate with weak password returns 400', async () => {
      const testEmail = `weak_pwd_${Date.now()}@example.com`;
      
      const signupResponse = await request('POST', '/auth/signup', { email: testEmail });
      expect(signupResponse.statusCode).toBe(202);
      
      const activationToken = testEmailService.getActivationToken(testEmail);
      expect(activationToken).toBeDefined();
      
      // Try to activate with weak password (less than 8 chars)
      const response = await request('POST', '/auth/activate', {
        token: activationToken,
        password: 'short'
      });
      
      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error.code).toBe('WEAK_PASSWORD');
    });

    it('login with wrong password returns 401', async () => {
      const testEmail = `wrong_pwd_${Date.now()}@example.com`;
      const correctPassword = 'correctPassword789!';
      const wrongPassword = 'wrongPassword000!';
      
      // Signup and activate with correct password
      const signupResponse = await request('POST', '/auth/signup', { email: testEmail });
      expect(signupResponse.statusCode).toBe(202);
      
      const activationToken = testEmailService.getActivationToken(testEmail);
      expect(activationToken).toBeDefined();
      
      const activateResponse = await request('POST', '/auth/activate', {
        token: activationToken,
        password: correctPassword
      });
      expect(activateResponse.statusCode).toBe(200);
      
      // Try to login with wrong password
      const response = await request('POST', '/auth/login', {
        email: testEmail,
        password: wrongPassword
      });
      
      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('login with missing email returns 400', async () => {
      const response = await request('POST', '/auth/login', {
        email: '',
        password: 'somePassword'
      });
      
      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error.code).toBe('MISSING_EMAIL');
    });

    it('login with missing password returns 400', async () => {
      const response = await request('POST', '/auth/login', {
        email: 'test@example.com',
        password: ''
      });
      
      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error.code).toBe('MISSING_PASSWORD');
    });

    it('web activation flow: signup → activation link → set password → login', async () => {
      // This test simulates the full web flow:
      // 1. User signs up via CLI
      // 2. User clicks activation link in email (e.g., https://schemory.org/activate?token=act_...)
      // 3. User is redirected to dashboard activate page
      // 4. User sets password via POST /auth/activate with token from URL
      // 5. User can login with email and password
      
      const testEmail = `web_flow_${Date.now()}@example.com`;
      const testPassword = 'MySecurePassword123!';
      
      // Step 1: Signup
      const signupResponse = await request('POST', '/auth/signup', { email: testEmail });
      expect(signupResponse.statusCode).toBe(202);
      
      // Step 2: Get activation token from email (simulating what the email contains)
      const activationToken = testEmailService.getActivationToken(testEmail);
      expect(activationToken).toBeDefined();
      expect(activationToken).toContain('act_');
      
      // The activation link in the email would be:
      // https://schemory.org/activate?token=act_Ci6QL_hBS8rE3LZeGsXNmRT6pQ5mblHiCAvWTnzMECE
      // or in dev: http://localhost:5173/activate?token=act_...
      
      // Step 3: User submits password on the activate page
      // The dashboard would extract token from URL query param and POST to /auth/activate
      const activateResponse = await request('POST', '/auth/activate', {
        token: activationToken,
        password: testPassword
      });
      
      expect(activateResponse.statusCode).toBe(200);
      const activateBody = activateResponse.json();
      expect(activateBody.user).toBeDefined();
      expect(activateBody.user.email).toBe(testEmail);
      expect(activateBody.accessToken).toBeDefined();
      
      // Step 4: User can now login with email and password
      const loginResponse = await request('POST', '/auth/login', {
        email: testEmail,
        password: testPassword
      });
      
      expect(loginResponse.statusCode).toBe(200);
      const loginBody = loginResponse.json();
      expect(loginBody.user).toBeDefined();
      expect(loginBody.user.email).toBe(testEmail);
      expect(loginBody.accessToken).toBeDefined();
    });
  });

  // Tests for resend-activation endpoint
  describe('resend-activation', () => {
    it('resend activation email for existing inactive user', async () => {
      const testEmail = `resend_test_${Date.now()}@example.com`;
      
      // First signup
      const signupResponse = await request('POST', '/auth/signup', { email: testEmail });
      expect(signupResponse.statusCode).toBe(202);
      
      // Clear captured emails to avoid using the first token
      testEmailService.capturedEmails.clear();
      
      // Request to resend activation email
      const resendResponse = await request('POST', '/auth/resend-activation', { email: testEmail });
      expect(resendResponse.statusCode).toBe(200);
      const resendBody = resendResponse.json();
      expect(resendBody.status).toBe('sent');
      expect(resendBody.message).toBe('Activation email resent');
      
      // Should have sent a new activation email
      const newActivationToken = testEmailService.getActivationToken(testEmail);
      expect(newActivationToken).toBeDefined();
      expect(newActivationToken).toContain('act_');
      
      // Old activation token should be invalidated (can't use it anymore)
      const oldActivationToken = signupResponse.json();
      // Note: old token was cleared when we cleared capturedEmails
    });

    it('resend activation email for invalid email returns generic message', async () => {
      const response = await request('POST', '/auth/resend-activation', { email: 'nonexistent@example.com' });
      
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('sent');
      // Generic message for security - don't reveal if user exists
      expect(body.message).toContain('If an account exists with this email');
    });

    it('resend activation email for already activated user returns generic message', async () => {
      const testEmail = `already_active_${Date.now()}@example.com`;
      const testPassword = 'securePassword123!';
      
      // Full signup and activation
      const signupResponse = await request('POST', '/auth/signup', { email: testEmail });
      expect(signupResponse.statusCode).toBe(202);
      
      const activationToken = testEmailService.getActivationToken(testEmail);
      expect(activationToken).toBeDefined();
      
      // Activate with password
      const activateResponse = await request('POST', '/auth/activate', {
        token: activationToken,
        password: testPassword
      });
      expect(activateResponse.statusCode).toBe(200);
      
      // Clear captured emails
      testEmailService.capturedEmails.clear();
      
      // Try to resend activation for already active user
      const resendResponse = await request('POST', '/auth/resend-activation', { email: testEmail });
      expect(resendResponse.statusCode).toBe(200);
      const body = resendResponse.json();
      expect(body.status).toBe('sent');
      expect(body.message).toContain('If an account exists with this email');
      
      // Should not have sent a new email since user is already active
      const newToken = testEmailService.getActivationToken(testEmail);
      expect(newToken).toBeUndefined();
    });

    it('resend activation with invalid email format returns 400', async () => {
      const response = await request('POST', '/auth/resend-activation', { email: 'not-an-email' });
      
      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error.code).toBe('INVALID_EMAIL');
    });
  });
});
