#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { pullCommand } from './commands/pull';
import { pushCommand } from './commands/push';
import { listCommand } from './commands/list';
import { statusCommand } from './commands/status';
import { exportCommand } from './commands/export';
import { importCommand } from './commands/import';

// Create main CLI
const program = new Command();

program
  .name('schemory-vault')
  .description('CLI for managing TypeScript types and JSON schemas with Schemory')
  .version('0.1.0');

// Add commands
program
  .addCommand(initCommand)
  .addCommand(pullCommand)
  .addCommand(pushCommand)
  .addCommand(listCommand)
  .addCommand(statusCommand)
  .addCommand(exportCommand)
  .addCommand(importCommand);

// Parse and execute
program.parse(process.argv);

export default program;
