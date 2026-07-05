// Schemory CLI entry point
// Wires up commander.js with all seven commands

import { Command } from 'commander';
import { createSignupCommand } from './commands/signup.js';
import { createActivateCommand } from './commands/activate.js';
import { createLoginCommand } from './commands/login.js';
import { createJoinCommand } from './commands/join.js';
import { createPullCommand } from './commands/pull.js';
import { createPullAllCommand } from './commands/pullAll.js';
import { createPushCommand } from './commands/push.js';

/**
 * Create the main CLI program
 */
function createCLI(): Command {
  const program = new Command();

  // Configure program metadata
  program
    .name('schemory')
    .description('Schemory CLI - Share TypeScript types and JSON schemas with your team')
    .version('0.1.0');

  // Add all seven commands
  program
    .addCommand(createSignupCommand())
    .addCommand(createActivateCommand())
    .addCommand(createLoginCommand())
    .addCommand(createJoinCommand())
    .addCommand(createPullCommand())
    .addCommand(createPullAllCommand())
    .addCommand(createPushCommand());

  // Global error handling
  program.configureOutput({
    writeErr: (str) => {
      console.error(str);
    },
  });

  return program;
}

// Create the CLI program
const program = createCLI();

// Note: CLI execution is now handled explicitly by index.ts (the bin entry point)
// This file only exports the CLI factory and program instance for use by index.ts and tests

export { createCLI, program };
export default program;
