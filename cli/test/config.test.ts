// Unit tests for config module
// Tests: write then read round-trips correctly

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { SchemoryConfig, writeConfigTo } from '../src/config.js';

// Use a fixed temp directory for all tests
const testDir = path.join(os.tmpdir(), 'schemory-cli-config-test');

// Ensure test directory exists
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true, mode: 0o700 });
}

describe('config module', () => {
  describe('write then read round-trips correctly', () => {
    it('round-trips basic config', () => {
      const config: SchemoryConfig = {
        version: '1',
        teams: [],
        apiUrl: 'https://api.schemory.org',
      };

      const configPath = path.join(testDir, 'basic.json');
      writeConfigTo(configPath, config);

      const content = fs.readFileSync(configPath, 'utf-8');
      const readConfig: SchemoryConfig = JSON.parse(content);

      expect(readConfig.version).toBe('1');
      expect(readConfig.teams).toEqual([]);
      expect(readConfig.apiUrl).toBe('https://api.schemory.org');
    });

    it('round-trips config with auth', () => {
      const config: SchemoryConfig = {
        version: '1',
        auth: {
          token: 'sk_test_12345',
          expiresAt: '2025-01-01T00:00:00Z',
          userId: 'usr_123',
        },
        teams: [],
      };

      const configPath = path.join(testDir, 'auth.json');
      writeConfigTo(configPath, config);

      const content = fs.readFileSync(configPath, 'utf-8');
      const readConfig: SchemoryConfig = JSON.parse(content);

      expect(readConfig.auth).toBeDefined();
      expect(readConfig.auth!.token).toBe('sk_test_12345');
      expect(readConfig.auth!.expiresAt).toBe('2025-01-01T00:00:00Z');
      expect(readConfig.auth!.userId).toBe('usr_123');
    });

    it('round-trips config with auth including email', () => {
      const config: SchemoryConfig = {
        version: '1',
        auth: {
          token: 'sk_test_12345',
          expiresAt: '2025-01-01T00:00:00Z',
          userId: 'usr_123',
          email: 'user@example.com',
        },
        teams: [],
      };

      const configPath = path.join(testDir, 'auth-email.json');
      writeConfigTo(configPath, config);

      const content = fs.readFileSync(configPath, 'utf-8');
      const readConfig: SchemoryConfig = JSON.parse(content);

      expect(readConfig.auth).toBeDefined();
      expect(readConfig.auth!.token).toBe('sk_test_12345');
      expect(readConfig.auth!.email).toBe('user@example.com');
    });

    it('round-trips config with teams', () => {
      const config: SchemoryConfig = {
        version: '1',
        teams: [
          { id: 'tm_1', name: 'team-a', createdAt: '2024-01-01T00:00:00Z' },
          { id: 'tm_2', name: 'team-b', createdAt: '2024-01-02T00:00:00Z' },
        ],
      };

      const configPath = path.join(testDir, 'teams.json');
      writeConfigTo(configPath, config);

      const content = fs.readFileSync(configPath, 'utf-8');
      const readConfig: SchemoryConfig = JSON.parse(content);

      expect(readConfig.teams).toHaveLength(2);
      expect(readConfig.teams[0].name).toBe('team-a');
      expect(readConfig.teams[1].name).toBe('team-b');
    });

    it('round-trips config with all fields', () => {
      const config: SchemoryConfig = {
        version: '1',
        auth: {
          token: 'sk_test_abc',
          expiresAt: '2025-12-31T23:59:59Z',
          userId: 'usr_xyz',
        },
        teams: [
          { id: 'tm_1', name: 'my-team', createdAt: '2024-01-01T00:00:00Z' },
        ],
        defaultTeam: 'my-team',
        lastSyncAt: '2024-07-01T12:00:00Z',
        apiUrl: 'https://custom.schemory.org',
      };

      const configPath = path.join(testDir, 'full.json');
      writeConfigTo(configPath, config);

      const content = fs.readFileSync(configPath, 'utf-8');
      const readConfig: SchemoryConfig = JSON.parse(content);

      expect(readConfig.version).toBe('1');
      expect(readConfig.auth!.token).toBe('sk_test_abc');
      expect(readConfig.teams).toHaveLength(1);
      expect(readConfig.teams[0].name).toBe('my-team');
      expect(readConfig.defaultTeam).toBe('my-team');
      expect(readConfig.lastSyncAt).toBe('2024-07-01T12:00:00Z');
      expect(readConfig.apiUrl).toBe('https://custom.schemory.org');
    });
  });

  describe('auto-set default team functionality', () => {
    it('should auto-set single team as default when no default exists', async () => {
      // Import the function we want to test
      const { autoSetDefaultTeamIfSingleTeam, writeConfigTo } = await import('../src/config.js');
      const { readConfig } = await import('../src/config.js');
      
      // Set up a config with one team but no default team
      const configWithOneTeam: SchemoryConfig = {
        version: '1',
        auth: {
          token: 'sk_test_token',
          expiresAt: '2025-12-31T23:59:59Z',
          userId: 'usr_test',
        },
        teams: [
          { id: 'tm_1', name: 'single-team', createdAt: '2024-01-01T00:00:00Z' },
        ],
        // No defaultTeam set
        apiUrl: 'https://api.schemory.org',
      };

      // Create the .schemory directory and write config there
      const schemoryDir = path.join(testDir, '.schemory');
      if (!fs.existsSync(schemoryDir)) {
        fs.mkdirSync(schemoryDir, { recursive: true });
      }
      const configPath = path.join(schemoryDir, 'config.json');
      writeConfigTo(configPath, configWithOneTeam);

      // Set HOME to use our test directory
      const originalHome = process.env.HOME;
      process.env.HOME = testDir;

      try {
        // Call the auto-set function
        autoSetDefaultTeamIfSingleTeam();

        // Read the updated config
        const updatedConfig = readConfig();
        
        // Should have auto-set the single team as default
        expect(updatedConfig.defaultTeam).toBe('single-team');
      } finally {
        // Restore original HOME
        process.env.HOME = originalHome;
        
        // Clean up the config file
        if (fs.existsSync(configPath)) {
          fs.unlinkSync(configPath);
        }
      }
    });

    it('should not change default team if already set', async () => {
      // Import the function we want to test
      const { autoSetDefaultTeamIfSingleTeam, writeConfigTo } = await import('../src/config.js');
      const { readConfig } = await import('../src/config.js');
      
      // Set up a config with one team and a default team already set
      const configWithExistingDefault: SchemoryConfig = {
        version: '1',
        auth: {
          token: 'sk_test_token',
          expiresAt: '2025-12-31T23:59:59Z',
          userId: 'usr_test',
        },
        teams: [
          { id: 'tm_1', name: 'existing-team', createdAt: '2024-01-01T00:00:00Z' },
        ],
        defaultTeam: 'existing-team',
        apiUrl: 'https://api.schemory.org',
      };

      // Create the .schemory directory and write config there
      const schemoryDir = path.join(testDir, '.schemory');
      if (!fs.existsSync(schemoryDir)) {
        fs.mkdirSync(schemoryDir, { recursive: true });
      }
      const configPath = path.join(schemoryDir, 'config.json');
      writeConfigTo(configPath, configWithExistingDefault);

      // Set HOME to use our test directory
      const originalHome = process.env.HOME;
      process.env.HOME = testDir;

      try {
        // Call the auto-set function
        autoSetDefaultTeamIfSingleTeam();

        // Read the updated config
        const updatedConfig = readConfig();
        
        // Should keep the existing default team
        expect(updatedConfig.defaultTeam).toBe('existing-team');
      } finally {
        // Restore original HOME
        process.env.HOME = originalHome;
        
        // Clean up the config file
        if (fs.existsSync(configPath)) {
          fs.unlinkSync(configPath);
        }
      }
    });

    it('should not set default team when multiple teams exist', async () => {
      // Import the function we want to test
      const { autoSetDefaultTeamIfSingleTeam, writeConfigTo } = await import('../src/config.js');
      const { readConfig } = await import('../src/config.js');
      
      // Set up a config with multiple teams and no default
      const configWithMultipleTeams: SchemoryConfig = {
        version: '1',
        auth: {
          token: 'sk_test_token',
          expiresAt: '2025-12-31T23:59:59Z',
          userId: 'usr_test',
        },
        teams: [
          { id: 'tm_1', name: 'team-a', createdAt: '2024-01-01T00:00:00Z' },
          { id: 'tm_2', name: 'team-b', createdAt: '2024-01-02T00:00:00Z' },
        ],
        // No defaultTeam set
        apiUrl: 'https://api.schemory.org',
      };

      // Create the .schemory directory and write config there
      const schemoryDir = path.join(testDir, '.schemory');
      if (!fs.existsSync(schemoryDir)) {
        fs.mkdirSync(schemoryDir, { recursive: true });
      }
      const configPath = path.join(schemoryDir, 'config.json');
      writeConfigTo(configPath, configWithMultipleTeams);

      // Set HOME to use our test directory
      const originalHome = process.env.HOME;
      process.env.HOME = testDir;

      try {
        // Call the auto-set function
        autoSetDefaultTeamIfSingleTeam();

        // Read the updated config
        const updatedConfig = readConfig();
        
        // Should not have set a default team (multiple teams exist)
        expect(updatedConfig.defaultTeam).toBeUndefined();
      } finally {
        // Restore original HOME
        process.env.HOME = originalHome;
        
        // Clean up the config file
        if (fs.existsSync(configPath)) {
          fs.unlinkSync(configPath);
        }
      }
    });

    it('should not set default team when no teams exist', async () => {
      // Import the function we want to test
      const { autoSetDefaultTeamIfSingleTeam, writeConfigTo } = await import('../src/config.js');
      const { readConfig } = await import('../src/config.js');
      
      // Set up a config with no teams and no default
      const configWithNoTeams: SchemoryConfig = {
        version: '1',
        auth: {
          token: 'sk_test_token',
          expiresAt: '2025-12-31T23:59:59Z',
          userId: 'usr_test',
        },
        teams: [],
        // No defaultTeam set
        apiUrl: 'https://api.schemory.org',
      };

      // Create the .schemory directory and write config there
      const schemoryDir = path.join(testDir, '.schemory');
      if (!fs.existsSync(schemoryDir)) {
        fs.mkdirSync(schemoryDir, { recursive: true });
      }
      const configPath = path.join(schemoryDir, 'config.json');
      writeConfigTo(configPath, configWithNoTeams);

      // Set HOME to use our test directory
      const originalHome = process.env.HOME;
      process.env.HOME = testDir;

      try {
        // Call the auto-set function
        autoSetDefaultTeamIfSingleTeam();

        // Read the updated config
        const updatedConfig = readConfig();
        
        // Should not have set a default team (no teams exist)
        expect(updatedConfig.defaultTeam).toBeUndefined();
      } finally {
        // Restore original HOME
        process.env.HOME = originalHome;
        
        // Clean up the config file
        if (fs.existsSync(configPath)) {
          fs.unlinkSync(configPath);
        }
      }
    });
  });
});
