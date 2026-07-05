// push command
// npx schemory push <schema|type>

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { getHttpClient, setHttpClientConfig } from '../http.js';
import { readConfig } from '../config.js';

export function createPushCommand(): Command {
  return new Command('push')
    .description('Push a schema or type by name')
    .argument('<name>', 'Name of the schema or type to push')
    .action(async (name: string) => {
      if (!name || name.trim().length === 0) {
        console.error('Error: Item name is required');
        process.exit(1);
      }

      // Get config to determine API URL and check for auth token
      const config = readConfig();
      const apiUrl = config.apiUrl;
      const token = config.auth?.token;

      if (!token) {
        console.error('Error: You must be logged in to push items. Please run `schemory login <token>` first.');
        process.exit(1);
      }

      // Look for the file in .schemory/items/schemas/{name}.json or .schemory/items/types/{name}.ts
      const itemsDir = path.join(process.cwd(), '.schemory', 'items');
      const jsonFilePath = path.join(itemsDir, 'schemas', `${name}.json`);
      const tsFilePath = path.join(itemsDir, 'types', `${name}.ts`);

      let filePath: string;
      let kind: string;
      let content: string;

      // Check if JSON file exists (schema)
      if (fs.existsSync(jsonFilePath)) {
        filePath = jsonFilePath;
        kind = 'schema';
        content = fs.readFileSync(filePath, 'utf-8');
      } else if (fs.existsSync(tsFilePath)) {
        // Check if TypeScript file exists (type)
        filePath = tsFilePath;
        kind = 'type';
        content = fs.readFileSync(filePath, 'utf-8');
      } else {
        console.error(`Error: No file found for item '${name}'. Expected ${jsonFilePath} or ${tsFilePath}`);
        process.exit(1);
      }

      // Configure HTTP client with API URL and token
      setHttpClientConfig({ apiUrl, token });
      const http = getHttpClient();

      // For push, we need to determine lastKnownVersion
      // If the item already exists, we should get its current version first
      // For new items, lastKnownVersion should be 0 or undefined
      // Let's first try to get the existing item to get its version
      let lastKnownVersion: number | undefined;

      try {
        const getResponse = await http.get(`/items/${encodeURIComponent(name)}`);
        if (getResponse.status === 200 && getResponse.data) {
          const existingData = getResponse.data as {
            item?: { version: number };
          };
          if (existingData.item) {
            lastKnownVersion = existingData.item.version;
          }
        }
        // If not found (404), that's fine - it's a new item
      } catch {
        // If we can't get the item, assume it's new
        lastKnownVersion = undefined;
      }

      // PUT /items/:name with { kind, content, lastKnownVersion }
      const response = await http.put(`/items/${encodeURIComponent(name)}`, {
        kind,
        content,
        lastKnownVersion,
      });

      if (response.error) {
        // Handle specific error cases
        if (response.error.code === 'UNAUTHORIZED') {
          console.error('Error: Unauthorized - please check your authentication token');
        } else if (response.error.code === 'INVALID_TOKEN') {
          console.error('Error: Invalid or expired access token');
        } else if (response.error.code === 'CONFLICT') {
          console.error(`Error: Conflict - remote version is newer. Please pull and merge: ${response.error.message}`);
        } else if (response.error.code === 'INVALID_REQUEST') {
          console.error('Error: Invalid request - kind and content are required');
        } else if (response.error.code === 'INVALID_KIND') {
          console.error('Error: Invalid kind - must be "schema" or "type"');
        } else {
          console.error(`Error: ${response.error.message}`);
        }
        process.exit(1);
      }

      if (response.status === 200 && response.data) {
        const data = response.data as {
          item?: { id: number; teamId: number; name: string; kind: string; content: string; version: number; createdAt: string; updatedAt: string };
        };

        if (data.item) {
          console.log(`Pushed ${kind} '${name}' version ${data.item.version}`);
        } else {
          console.error('Error: No item returned from server');
          process.exit(1);
        }
      } else {
        console.error('Error: Unexpected response from server');
        process.exit(1);
      }
    });
}
