// logout command
// npx schemory logout

import { Command } from 'commander';
import { readConfig, clearAuthToken } from '../config.js';

export function createLogoutCommand(): Command {
  return new Command('logout')
    .description('Log out of the current session and clear authentication token')
    .action(async () => {
      // Get config to check for auth token
      const config = readConfig();
      const token = config.auth?.token;

      // Check if user is logged in
      if (!token) {
        console.error('Error: You are not logged in');
        process.exit(1);
      }

      // Clear the auth token
      clearAuthToken();

      console.log('Logged out successfully');
    });
}