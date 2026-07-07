// create command
// npx schemory create <teamName>

import { Command } from 'commander';
import { getHttpClient, setHttpClientConfig } from '../http.js';
import { readConfig, addTeam, autoSetDefaultTeamIfSingleTeam } from '../config.js';

export function createCreateCommand(): Command {
  return new Command('create')
    .description('Create a new Schemory team')
    .argument('<teamName>', 'Name of the team to create')
    .action(async (teamName: string) => {
      if (!teamName || teamName.trim().length === 0) {
        console.error('Error: Team name is required');
        process.exit(1);
      }

      // Get config to determine API URL and check for auth token
      const config = readConfig();
      const apiUrl = config.apiUrl;
      const token = config.auth?.token;

      if (!token) {
        console.error('Error: You must be logged in to create a team. Please run `schemory login <token>` first.');
        process.exit(1);
      }

      // Configure HTTP client with API URL and token
      setHttpClientConfig({ apiUrl, token });
      const http = getHttpClient();

      // POST /teams with team name in body
      const response = await http.post('/teams', {
        name: teamName.trim(),
      });

      if (response.error) {
        // Handle specific error cases
        if (response.error.code === 'UNAUTHORIZED') {
          console.error('Error: Unauthorized - please check your authentication token');
        } else if (response.error.code === 'INVALID_TOKEN') {
          console.error('Error: Invalid or expired access token');
        } else if (response.error.code === 'INVALID_TEAM_NAME') {
          console.error('Error: Invalid team name');
        } else {
          console.error(`Error: ${response.error.message}`);
        }
        process.exit(1);
      }

      if (response.status === 201 && response.data) {
        const data = response.data as {
          team?: { id: number | string; name: string; createdAt: string; joinCode?: string };
          membership?: { userId: number | string; teamId: number | string; role: string; joinedAt: string };
        };

        if (data.team) {
          // Add team to config
          addTeam({
            id: data.team.id.toString(),
            name: data.team.name,
            createdAt: data.team.createdAt,
          });

          // Auto-select single team if applicable
          autoSetDefaultTeamIfSingleTeam();

          console.log(`Created team ${data.team.name}`);
          console.log(`Team ID: ${data.team.id}`);
          
          if (data.team.joinCode) {
            console.log(`Join code: ${data.team.joinCode}`);
            console.log('');
            console.log('Share this join code with others to invite them to the team.');
            console.log('They can join using: npx schemory join <joinCode>');
          }
        } else {
          console.error('Error: No team information returned from server');
          process.exit(1);
        }
      } else {
        console.error('Error: Unexpected response from server');
        process.exit(1);
      }
    });
}
