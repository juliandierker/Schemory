// pullAll command
// npx schemory pullAll

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { getHttpClient, setHttpClientConfig } from '../http.js';
import { readConfig } from '../config.js';

export function createPullAllCommand(): Command {
  return new Command('pullAll')
    .description('Pull all schemas and types')
    .action(async () => {
      // Get config to determine API URL and check for auth token
      const config = readConfig();
      const apiUrl = config.apiUrl;
      const token = config.auth?.token;
      const teams = config.teams || [];

      if (!token) {
        console.error('Error: You must be logged in to pull items. Please run `schemory login <email>` first.');
        process.exit(1);
      }

      // Check that user is in at least one team
      if (teams.length === 0) {
        console.error('Error: You must join a team to pull items. Use `schemory create <teamName>` or `schemory join <joinCode>`.');
        process.exit(1);
      }

      // Configure HTTP client with API URL and token
      setHttpClientConfig({ apiUrl, token });
      const http = getHttpClient();

      // GET /items
      const response = await http.get('/items');

      if (response.error) {
        // Handle specific error cases
        if (response.error.code === 'UNAUTHORIZED') {
          console.error('Error: Unauthorized - please check your authentication token');
        } else if (response.error.code === 'INVALID_TOKEN') {
          console.error('Error: Invalid or expired access token');
        } else {
          console.error(`Error: ${response.error.message}`);
        }
        process.exit(1);
      }

      if (response.status === 200 && response.data) {
        const data = response.data as {
          items?: Array<{ id: number; teamId: number; name: string; kind: string; content: string; version: number; createdAt: string; updatedAt: string }>;
        };

        if (!data.items || data.items.length === 0) {
          console.log('No items to pull');
          return;
        }

        // Ensure base directory exists
        const itemsDir = path.join(process.cwd(), '.schemory', 'items');
        const schemasDir = path.join(itemsDir, 'schemas');
        const typesDir = path.join(itemsDir, 'types');

        if (!fs.existsSync(schemasDir)) {
          fs.mkdirSync(schemasDir, { recursive: true, mode: 0o755 });
        }
        if (!fs.existsSync(typesDir)) {
          fs.mkdirSync(typesDir, { recursive: true, mode: 0o755 });
        }

        let pulledCount = 0;

        // Process each item
        for (const item of data.items) {
          // Determine file path based on item kind
          const kindDir = item.kind === 'schema' ? schemasDir : typesDir;
          const fileExt = item.kind === 'schema' ? 'json' : 'ts';
          const filePath = path.join(kindDir, `${item.name}.${fileExt}`);

          // Write content to file
          fs.writeFileSync(filePath, item.content, 'utf-8');
          pulledCount++;
          console.log(`Pulled ${item.kind} '${item.name}' to ${filePath}`);
        }

        console.log(`Pulled ${pulledCount} items total`);
      } else {
        console.error('Error: Unexpected response from server');
        process.exit(1);
      }
    });
}
