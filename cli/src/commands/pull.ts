// pull command
// npx schemory pull <schema|type>

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { getHttpClient, setHttpClientConfig } from '../http.js';
import { readConfig } from '../config.js';

export function createPullCommand(): Command {
  return new Command('pull')
    .description('Pull a schema or type by name. Usage: schemory pull <name> [outputPath]')
    .argument('<name>', 'Name of the schema or type to pull')
    .argument('[outputPath]', 'Optional output file path (e.g., ./mytype.ts)')
    .action(async (name: string, outputPath?: string) => {
      if (!name || name.trim().length === 0) {
        console.error('Error: Item name is required');
        process.exit(1);
      }

      // Get config to determine API URL and check for auth token
      const config = readConfig();
      const apiUrl = config.apiUrl;
      const token = config.auth?.token;

      if (!token) {
        console.error('Error: You must be logged in to pull items. Please run `schemory login <token>` first.');
        process.exit(1);
      }

      // Configure HTTP client with API URL and token
      setHttpClientConfig({ apiUrl, token });
      const http = getHttpClient();

      // GET /items/:name
      const response = await http.get(`/items/${encodeURIComponent(name)}`);

      if (response.error) {
        // Handle specific error cases
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
          // Schemas go to .schemory/items/schemas/{name}.json
          // Types go to .schemory/items/types/{name}.ts
          const itemsDir = path.join(process.cwd(), '.schemory', 'items');
          const kindDir = path.join(itemsDir, item.kind === 'schema' ? 'schemas' : 'types');
          const fileExt = item.kind === 'schema' ? 'json' : 'ts';
          filePath = path.join(kindDir, `${item.name}.${fileExt}`);

          // Ensure directory exists
          if (!fs.existsSync(kindDir)) {
            fs.mkdirSync(kindDir, { recursive: true, mode: 0o755 });
          }
        }

        // Write content to file
        fs.writeFileSync(filePath, item.content, 'utf-8');

        console.log(`Pulled ${item.kind} '${item.name}' to ${filePath}`);
      } else {
        console.error('Error: Unexpected response from server');
        process.exit(1);
      }
    });
}
