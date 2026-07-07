// Tests for CLI commands
import { describe, it, expect } from 'vitest';

// Import the CLI creation function
import { createCLI } from '../src/cli.js';

describe('CLI', () => {
  it('should create CLI with all commands', () => {
    const program = createCLI();
    
    // Check that all commands are registered
    const commands = program.commands.map(c => c.name());
    
    expect(commands).toContain('signup');
    expect(commands).toContain('activate');
    expect(commands).toContain('login');
    expect(commands).toContain('create');
    expect(commands).toContain('join');
    expect(commands).toContain('invite');
    expect(commands).toContain('pull');
    expect(commands).toContain('pullAll');
    expect(commands).toContain('push');
    expect(commands).toContain('use');
    expect(commands).toContain('status');
    expect(commands).toContain('help');
    expect(commands).toContain('sync');
    expect(commands).toContain('logout');
    expect(commands).toContain('completion');
    
    expect(commands).toHaveLength(15);
  });

  it('should have correct command descriptions', () => {
    const program = createCLI();
    
    const commands = program.commands;
    
    // Find each command and check description
    const signupCmd = commands.find(c => c.name() === 'signup');
    expect(signupCmd?.description()).toContain('Register');
    
    const activateCmd = commands.find(c => c.name() === 'activate');
    expect(activateCmd?.description()).toContain('Activate');
    
    const loginCmd = commands.find(c => c.name() === 'login');
    expect(loginCmd?.description()).toContain('Authenticate');
    
    const joinCmd = commands.find(c => c.name() === 'join');
    expect(joinCmd?.description()).toContain('Join');
    
    const pullCmd = commands.find(c => c.name() === 'pull');
    expect(pullCmd?.description()).toContain('Pull');
    
    const pullAllCmd = commands.find(c => c.name() === 'pullAll');
    expect(pullAllCmd?.description()).toContain('Pull all');
    
    const pushCmd = commands.find(c => c.name() === 'push');
    expect(pushCmd?.description()).toContain('Push');

    const useCmd = commands.find(c => c.name() === 'use');
    expect(useCmd?.description()).toContain('active team');

    const statusCmd = commands.find(c => c.name() === 'status');
    expect(statusCmd?.description()).toContain('login status');

    const helpCmd = commands.find(c => c.name() === 'help');
    expect(helpCmd?.description()).toContain('CLI commands');

    const syncCmd = commands.find(c => c.name() === 'sync');
    expect(syncCmd?.description()).toContain('Sync local CLI configuration');

    const logoutCmd = commands.find(c => c.name() === 'logout');
    expect(logoutCmd?.description()).toContain('Log out');

    const completionCmd = commands.find(c => c.name() === 'completion');
    expect(completionCmd?.description()).toContain('shell completion script');
  });
});
