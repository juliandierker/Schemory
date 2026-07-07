// status command
// npx schemory status

import { Command } from 'commander';
import { getHttpClient, setHttpClientConfig } from '../http.js';
import { readConfig } from '../config.js';

// ANSI color codes for colored output
const GREEN_DOT = '\x1b[32m●\x1b[0m';
const RED_DOT = '\x1b[31m●\x1b[0m';

interface Team {
  id: number | string;
  name: string;
  createdAt?: string;
}

export function createStatusCommand(): Command {
  return new Command('status')
    .description('Show current login status, active team, and file count')
    .action(async () => {
      // Get config to check for auth token and teams
      const config = readConfig();
      const token = config.auth?.token;
      const email = config.auth?.email;
      const localTeams = config.teams || [];
      const defaultTeam = config.defaultTeam;
      const apiUrl = config.apiUrl;

      // Always show login status first
      if (!token) {
        console.log(`${RED_DOT} Login Status: Not logged in`);
        console.log('   Run `schemory login <email>` to authenticate');
        return;
      }

      // User is logged in
      const emailDisplay = email ? ` (${email})` : '';
      console.log(`${GREEN_DOT} Login Status: Logged in${emailDisplay}`);

      // Try to fetch teams from server to get accurate data
      let teams: Team[] = [];
      let serverReachable = false;
      
      try {
        setHttpClientConfig({ apiUrl, token });
        const http = getHttpClient();
        
        // Fetch current teams from server
        const response = await http.get('/teams');
        
        if (response.status === 200 && response.data) {
          const data = response.data as { teams?: Array<{ id: number; name: string; role: string }> };
          if (data.teams && data.teams.length > 0) {
            teams = data.teams.map(t => ({
              id: t.id.toString(),
              name: t.name,
            }));
            serverReachable = true;
          }
        }
      } catch {
        // Server not reachable, fall back to local config
        serverReachable = false;
      }

      // Use server teams if available, otherwise fall back to local
      const effectiveTeams = serverReachable ? teams : localTeams;

      // Check if user has any teams
      if (effectiveTeams.length === 0) {
        console.log('Team Status: No teams');
        console.log('   Run `schemory create <teamName>` or `schemory join <joinCode>` to join a team');
        
        // If server was reachable and returned no teams, update local config
        if (serverReachable) {
          console.log('Note: Server shows no teams. Local team data may be stale.');
        }
        return;
      }

      // User has teams - show team information
      console.log(`Team Status: ${effectiveTeams.length} team(s)`);
      
      // Check if default team exists in current teams
      const activeTeam = effectiveTeams.find(t => t.name === defaultTeam);
      
      // Show active team
      if (activeTeam) {
        console.log(`Active Team: ${activeTeam.name}`);
        
        // Try to get file count for the active team
        try {
          const http = getHttpClient();
          
          // Get items for the active team
          const response = await http.get(`/items?teamId=${activeTeam.id}`);
          
          if (response.status === 200 && response.data) {
            const data = response.data as { items?: Array<unknown> };
            const fileCount = data.items ? data.items.length : 0;
            console.log(`Files in active team: ${fileCount}`);
          } else if (response.error) {
            // If there's an error, still show what we can
            console.log('Warning: Could not retrieve file count for active team');
          }
        } catch {
          // If API call fails, still show basic status
          console.log('Warning: Could not connect to server to get file count');
        }
      } else {
        if (serverReachable) {
          console.log(`Active Team: ${defaultTeam || 'None'} (not found in current teams)`);
          console.log('Note: Your active team setting may be stale. Update with `schemory use <teamName>`.');
        } else {
          console.log(`Active Team: ${defaultTeam || 'None'} (not found in local config)`);
        }
      }
      
      // Always show all available teams with names only (no IDs)
      if (effectiveTeams.length > 0) {
        console.log('Available teams:');
        for (const team of effectiveTeams) {
          const isActive = defaultTeam === team.name;
          const prefix = isActive ? '>' : ' ';
          console.log(`   ${prefix} ${team.name}`);
        }
        
        // If server was reachable and we had local teams that don't match, warn about stale data
        if (serverReachable && localTeams.length > 0) {
          const localTeamNames = new Set(localTeams.map(t => t.name));
          const serverTeamNames = new Set(effectiveTeams.map(t => t.name));
          
          const staleTeams = localTeams.filter(t => !serverTeamNames.has(t.name));
          const newTeams = effectiveTeams.filter(t => !localTeamNames.has(t.name));
          
          if (staleTeams.length > 0 || newTeams.length > 0) {
            console.log('');
            console.log('Note: Local team data may be out of sync with server.');
            if (staleTeams.length > 0) {
              console.log(`  Local has ${staleTeams.length} team(s) not on server: ${staleTeams.map(t => t.name).join(', ')}`);
            }
            if (newTeams.length > 0) {
              console.log(`  Server has ${newTeams.length} team(s) not in local: ${newTeams.map(t => t.name).join(', ')}`);
            }
            console.log('  Consider running a sync command to update local data.');
          }
        }
      }
    });
}