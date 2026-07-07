// use command
// npx schemory use <teamname>

import { Command } from 'commander';
import { readConfig, setDefaultTeam } from '../config.js';

export function createUseCommand(): Command {
  return new Command('use')
    .description('Set the active team for push/pull operations')
    .argument('<teamName>', 'Name of the team to switch to')
    .action(async (teamName: string) => {
      if (!teamName || teamName.trim().length === 0) {
        console.error('Error: Team name is required');
        process.exit(1);
      }

      // Get config to check for auth token and teams
      const config = readConfig();
      const token = config.auth?.token;
      const teams = config.teams || [];

      if (!token) {
        console.error('Error: You must be logged in to use a team. Please run `schemory login <email>` first.');
        process.exit(1);
      }

      // Check that user has at least one team
      if (teams.length === 0) {
        console.error('Error: You must join or create a team first. Use `schemory create <teamName>` or `schemory join <joinCode>`.');
        process.exit(1);
      }

      // Find the team by name (case-sensitive match)
      const team = teams.find(t => t.name === teamName);
      
      if (!team) {
        // Show available teams for better UX
        const availableTeams = teams.map(t => t.name).join(', ');
        console.error(`Error: Team '${teamName}' not found.`);
        console.error(`Available teams: ${availableTeams}`);
        process.exit(1);
      }

      // Set the default team
      setDefaultTeam(teamName);
      
      console.log(`Switched to team: ${teamName}`);
      
      // Show current default team
      const updatedConfig = readConfig();
      console.log(`Active team: ${updatedConfig.defaultTeam || 'none'}`);
    });
}