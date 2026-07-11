// join command
// npx schemory join <joinCode>

import { Command } from 'commander';
import { getHttpClient, setHttpClientConfig } from '../http.js';
import { readConfig, addTeam, autoSetDefaultTeamIfSingleTeam } from '../config.js';

export function createJoinCommand(): Command {
  return new Command('join')
    .description('Join a Schemory team using a join code')
    .argument('<joinCode>', 'Join code for the team to join')
    .action(async (joinCode: string) => {
      if (!joinCode || joinCode.trim().length === 0) {
        console.error('Error: Join code is required');
        process.exit(1);
      }

      // Get config to determine API URL and check for auth token
      const config = readConfig();
      const apiUrl = config.apiUrl;
      const token = config.auth?.token;

      if (!token) {
        console.error('Error: You must be logged in to join a team. Please run `schemory login <email>` first.');
        process.exit(1);
      }

      // Configure HTTP client with API URL and token
      setHttpClientConfig({ apiUrl, token });
      const http = getHttpClient();

      // POST /teams/:joinCode/join (no body needed, join code in URL)
      const response = await http.post(`/teams/${encodeURIComponent(joinCode)}/join`, {});

      if (response.error) {
        // Handle specific error cases
        if (response.error.code === 'UNAUTHORIZED') {
          console.error('Error: Unauthorized - please check your authentication token');
        } else if (response.error.code === 'INVALID_TOKEN') {
          console.error('Error: Invalid or expired access token');
        } else if (response.error.code === 'INVALID_JOIN_CODE') {
          console.error('Error: Invalid join code');
        } else if (response.error.code === 'TEAM_NOT_FOUND') {
          console.error(`Error: Team with join code '${joinCode}' not found`);
        } else {
          console.error(`Error: ${response.error.message}`);
        }
        process.exit(1);
      }

      if (response.status === 200 && response.data) {
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
