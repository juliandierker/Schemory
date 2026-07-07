// sync command
// npx schemory sync

import { Command } from 'commander';
import { getHttpClient, setHttpClientConfig } from '../http.js';
import { readConfig, writeConfig, autoSetDefaultTeamIfSingleTeam } from '../config.js';

interface Team {
  id: number | string;
  name: string;
  createdAt?: string;
}

export function createSyncCommand(): Command {
  return new Command('sync')
    .description('Sync local CLI configuration with server data')
    .action(async () => {
      // Get config to check for auth token
      const config = readConfig();
      const token = config.auth?.token;
      const apiUrl = config.apiUrl;

      if (!token) {
        console.log('Error: You must be logged in to sync. Please run `schemory login <email>` first.');
        process.exit(1);
      }

      console.log('Syncing CLI configuration with server...\n');

      try {
        setHttpClientConfig({ apiUrl, token });
        const http = getHttpClient();
        
        // Fetch current teams from server
        console.log('Fetching teams from server...');
        const teamsResponse = await http.get('/teams');
        
        if (teamsResponse.status === 200 && teamsResponse.data) {
          const data = teamsResponse.data as { teams?: Array<{ id: number; name: string; role: string }> };
          const serverTeams = data.teams || [];
          
          console.log(`Found ${serverTeams.length} team(s) on server.`);
          
          // Update local config with server teams
          const updatedConfig = readConfig();
          
          // Clear existing teams and add server teams
          updatedConfig.teams = serverTeams.map(t => ({
            id: t.id.toString(),
            name: t.name,
            createdAt: new Date().toISOString(),
          }));
          
          // If no teams, clear any existing default team
          if (serverTeams.length === 0) {
            delete updatedConfig.defaultTeam;
          } else {
            // If current default team is not in server teams, clear it
            if (updatedConfig.defaultTeam) {
              const defaultTeamExists = serverTeams.some(t => t.name === updatedConfig.defaultTeam);
              if (!defaultTeamExists) {
                console.log(`Warning: Current default team '${updatedConfig.defaultTeam}' not found on server. Clearing.`);
                delete updatedConfig.defaultTeam;
              }
            }
          }
          
          writeConfig(updatedConfig);
          console.log(`Updated local config with ${serverTeams.length} team(s).`);
          
          // Show synced teams
          if (serverTeams.length > 0) {
            console.log('\nSynced teams:');
            for (const team of serverTeams) {
              const isDefault = updatedConfig.defaultTeam === team.name;
              const marker = isDefault ? ' (default)' : '';
              console.log(`  - ${team.name}${marker}`);
            }
          } else {
            console.log('\nNo teams found on server.');
          }
          

          
          console.log('\nSync completed successfully.');
          
        } else if (teamsResponse.error) {
          console.error(`Error fetching teams: ${teamsResponse.error.message}`);
          process.exit(1);
        } else {
          console.error('Error: Unexpected response from server when fetching teams');
          process.exit(1);
        }
        
      } catch (error) {
        console.error('Error: Could not connect to server to sync data');
        console.error('Please check your network connection and try again.');
        process.exit(1);
      }
    });
}