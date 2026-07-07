// resignup command
// npx schemory resignup <email>

import { Command } from 'commander';
import { getHttpClient, setHttpClientConfig } from '../http.js';
import { readConfig } from '../config.js';

export function createResignupCommand(): Command {
  return new Command('resignup')
    .description('Resend activation email for an existing account')
    .argument('<email>', 'Email address to resend activation email to')
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

      // POST /auth/resend-activation with { email }
      const response = await http.post('/auth/resend-activation', { email });

      if (response.error) {
        // Handle specific error cases
        if (response.error.code === 'INVALID_EMAIL') {
          console.error('Error: Invalid email format');
        } else {
          console.error(`Error: ${response.error.message}`);
        }
        process.exit(1);
      }

      if (response.data) {
        const data = response.data as { status?: string; message?: string };
        console.log(data.message || 'Activation email resent. Please check your inbox.');
      } else {
        console.error('Error: Unexpected response from server');
        process.exit(1);
      }
    });
}
