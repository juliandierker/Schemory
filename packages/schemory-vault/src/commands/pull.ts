import { Command } from 'commander';
import { readConfig, getOutputDir } from '../config/rc-file';
import { SchemoryClient } from '../api/client';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { glob } from 'glob';
import ora from 'ora';
import { minimatch } from 'minimatch';

interface PullOptions {
  force: boolean;
  verbose: boolean;
  dryRun: boolean;
  schemasOnly: boolean;
  typesOnly: boolean;
  output: string;
}

/**
 * Check if a file should be overwritten
 */
async function shouldOverwrite(filePath: string, options: PullOptions): Promise<boolean> {
  if (options.force) return true;
  
  // For now, just overwrite if force is true
  // In the future, we could add interactive prompt
  return options.force;
}

/**
 * Write a schema or type to file
 */
async function writeToFile(
  filePath: string,
  content: string,
  options: PullOptions
): Promise<{ path: string; overwritten: boolean }> {
  const fullPath = join(process.cwd(), filePath);
  const dir = join(fullPath, '..');
  
  // Create directory if it doesn't exist
  await mkdir(dir, { recursive: true });
  
  // Check if file exists
  let exists = false;
  try {
    await writeFile(fullPath, '', 'utf-8');
  } catch {
    // File doesn't exist, we'll create it
  }
  
  try {
    await writeFile(fullPath, content, 'utf-8');
    return { path: fullPath, overwritten: exists };
  } catch (error: any) {
    throw new Error(`Failed to write file ${fullPath}: ${error.message}`);
  }
}

export const pullCommand = new Command()
  .name('pull')
  .description('Pull schemas and types from the vault')
  .option('-f, --force', 'Overwrite local changes without prompting')
  .option('-v, --verbose', 'Show detailed output')
  .option('--dry-run', 'Preview changes without applying')
  .option('--schemas-only', 'Only pull schemas (no types)')
  .option('--types-only', 'Only pull types (no schemas)')
  .option('-o, --output <path>', 'Output directory (overrides config)')
  .action(async (options: PullOptions) => {
    const spinner = ora();
    
    try {
      // Read config
      const config = await readConfig();
      const outputDir = options.output || getOutputDir(config);
      
      spinner.start('📥 Reading configuration...');
      if (options.verbose) {
        console.log(`Vault URL: ${config.vaultUrl}`);
        console.log(`Team ID: ${config.teamId}`);
        console.log(`Output Dir: ${outputDir}`);
      }
      
      // Initialize client
      const client = new SchemoryClient({
        baseUrl: config.vaultUrl,
        teamId: config.teamId,
      });
      
      // Check server health
      spinner.text = '🔍 Checking vault server...';
      await client.healthCheck();
      spinner.succeed('✅ Connected to vault');
      
      // Pull schemas
      let schemasPulled = 0;
      if (!options.typesOnly) {
        spinner.start('📥 Pulling schemas...');
        const { schemas } = await client.listSchemas();
        
        for (const schema of schemas) {
          if (options.verbose) {
            console.log(`  → ${schema.fileName}`);
          }
          
          if (options.dryRun) {
            console.log(`  [DRY RUN] Would create: ${join(outputDir, schema.fileName)}`);
            schemasPulled++;
            continue;
          }
          
          const filePath = join(outputDir, schema.fileName);
          const result = await writeToFile(filePath, schema.content, options);
          
          if (options.verbose) {
            console.log(`  ✅ Created: ${result.path}`);
          }
          schemasPulled++;
        }
        
        if (schemas.length > 0) {
          spinner.succeed(`✅ Pulled ${schemasPulled} schemas`);
        } else {
          spinner.info('ℹ️  No schemas to pull');
        }
      }
      
      // Pull types
      let typesPulled = 0;
      if (!options.schemasOnly) {
        spinner.start('📥 Pulling type definitions...');
        const { types } = await client.listTypes();
        
        for (const type of types) {
          if (options.verbose) {
            console.log(`  → ${type.fileName}`);
          }
          
          if (options.dryRun) {
            console.log(`  [DRY RUN] Would create: ${join(outputDir, type.fileName)}`);
            typesPulled++;
            continue;
          }
          
          const filePath = join(outputDir, type.fileName);
          const result = await writeToFile(filePath, type.content, options);
          
          if (options.verbose) {
            console.log(`  ✅ Created: ${result.path}`);
          }
          typesPulled++;
        }
        
        if (types.length > 0) {
          spinner.succeed(`✅ Pulled ${typesPulled} type definitions`);
        } else {
          spinner.info('ℹ️  No type definitions to pull');
        }
      }
      
      const total = schemasPulled + typesPulled;
      if (options.dryRun) {
        console.log(`\n📊 Dry run complete: Would pull ${total} files`);
      } else if (total > 0) {
        console.log(`\n✅ Successfully pulled ${total} files to ${outputDir}`);
      } else {
        console.log('ℹ️  No files to pull');
      }
      
    } catch (error: any) {
      spinner.fail(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });
