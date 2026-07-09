// Config module for Schemory CLI
// Reads and writes the on-disk config file from ARCHITECTURE.md design

import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Team type for the config
 */
export interface Team {
  id: string;
  name: string;
  createdAt: string;
}

/**
 * Auth configuration
 */
export interface AuthConfig {
  token: string;
  expiresAt: string;
  userId: string;
  email?: string;
}

/**
 * Main config schema from ARCHITECTURE.md
 */
export interface SchemoryConfig {
  version: string; // Config schema version (e.g., "1")
  auth?: AuthConfig;
  teams: Team[];
  defaultTeam?: string; // Default team for push/pull when ambiguous
  lastSyncAt?: string; // ISO 8601, last successful sync
  apiUrl?: string; // Custom API URL (default: https://api.schemory.org)
}

// Current config version
const CONFIG_VERSION = '1';

// Default API URL from ARCHITECTURE.md
const DEFAULT_API_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000'
  : 'https://api.schemory.org';

/**
 * Get the global config file path (~/.schemory/config.json)
 * Respects HOME environment variable for testing
 */
function getGlobalConfigPath(): string {
  const homeDir = process.env.HOME || os.homedir();
  return path.join(homeDir, '.schemory', 'config.json');
}

/**
 * Get the project config file path (.schemory/config.json)
 */
function getProjectConfigPath(): string {
  return path.join(process.cwd(), '.schemory', 'config.json');
}

/**
 * Ensure the directory for a config file exists
 */
function ensureConfigDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

/**
 * Default config
 */
function getDefaultConfig(): SchemoryConfig {
  return {
    version: CONFIG_VERSION,
    teams: [],
    apiUrl: DEFAULT_API_URL,
  };
}

/**
 * Read a config file
 */
function readConfigFile(filePath: string): SchemoryConfig | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const config: SchemoryConfig = JSON.parse(content);

    // Ensure version is set
    if (!config.version) {
      config.version = CONFIG_VERSION;
    }

    // Ensure teams is an array
    if (!config.teams) {
      config.teams = [];
    }

    // Set default API URL if not present or if it's localhost (migrate old dev configs)
    if (!config.apiUrl || config.apiUrl === 'http://localhost:3000') {
      config.apiUrl = DEFAULT_API_URL;
    }

    return config;
  } catch {
    return null;
  }
}

/**
 * Write a config file
 */
function writeConfigFile(filePath: string, config: SchemoryConfig): void {
  ensureConfigDir(filePath);

  // Set permissions to 0600 (owner read/write only) for security
  // Note: process.umask() is not supported in Vitest workers, so we skip it in test environment
  let currentUmask: number | undefined;
  let umaskSupported = true;
  
  try {
    currentUmask = process.umask(0o077);
  } catch {
    umaskSupported = false;
  }
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
    // Only chmod if we successfully set umask (not in worker threads)
    if (umaskSupported) {
      fs.chmodSync(filePath, 0o600);
    }
  } finally {
    if (umaskSupported && currentUmask !== undefined) {
      process.umask(currentUmask);
    }
  }
}

/**
 * Merge configs with precedence: passed config > project config > global config > defaults
 */
function mergeConfigs(...configs: (SchemoryConfig | null)[]): SchemoryConfig {
  const result: SchemoryConfig = getDefaultConfig();

  for (const config of configs) {
    if (!config) continue;

    if (config.version !== undefined) {
      result.version = config.version;
    }
    if (config.auth !== undefined) {
      result.auth = config.auth;
    }
    if (config.teams !== undefined) {
      result.teams = config.teams;
    }
    if (config.defaultTeam !== undefined) {
      result.defaultTeam = config.defaultTeam;
    }
    if (config.lastSyncAt !== undefined) {
      result.lastSyncAt = config.lastSyncAt;
    }
    if (config.apiUrl !== undefined) {
      result.apiUrl = config.apiUrl;
    }
  }

  return result;
}

/**
 * Read the current config (merged from global, project, and env)
 * Env vars: SCHEMORY_API_URL
 */
export function readConfig(): SchemoryConfig {
  // Read global config
  const globalConfig = readConfigFile(getGlobalConfigPath());

  // Read project config
  const projectConfig = readConfigFile(getProjectConfigPath());

  // Start with merged file configs
  let config = mergeConfigs(globalConfig, projectConfig);

  // Apply environment variables
  if (process.env.SCHEMORY_API_URL) {
    config.apiUrl = process.env.SCHEMORY_API_URL;
  }

  return config;
}

/**
 * Write the config to the appropriate location
 * Writes to project config if in a project with .schemory directory,
 * otherwise writes to global config
 */
export function writeConfig(config: SchemoryConfig): void {
  // Determine which config file to write to
  const projectPath = getProjectConfigPath();
  const projectDir = path.dirname(projectPath);

  // Write to project config if the directory exists (or we're in a schemory project)
  // Otherwise write to global config
  if (fs.existsSync(projectDir) || fs.existsSync(path.join(process.cwd(), '.schemory'))) {
    writeConfigFile(projectPath, config);
  } else {
    writeConfigFile(getGlobalConfigPath(), config);
  }
}

/**
 * Write config to a specific location
 */
export function writeConfigTo(filePath: string, config: SchemoryConfig): void {
  writeConfigFile(filePath, config);
}

/**
 * Get the config file path being used
 */
export function getConfigPath(): string {
  const projectPath = getProjectConfigPath();
  if (fs.existsSync(projectPath)) {
    return projectPath;
  }
  return getGlobalConfigPath();
}

/**
 * Add a team to the config
 */
export function addTeam(team: Team): void {
  const config = readConfig();
  
  // Check if team already exists
  const existingIndex = config.teams.findIndex(t => t.id === team.id || t.name === team.name);
  if (existingIndex !== -1) {
    // Update existing team
    config.teams[existingIndex] = team;
  } else {
    // Add new team
    config.teams.push(team);
  }

  writeConfig(config);
}

/**
 * Set the auth token
 */
export function setAuthToken(token: string, expiresAt: string, userId: string, email?: string): void {
  const config = readConfig();
  config.auth = {
    token,
    expiresAt,
    userId,
    ...(email && { email }),
  };
  writeConfig(config);
}

/**
 * Clear the auth token
 */
export function clearAuthToken(): void {
  const config = readConfig();
  delete config.auth;
  writeConfig(config);
}

/**
 * Set the default team
 */
export function setDefaultTeam(teamName: string): void {
  const config = readConfig();
  config.defaultTeam = teamName;
  writeConfig(config);
}

/**
 * Automatically set default team if user has exactly one team and no default set
 * This provides quality of life improvement - when you have only 1 team, it becomes your active team
 */
export function autoSetDefaultTeamIfSingleTeam(): void {
  const config = readConfig();
  const teams = config.teams || [];
  const hasDefaultTeam = config.defaultTeam;
  
  // If user has exactly one team and no default team set, auto-select it
  if (teams.length === 1 && !hasDefaultTeam) {
    setDefaultTeam(teams[0].name);
  }
}

/**
 * Set the API URL
 */
export function setApiUrl(apiUrl: string): void {
  const config = readConfig();
  config.apiUrl = apiUrl;
  writeConfig(config);
}

// Export types
export type { AuthConfig as AuthConfigType, Team as TeamType };
