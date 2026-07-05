// signup command
// npx schemory signup <email>

import { Command } from 'commander';
import { getHttpClient, setHttpClientConfig } from '../http.js';
import { readConfig } from '../config.js';

export function createSignupCommand(): Command {
  return new Command('signup')
    .description('Register a new Schemory account')
    .argument('<email>', 'Email address for the new account')
    .action(async (email: string) => {
      // Validate email format
      if (!email || !email.includes('@')) {
        console.error('Error: Invalid email format');
        process.exit(1);
      }

      // Get config to determine API URL
      const config = readConfig();
      const apiUrl = config.apiUrl;

      // Configure HTTP client with API URL
      setHttpClientConfig({ apiUrl });
      const http = getHttpClient();

      // POST /auth/signup with { email }
      const response = await http.post('/auth/signup', { email });

      if (response.error) {
        // Handle specific error cases
        if (response.error.code === 'INVALID_EMAIL') {
          console.error('Error: Invalid email format');
        } else if (response.error.code === 'EMAIL_EXISTS') {
          console.error('Error: Email already registered');
        } else {
          console.error(`Error: ${response.error.message}`);
        }
        process.exit(1);
      }

      if (response.status === 202 && response.data) {
        const data = response.data as { status?: string; message?: string };
        console.log(data.message || 'Activation email sent. Please check your inbox.');
      } else {
        console.error('Error: Unexpected response from server');
        process.exit(1);
      }
    });
}
