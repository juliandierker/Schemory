// help command
// npx schemory help

import { Command } from 'commander';

export function createHelpCommand(): Command {
  return new Command('help')
    .description('Show available CLI commands and usage information')
    .action(() => {
      console.log('Schemory CLI - Available Commands\n');
      
      // Authentication commands
      console.log('AUTHENTICATION');
      console.log('  npx schemory signup <email>           Register a new Schemory account');
      console.log('  npx schemory activate <token>         Activate your account using activation token');
      console.log('  npx schemory login <email>           Authenticate with email and password');
      console.log('  npx schemory logout                  Log out of the current session\n');

      // Team Management commands
      console.log('TEAM MANAGEMENT');
      console.log('  npx schemory create <teamName>       Create a new team');
      console.log('  npx schemory invite <teamId>          Get join code for a team');
      console.log('  npx schemory join <joinCode>         Join a team using join code');
      console.log('  npx schemory use <teamName>         Switch active team for push/pull');
      console.log('  npx schemory status                 Show current login status and active team');
      console.log('  npx schemory sync                  Sync local config with server data\n');

      // File Operations commands
      console.log('FILE OPERATIONS');
      console.log('  npx schemory push <filePath>        Push a schema/type file to team');
      console.log('  npx schemory push <name>            Push an existing item to team');
      console.log('  npx schemory pull                  Pull all items from active team');
      console.log('  npx schemory pull <name>           Pull a specific item by name');
      console.log('  npx schemory pull <name> <path>    Pull item to specific file path');
      console.log('  npx schemory pullAll               Pull all items (legacy)\n');

      // General commands
      console.log('GENERAL');
      console.log('  npx schemory help                  Show this help information');
      console.log('  npx schemory --version             Show CLI version\n');

      // Usage examples
      console.log('USAGE EXAMPLES');
      console.log('  # Get started');
      console.log('  npx schemory signup user@example.com');
      console.log('  npx schemory activate act_token_from_email');
      console.log('  npx schemory login user@example.com');
      console.log('  npx schemory logout');
      console.log('');
      console.log('  # Team workflow');
      console.log('  npx schemory create MyTeam');
      console.log('  npx schemory use MyTeam');
      console.log('  npx schemory invite');
      console.log('');
      console.log('  # File operations');
      console.log('  npx schemory push ./my-schema.json');
      console.log('  npx schemory pull my-schema');
      console.log('  npx schemory pullAll');
      console.log('');
      console.log('  # Check status');
      console.log('  npx schemory status');
      console.log('');
      console.log('  # Sync with server');
      console.log('  npx schemory sync\n');

      // Quick reference
      console.log('QUICK REFERENCE');
      console.log('  Setup:    signup -> activate -> login -> logout');
      console.log('  Teams:    create -> invite -> join -> use -> sync');
      console.log('  Files:    push -> pull');
      console.log('  Status:   status, help\n');

      console.log('MORE HELP');
      console.log('  Run "npx schemory <command> --help" for detailed help on specific commands');
      console.log('  Visit the dashboard for more information and CLI setup guide');
    });
}