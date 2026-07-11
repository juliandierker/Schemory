// pull command
// npx schemory pull [name] [outputPath]
// If no name: pulls all team items
// If name: pulls single item

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { getHttpClient, setHttpClientConfig } from '../http.js';
import { readConfig } from '../config.js';

export function createPullCommand(): Command {
  return new Command('pull')
    .description('Pull schemas and types. Usage: schemory pull [name] [outputPath] [--team <teamId>]')
    .argument('[name]', 'Name of the schema or type to pull (optional - pulls all if omitted)')
    .argument('[outputPath]', 'Optional output file path for single item (e.g., ./mytype.ts)')
    .option('--team <teamId>', 'Filter items by team ID')
    .action(async (name?: string, outputPath?: string, options?: { team?: string }) => {
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

      // If no name provided, pull all items (like pullAll)
      if (!name || name.trim().length === 0) {
        // GET /items - pull all, optionally filtered by team
        const queryParams = options?.team ? `?teamId=${encodeURIComponent(options.team)}` : '';
        const response = await http.get(`/items${queryParams}`);

        if (response.error) {
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
          for (const item of data.items) {
            const kindDir = item.kind === 'schema' ? schemasDir : typesDir;
            const fileExt = item.kind === 'schema' ? 'json' : 'ts';
            const filePath = path.join(kindDir, `${item.name}.${fileExt}`);

            fs.writeFileSync(filePath, item.content, 'utf-8');
            pulledCount++;
            console.log(`Pulled ${item.kind} '${item.name}' to ${filePath}`);
          }

          console.log(`Pulled ${pulledCount} items total`);
          return;
        } else {
          console.error('Error: Unexpected response from server');
          process.exit(1);
        }
      }

      // Pull single item by name
      const response = await http.get(`/items/${encodeURIComponent(name)}`);

      if (response.error) {
        if (response.error.code === 'UNAUTHORIZED') {
          console.error('Error: Unauthorized - please check your authentication token');
        } else if (response.error.code === 'INVALID_TOKEN') {
          console.error('Error: Invalid or expired access token');
        } else if (response.error.code === 'ITEM_NOT_FOUND') {
          console.error(`Error: Item '${name}' not found or you lack access`);
        } else {
          console.error(`Error: ${response.error.message}`);
        }
        process.exit(1);
      }

      if (response.status === 200 && response.data) {
        const data = response.data as {
          item?: { id: number; teamId: number; name: string; kind: string; content: string; version: number; createdAt: string; updatedAt: string };
        };

        if (!data.item) {
          console.error(`Error: No item found with name '${name}'`);
          process.exit(1);
        }

        const item = data.item;
        let filePath: string;
        
        // If output path is provided, use it directly
        if (outputPath) {
          filePath = path.isAbsolute(outputPath)
            ? outputPath
            : path.join(process.cwd(), outputPath);
          
          // Ensure parent directory exists
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
          }
        } else {
          // Default: save to .schemory/items/
          const itemsDir = path.join(process.cwd(), '.schemory', 'items');
          const kindDir = path.join(itemsDir, item.kind === 'schema' ? 'schemas' : 'types');
          const fileExt = item.kind === 'schema' ? 'json' : 'ts';
          filePath = path.join(kindDir, `${item.name}.${fileExt}`);

          if (!fs.existsSync(kindDir)) {
            fs.mkdirSync(kindDir, { recursive: true, mode: 0o755 });
          }
        }

        fs.writeFileSync(filePath, item.content, 'utf-8');
        console.log(`Pulled ${item.kind} '${item.name}' to ${filePath}`);
      } else {
        console.error('Error: Unexpected response from server');
        process.exit(1);
      }
    });
}
