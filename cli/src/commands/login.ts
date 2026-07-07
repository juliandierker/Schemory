// login command
// npx schemory login <email>
// Prompts for password

import { Command } from 'commander';
import { createInterface } from 'readline';
import { getHttpClient, setHttpClientConfig } from '../http.js';
import { readConfig, setAuthToken, addTeam, autoSetDefaultTeamIfSingleTeam } from '../config.js';
import { displayStatus } from '../utils/status.js';

// Hide input for password (simple approach - use stdin directly)
async function promptPassword(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    // Disable echo for password input
    if (process.stdin.isTTY) {
      // @ts-ignore - stdio types
      process.stdin.setRawMode?.(true);
    }
    
    process.stdout.write(question);
    
    let password = '';
    const onData = (char: Buffer) => {
      // Enter key
      if (char[0] === 13) {
        cleanup();
        resolve(password);
        return;
      }
      // Backspace
      if (char[0] === 127 || char[0] === 8) {
        if (password.length > 0) {
          password = password.slice(0, -1);
          // Move cursor back, write space, move cursor back
          process.stdout.write('\x08 \x08');
        }
        return;
      }
      // Add character to password
      password += char.toString();
      process.stdout.write('*');
    };
    
    const onError = (err: Error) => {
      cleanup();
      console.error('Error reading password:', err);
      resolve('');
    };
    
    const cleanup = () => {
      rl.close();
      if (process.stdin.isTTY) {
        // @ts-ignore
        process.stdin.setRawMode?.(false);
      }
      process.stdout.write('\n');
      process.stdin.off('data', onData);
      process.stdin.off('error', onError);
    };
    
    process.stdin.on('data', onData);
    process.stdin.on('error', onError);
    
    // Set raw mode for password input
    if (process.stdin.isTTY) {
      // @ts-ignore
      process.stdin.setRawMode(true);
    }
  });
}

export function createLoginCommand(): Command {
  return new Command('login')
    .description('Authenticate the CLI with email and password')
    .argument('<email>', 'Email address')
    .action(async (email: string) => {
      if (!email) {
        console.error('Error: Email is required');
        process.exit(1);
      }

      // Prompt for password
      const password = await promptPassword('Enter password: ');
      
      if (!password) {
        console.error('Error: Password is required');
        process.exit(1);
      }

      // Get config to determine API URL
      const config = readConfig();
      const apiUrl = config.apiUrl;

      // Configure HTTP client with API URL
      setHttpClientConfig({ apiUrl });
      const http = getHttpClient();

      // POST /auth/login with email and password
      const response = await http.post('/auth/login', { email, password });

      if (response.error) {
        // Handle specific error cases
        if (response.error.code === 'MISSING_EMAIL') {
          console.error('Error: Email is required');
        } else if (response.error.code === 'MISSING_PASSWORD') {
          console.error('Error: Password is required');
        } else if (response.error.code === 'INVALID_CREDENTIALS') {
          console.error('Error: Invalid email or password');
        } else {
          console.error(`Error: ${response.error.message}`);
        }
        process.exit(1);
      }

      if (response.status === 200 && response.data) {
        const data = response.data as {
          user?: { id: number | string; email: string; isActive: boolean };
          teams?: any[];
          accessToken?: string;
          expiresAt?: string;
        };

        if (!data.accessToken) {
          console.error('Error: No access token received');
          process.exit(1);
        }

        // Extract user ID as string and email
        const userId = data.user?.id?.toString() || '';
        const userEmail = data.user?.email;
        const expiresAt = data.expiresAt || new Date(Date.now() + 24 * 365 * 60 * 60 * 1000).toISOString();

        // Save token to config
        setAuthToken(data.accessToken, expiresAt, userId, userEmail);

        // If teams are returned, add them to config and auto-select single team
        if (data.teams && data.teams.length > 0) {
          // Add all teams to config
          for (const team of data.teams) {
            addTeam({
              id: team.id.toString(),
              name: team.name,
              createdAt: team.createdAt || new Date().toISOString(),
            });
          }
          
          // Auto-select the single team if that's the case
          autoSetDefaultTeamIfSingleTeam();
        }

        // Display status after successful login (includes logo)
        await displayStatus();
      } else {
        console.error('Error: Unexpected response from server');
        process.exit(1);
      }
    });
}
