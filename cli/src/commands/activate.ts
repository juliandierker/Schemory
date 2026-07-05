// activate command stub
// npx schemory activate <token>

import { Command } from 'commander';

export function createActivateCommand(): Command {
  return new Command('activate')
    .description('Activate a Schemory account using the activation token')
    .argument('<token>', 'Activation token from email')
    .action(async (token: string) => {
      // TODO: Implement
      // POST /api/users/activate with { token }
      // On success: print access token and save to config
      console.log(`Activate stub: would activate with token ${token}`);
    });
}
