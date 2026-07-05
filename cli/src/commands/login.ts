// login command
// npx schemory login <token>

import { Command } from 'commander';
import { getHttpClient, setHttpClientConfig } from '../http.js';
import { readConfig, setAuthToken } from '../config.js';

export function createLoginCommand(): Command {
  return new Command('login')
    .description('Authenticate the CLI with an access token')
    .argument('<token>', 'Access token')
    .action(async (token: string) => {
      if (!token) {
        console.error('Error: Access token is required');
        process.exit(1);
      }

      // Get config to determine API URL
      const config = readConfig();
      const apiUrl = config.apiUrl;

      // Configure HTTP client with API URL and token
      setHttpClientConfig({ apiUrl, token });
      const http = getHttpClient();

      // POST /auth/login with token in body
      const response = await http.post('/auth/login', { token });

      if (response.error) {
        // Handle specific error cases
        if (response.error.code === 'MISSING_TOKEN') {
          console.error('Error: Access token is required');
        } else if (response.error.code === 'INVALID_TOKEN') {
          console.error('Error: Invalid or expired access token');
        } else if (response.error.code === 'UNAUTHORIZED') {
          console.error('Error: Unauthorized - please check your token');
        } else {
          console.error(`Error: ${response.error.message}`);
        }
        process.exit(1);
      }

      if (response.status === 200 && response.data) {
        const data = response.data as {
          user?: { id: number | string; email: string; isActive: boolean };
          teams?: any[];
        };

        // Extract user ID as string
        const userId = data.user?.id?.toString() || '';
        
        // For now, we don't have expiresAt from login, but we can use a default
        // The activation endpoint returns expiresAt, but login doesn't
        // We'll use a default of 1 year from now
        const expiresAt = new Date(Date.now() + 24 * 365 * 60 * 60 * 1000).toISOString();

        // Save token to config
        setAuthToken(token, expiresAt, userId);

        console.log('Logged in successfully');
        
        // If teams are returned, we could add them to config too
        if (data.teams && data.teams.length > 0) {
          console.log(`You have access to ${data.teams.length} team(s)`);
        }
      } else {
        console.error('Error: Unexpected response from server');
        process.exit(1);
      }
    });
}
