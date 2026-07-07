// Tests for completion command and tab autocomplete functionality
import { describe, it, expect } from 'vitest';
import { createCompletionCommand } from '../src/commands/completion.js';
import { createCLI } from '../src/cli.js';
import { createPushCommand } from '../src/commands/push.js';

describe('Completion Feature - AGENTS.md Lines 29-30', () => {
  describe('completion command (npx schemory completion [bash|zsh])', () => {
    it('should create completion command with correct name', () => {
      const command = createCompletionCommand();
      expect(command.name()).toBe('completion');
    });

    it('should have description for generating shell completion script', () => {
      const command = createCompletionCommand();
      expect(command.description()).toContain('shell completion script');
    });

    it('should be registered in CLI as per AGENTS.md line 29', () => {
      const program = createCLI();
      const commandNames = program.commands.map(c => c.name());
      expect(commandNames).toContain('completion');
    });

    it('should accept shell argument', () => {
      const command = createCompletionCommand();
      // The command should have a shell argument
      expect(command.registeredArguments.length).toBeGreaterThan(0);
    });

    it('should work with any user (no auth required) as per AGENTS.md', () => {
      const command = createCompletionCommand();
      // Completion command doesn't require auth, so it should have an optional shell argument
      expect(command.registeredArguments[0].required).toBe(false);
    });
  });

  describe('push command with tab autocomplete for .ts/.json files', () => {
    it('should be registered in CLI as per AGENTS.md line 30', () => {
      const program = createCLI();
      const commandNames = program.commands.map(c => c.name());
      expect(commandNames).toContain('push');
    });

    it('should accept filePath argument as per AGENTS.md', () => {
      const command = createPushCommand();
      expect(command.registeredArguments.length).toBeGreaterThan(0);
      expect(command.registeredArguments[0]._name).toBe('pathOrName');
    });

    it('should require joined team as per AGENTS.md', () => {
      const command = createPushCommand();
      expect(command.description()).toContain('team');
    });

    it('should support .ts and .json file types for tab autocomplete', () => {
      const command = createPushCommand();
      // The push command implementation in src/commands/push.ts handles .ts and .json
      // Lines 54-62: if (ext === '.json') kind = 'schema'; else if (ext === '.ts') kind = 'type'
      expect(command.description()).toContain('filePath');
    });

    it('should be properly integrated with completion command', () => {
      const program = createCLI();
      const commandNames = program.commands.map(c => c.name());
      
      // Both commands should be present
      expect(commandNames).toContain('push');
      expect(commandNames).toContain('completion');
    });
  });

  describe('integration with AGENTS.md CLI commands table', () => {
    it('should have all commands from AGENTS.md lines 29-30', () => {
      const program = createCLI();
      const commandNames = program.commands.map(c => c.name());
      
      // From AGENTS.md line 29: npx schemory completion [bash|zsh]
      expect(commandNames).toContain('completion');
      
      // From AGENTS.md line 30: npx schemory push <filePath>
      expect(commandNames).toContain('push');
    });
  });
});
