// status command
// npx schemory status

import { Command } from 'commander';
import { displayStatus } from '../utils/status.js';

export function createStatusCommand(): Command {
  return new Command('status')
    .description('Show current login status, active team, and file count')
    .action(displayStatus);
}