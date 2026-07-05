// activate command
// npx schemory activate <token>

import { Command } from 'commander';
import { getHttpClient, setHttpClientConfig } from '../http.js';
import { readConfig, setAuthToken } from '../config.js';

export function createActivateCommand(): Command {
  return new Command('activate')
    .description('Activate a Schemory account using the activation token')
    .argument('<token>', 'Activation token from email')
    .action(async (token: string) => {
      if (!token) {
        console.error('Error: Activation token is required');
        process.exit(1);
      }

      const config = readConfig();
      const apiUrl = config.apiUrl;
      setHttpClientConfig({ apiUrl });
      const http = getHttpClient();

      // GET /auth/activate/:token
      const response = await http.get(`/auth/activate/${token}`);

      if (response.error) {
        if (response.error.code === 'INVALID_TOKEN') {
          console.error('Error: Invalid or expired activation token');
        } else {
          console.error(`Error: ${response.error.message}`);
        }
        process.exit(1);
      }

      if (response.status === 200 && response.data) {
        const data = response.data as {
          user?: { id: number | string; email: string; isActive: boolean };
          accessToken?: string;
          expiresAt?: string;
        };

        if (!data.accessToken) {
          console.error('Error: No access token received');
          process.exit(1);
        }

        const userId = data.user?.id?.toString() || '';
        const expiresAt = data.expiresAt || new Date(Date.now() + 24 * 365 * 60 * 60 * 1000).toISOString();
        setAuthToken(data.accessToken, expiresAt, userId);

        console.log('Account activated successfully');
        console.log(`Access token: ${data.accessToken}`);
        console.log(`Expires: ${expiresAt}`);
      } else {
        console.error('Error: Unexpected response from server');
        process.exit(1);
      }
    });
}
