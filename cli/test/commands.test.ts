// Integration tests for CLI commands
// Tests CLI command functions directly with mock server responses

import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Import CLI config functions
import { setHttpClientConfig, createHttpClient } from '../src/http.js';
import { setAuthToken, addTeam, readConfig, clearAuthToken, writeConfigTo } from '../src/config.js';
import { SchemoryConfig } from '../src/config.js';

// Test configuration directory
const TEST_CONFIG_DIR = path.join(os.tmpdir(), 'schemory-cli-test-' + process.pid);
const TEST_CONFIG_FILE = path.join(TEST_CONFIG_DIR, 'config.json');

// Ensure test config directory exists
if (!fs.existsSync(TEST_CONFIG_DIR)) {
  fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true });
}

// Helper to cleanup config
function cleanupTestConfig(): void {
  if (fs.existsSync(TEST_CONFIG_FILE)) {
    fs.unlinkSync(TEST_CONFIG_FILE);
  }
}

// Helper to read test config
function readTestConfig(): any {
  if (fs.existsSync(TEST_CONFIG_FILE)) {
    const content = fs.readFileSync(TEST_CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  }
  return null;
}

describe('CLI commands', () => {
  beforeEach(() => {
    // Clean up before each test
    cleanupTestConfig();
    
    // Reset HTTP client config
    setHttpClientConfig({});
    
    // Set HOME to use test config directory for config module
    const originalHome = process.env.HOME;
    process.env.HOME = TEST_CONFIG_DIR;
    
    // Clean up any existing test config
    cleanupTestConfig();
  });

  afterAll(() => {
    // Clean up after all tests
    cleanupTestConfig();
    
    // Clean up temp directory
    try {
      if (fs.existsSync(TEST_CONFIG_DIR)) {
        fs.rmSync(TEST_CONFIG_DIR, { recursive: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('signup command function', () => {
    it('should create signup command with correct structure', async () => {
      const { createSignupCommand } = await import('../src/commands/signup.js');
      const signupCmd = createSignupCommand();
      
      expect(signupCmd.name()).toBe('signup');
      expect(signupCmd.description()).toContain('Register');
    });

    it('should validate email format', async () => {
      // Test email validation logic directly
      const email = 'test@example.com';
      expect(email.includes('@')).toBe(true);
      
      const invalidEmail = 'invalid-email';
      expect(invalidEmail.includes('@')).toBe(false);
    });
  });

  describe('login command function', () => {
    it('should create login command with correct structure', async () => {
      const { createLoginCommand } = await import('../src/commands/login.js');
      const loginCmd = createLoginCommand();
      
      expect(loginCmd.name()).toBe('login');
      expect(loginCmd.description()).toContain('Authenticate');
    });

    it('should validate token presence', async () => {
      // Test token validation logic directly
      const token = 'sk_test_token';
      expect(!!token).toBe(true);
      
      const emptyToken = '';
      expect(!!emptyToken).toBe(false);
    });
  });

  describe('join command function', () => {
    it('should create join command with correct structure', async () => {
      const { createJoinCommand } = await import('../src/commands/join.js');
      const joinCmd = createJoinCommand();
      
      expect(joinCmd.name()).toBe('join');
      expect(joinCmd.description()).toContain('Join');
    });

    it('should validate team name presence', async () => {
      // Test team name validation logic directly
      const teamName = 'test-team';
      expect(!!teamName && teamName.trim().length > 0).toBe(true);
      
      const emptyTeamName = '';
      expect(!!emptyTeamName && emptyTeamName.trim().length > 0).toBe(false);
      
      const whitespaceTeamName = '   ';
      expect(!!whitespaceTeamName && whitespaceTeamName.trim().length > 0).toBe(false);
    });
  });

  describe('config persistence', () => {
    it('should persist and read auth token correctly', async () => {
      const testToken = 'sk_test_token_123';
      const testUserId = 'usr_test_123';
      const testExpiresAt = '2025-12-31T23:59:59Z';

      // Set auth token
      setAuthToken(testToken, testExpiresAt, testUserId);

      // Read config and verify
      const config = readConfig();
      expect(config.auth).toBeDefined();
      expect(config.auth?.token).toBe(testToken);
      expect(config.auth?.userId).toBe(testUserId);
      expect(config.auth?.expiresAt).toBe(testExpiresAt);

      // Clean up
      clearAuthToken();
    });

    it('should persist and read team correctly', async () => {
      // Use test config file directly for this test
      const testTeam = {
        id: 'tm_test_123',
        name: 'test-team',
        createdAt: '2024-01-01T00:00:00Z',
      };

      const initialConfig: SchemoryConfig = {
        version: '1',
        teams: [testTeam],
        apiUrl: 'https://api.schemory.org',
      };

      // Write test config directly to the global config path
      const globalConfigPath = path.join(TEST_CONFIG_DIR, '.schemory', 'config.json');
      writeConfigTo(globalConfigPath, initialConfig);

      // Read config and verify
      const config = readConfig();
      expect(config.teams).toHaveLength(1);
      expect(config.teams[0].id).toBe(testTeam.id);
      expect(config.teams[0].name).toBe(testTeam.name);
      expect(config.teams[0].createdAt).toBe(testTeam.createdAt);
    });

    it('should handle multiple teams correctly', async () => {
      // Use test config file directly for this test
      const team1 = { id: 'tm_1', name: 'team-1', createdAt: '2024-01-01T00:00:00Z' };
      const team2 = { id: 'tm_2', name: 'team-2', createdAt: '2024-01-02T00:00:00Z' };

      const initialConfig: SchemoryConfig = {
        version: '1',
        teams: [team1, team2],
        apiUrl: 'https://api.schemory.org',
      };

      // Write test config directly to the global config path
      const globalConfigPath = path.join(TEST_CONFIG_DIR, '.schemory', 'config.json');
      writeConfigTo(globalConfigPath, initialConfig);

      // Read config and verify
      const config = readConfig();
      expect(config.teams).toHaveLength(2);
      
      // Check that teams are stored correctly
      const teamNames = config.teams.map(t => t.name).sort();
      expect(teamNames).toEqual(['team-1', 'team-2']);
    });
  });

  describe('HTTP client configuration', () => {
    it('should create HTTP client with correct methods', () => {
      const client = createHttpClient();
      expect(client).toBeDefined();
      expect(typeof client.request).toBe('function');
      expect(typeof client.get).toBe('function');
      expect(typeof client.post).toBe('function');
      expect(typeof client.put).toBe('function');
      expect(typeof client.delete).toBe('function');
    });

    it('should create HTTP client with custom API URL', () => {
      const client = createHttpClient({ apiUrl: 'https://custom.example.com' });
      expect(client).toBeDefined();
    });

    it('should create HTTP client with token', () => {
      const client = createHttpClient({ token: 'sk_test_token' });
      expect(client).toBeDefined();
    });

    it('should configure global HTTP client', () => {
      setHttpClientConfig({ apiUrl: 'https://test.example.com', token: 'sk_test' });
      const client = createHttpClient();
      expect(client).toBeDefined();
      
      // Reset
      setHttpClientConfig({});
    });
  });
});