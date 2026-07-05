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
});
