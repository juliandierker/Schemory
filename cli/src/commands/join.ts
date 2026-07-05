// join command
// npx schemory join <team>

import { Command } from 'commander';
import { getHttpClient, setHttpClientConfig } from '../http.js';
import { readConfig, addTeam, setDefaultTeam } from '../config.js';

export function createJoinCommand(): Command {
  return new Command('join')
    .description('Join a Schemory team')
    .argument('<team>', 'Team name to join')
    .action(async (team: string) => {
      if (!team || team.trim().length === 0) {
        console.error('Error: Team name is required');
        process.exit(1);
      }

      // Get config to determine API URL and check for auth token
      const config = readConfig();
      const apiUrl = config.apiUrl;
      const token = config.auth?.token;

      if (!token) {
        console.error('Error: You must be logged in to join a team. Please run `schemory login <token>` first.');
        process.exit(1);
      }

      // Configure HTTP client with API URL and token
      setHttpClientConfig({ apiUrl, token });
      const http = getHttpClient();

      // POST /teams/:team/join
      const response = await http.post(`/teams/${encodeURIComponent(team)}/join`);

      if (response.error) {
        // Handle specific error cases
        if (response.error.code === 'UNAUTHORIZED') {
          console.error('Error: Unauthorized - please check your authentication token');
        } else if (response.error.code === 'INVALID_TOKEN') {
          console.error('Error: Invalid or expired access token');
        } else if (response.error.code === 'INVALID_TEAM_NAME') {
          console.error('Error: Invalid team name');
        } else if (response.error.code === 'TEAM_NOT_FOUND') {
          console.error(`Error: Team '${team}' not found`);
        } else {
          console.error(`Error: ${response.error.message}`);
        }
        process.exit(1);
      }

      if (response.status === 200 && response.data) {
        const data = response.data as {
          team?: { id: number | string; name: string; createdAt: string };
          membership?: { userId: number | string; teamId: number | string; role: string; joinedAt: string };
        };

        if (data.team) {
          // Add team to config
          addTeam({
            id: data.team.id.toString(),
            name: data.team.name,
            createdAt: data.team.createdAt,
          });

          // Set as default team if it's the first team
          const currentConfig = readConfig();
          if (currentConfig.teams.length === 1) {
            setDefaultTeam(data.team.name);
          }

          console.log(`Joined team ${data.team.name}`);
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
