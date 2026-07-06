// activate command
// npx schemory activate <token>
// Prompts for password to set during activation

import { Command } from 'commander';
import { createInterface } from 'readline';
import { getHttpClient, setHttpClientConfig } from '../http.js';
import { readConfig, setAuthToken } from '../config.js';

// Prompt user for input
async function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

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

export function createActivateCommand(): Command {
  return new Command('activate')
    .description('Activate a Schemory account using the activation token')
    .argument('<token>', 'Activation token from email')
    .action(async (token: string) => {
      if (!token) {
        console.error('Error: Activation token is required');
        process.exit(1);
      }

      // Prompt for password
      console.log('\nPlease set a password for your account:');
      const password = await promptPassword('Enter password: ');
      
      if (!password || password.length < 8) {
        console.error('Error: Password must be at least 8 characters');
        process.exit(1);
      }

      const confirmPassword = await promptPassword('Confirm password: ');
      
      if (password !== confirmPassword) {
        console.error('Error: Passwords do not match');
        process.exit(1);
      }

      const config = readConfig();
      const apiUrl = config.apiUrl;
      setHttpClientConfig({ apiUrl });
      const http = getHttpClient();

      // POST /auth/activate with token and password
      const response = await http.post('/auth/activate', {
        token,
        password,
      });

      if (response.error) {
        if (response.error.code === 'INVALID_TOKEN') {
          console.error('Error: Invalid or expired activation token');
        } else if (response.error.code === 'WEAK_PASSWORD') {
          console.error('Error: Password must be at least 8 characters');
        } else if (response.error.code === 'MISSING_PASSWORD') {
          console.error('Error: Password is required');
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

        console.log('\nAccount activated successfully');
        console.log(`User: ${data.user?.email}`);
        console.log(`Access token: ${data.accessToken}`);
        console.log(`Expires: ${expiresAt}`);
      } else {
        console.error('Error: Unexpected response from server');
        process.exit(1);
      }
    });
}
