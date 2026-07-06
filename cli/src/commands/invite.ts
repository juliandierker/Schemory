// invite command
// npx schemory invite <teamId>

import { Command } from 'commander';
import { getHttpClient, setHttpClientConfig } from '../http.js';
import { readConfig } from '../config.js';

export function createInviteCommand(): Command {
  return new Command('invite')
    .description('Get the join code for a team')
    .argument('<teamId>', 'Team ID to get join code for')
    .action(async (teamId: string) => {
      if (!teamId || teamId.trim().length === 0) {
        console.error('Error: Team ID is required');
        process.exit(1);
      }

      // Get config to determine API URL and check for auth token
      const config = readConfig();
      const apiUrl = config.apiUrl;
      const token = config.auth?.token;

      if (!token) {
        console.error('Error: You must be logged in to get a join code. Please run `schemory login <token>` first.');
        process.exit(1);
      }

      // Configure HTTP client with API URL and token
      setHttpClientConfig({ apiUrl, token });
      const http = getHttpClient();

      // GET /teams/:teamId/joincode
      const response = await http.get(`/teams/${encodeURIComponent(teamId)}/joincode`);

      if (response.error) {
        // Handle specific error cases
        if (response.error.code === 'UNAUTHORIZED') {
          console.error('Error: Unauthorized - please check your authentication token');
        } else if (response.error.code === 'INVALID_TOKEN') {
          console.error('Error: Invalid or expired access token');
        } else if (response.error.code === 'INVALID_TEAM_ID') {
          console.error('Error: Invalid team ID');
        } else if (response.error.code === 'TEAM_NOT_FOUND') {
          console.error(`Error: Team with ID '${teamId}' not found`);
        } else if (response.error.code === 'ACCESS_DENIED') {
          console.error(`Error: You are not a member of team with ID '${teamId}'`);
        } else {
          console.error(`Error: ${response.error.message}`);
        }
        process.exit(1);
      }

      if (response.status === 200 && response.data) {
        const data = response.data as {
          joinCode?: string;
        };

        if (data.joinCode) {
          console.log(`Join code for team ${teamId}: ${data.joinCode}`);
          console.log('');
          console.log('Share this join code with others to invite them to the team.');
          console.log('They can join using: npx schemory join <joinCode>');
        } else {
          console.error('Error: No join code returned from server');
          process.exit(1);
        }
      } else {
        console.error('Error: Unexpected response from server');
        process.exit(1);
      }
    });
}
