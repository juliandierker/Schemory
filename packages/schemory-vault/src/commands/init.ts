import { Command } from 'commander';
import { prompt } from 'enquirer';
import { writeConfig, hasConfig, readConfig } from '../config/rc-file';
import { SchemoryClient } from '../api/client';
import ora from 'ora';

interface InitOptions {
  vaultUrl: string;
  teamId: string;
  outputDir: string;
  force: boolean;
  interactive: boolean;
}

export const initCommand = new Command()
  .name('init')
  .description('Initialize a new Schemory configuration file')
  .option('-u, --vault-url <url>', 'Schemory vault server URL')
  .option('-t, --team-id <id>', 'Team ID to use')
  .option('-o, --output-dir <path>', 'Output directory for pulled files', './schemory')
  .option('-f, --force', 'Overwrite existing config file')
  .option('-i, --interactive', 'Interactive setup')
  .action(async (options: InitOptions) => {
    const spinner = ora();

    // Check if config already exists
    if (!(options.force || options.interactive) && await hasConfig()) {
      try {
        const config = await readConfig();
        console.log(`✅ Already initialized with:`);
        console.log(`   Vault URL: ${config.vaultUrl}`);
        console.log(`   Team ID: ${config.teamId}`);
        console.log(`   Output Dir: ${config.outputDir}`);
        console.log(`\nUse --force to overwrite.`);
        return;
      } catch {
        // Ignore and continue
      }
    }

    let vaultUrl = options.vaultUrl;
    let teamId = options.teamId;

    // Interactive mode
    if (options.interactive || !vaultUrl || !teamId) {
      if (vaultUrl) {
        console.log(`Using vault URL: ${vaultUrl}`);
      } else {
        const urlPrompt = await prompt({
          type: 'input',
          name: 'vaultUrl',
          message: 'Enter your Schemory vault server URL:',
          initial: 'http://localhost:5555',
        });
        vaultUrl = urlPrompt.vaultUrl as string;
      }

      if (teamId) {
        console.log(`Using team ID: ${teamId}`);
      } else {
        const teamPrompt = await prompt({
          type: 'input',
          name: 'teamId',
          message: 'Enter your team ID:',
        });
        teamId = teamPrompt.teamId as string;
      }

      const outputPrompt = await prompt({
        type: 'input',
        name: 'outputDir',
        message: 'Enter output directory for schemas and types:',
        initial: options.outputDir,
      });
      options.outputDir = outputPrompt.outputDir as string;
    }

    // Validate vault connection
    if (!options.force && !options.interactive) {
      spinner.start('🔍 Validating vault server...');
      try {
        const client = new SchemoryClient({ baseUrl: vaultUrl });
        await client.healthCheck();
        spinner.succeed('✅ Vault server is accessible');
      } catch (error: any) {
        spinner.fail(`❌ Could not connect to vault: ${error.message}`);
        console.log(`\nPlease check your vault URL: ${vaultUrl}`);
        process.exit(1);
      }
    }

    // Create config
    const config = {
      vaultUrl,
      teamId,
      outputDir: options.outputDir,
    };

    try {
      const configPath = await writeConfig(config);
      console.log(`✅ Created ${configPath}`);
      console.log(`\n📋 Configuration:`);
      console.log(`   Vault URL: ${vaultUrl}`);
      console.log(`   Team ID: ${teamId}`);
      console.log(`   Output Dir: ${options.outputDir}`);
      console.log(`\n🚀 Next steps:`);
      console.log(`   Run 'npx schemory-vault pull' to fetch schemas and types`);
      console.log(`   Run 'npx schemory-vault push' to upload your schemas and types`);
    } catch (error: any) {
      console.error(`❌ Failed to create config: ${error.message}`);
      process.exit(1);
    }
  });
