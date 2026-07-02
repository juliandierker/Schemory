import { Command } from 'commander';
import { readConfig, getOutputDir } from '../config/rc-file';
import { SchemoryClient } from '../api/client';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { glob } from 'glob';
import ora from 'ora';
import { minimatch } from 'minimatch';

interface PushOptions {
  message: string;
  force: boolean;
  verbose: boolean;
  dryRun: boolean;
  schemasOnly: boolean;
  typesOnly: boolean;
  from: string;
}

/**
 * Check if a file path matches any of the ignore patterns
 */
function isIgnored(filePath: string, ignorePatterns: string[] = []): boolean {
  for (const pattern of ignorePatterns) {
    if (minimatch(filePath, pattern)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a file path matches any of the include patterns
 */
function matchesPattern(filePath: string, patterns: string[] = []): boolean {
  if (patterns.length === 0) {
    return true; // No patterns means include all
  }
  
  for (const pattern of patterns) {
    if (minimatch(filePath, pattern)) {
      return true;
    }
  }
  return false;
}

/**
 * Find files matching the push patterns
 */
async function findFilesToPush(
  patterns: string[],
  ignorePatterns: string[],
  baseDir: string
): Promise<{ filePath: string; relativePath: string }[]> {
  const files: { filePath: string; relativePath: string }[] = [];
  
  // Expand each pattern
  for (const pattern of patterns) {
    const matchedFiles = await glob(pattern, {
      cwd: baseDir,
      ignore: ignorePatterns,
      nodir: true,
    });
    
    for (const relativePath of matchedFiles) {
      // Skip ignored files
      if (isIgnored(relativePath, ignorePatterns)) {
        continue;
      }
      
      // Check if file matches any push pattern
      if (matchesPattern(relativePath, patterns)) {
        const fullPath = join(baseDir, relativePath);
        files.push({ filePath: fullPath, relativePath });
      }
    }
  }
  
  return files;
}

/**
 * Determine if a file is a TypeScript type definition (.d.ts) or JSON schema
 */
function getFileType(filePath: string): 'schema' | 'type' {
  if (filePath.endsWith('.d.ts')) {
    return 'type';
  }
  if (filePath.endsWith('.json') || filePath.includes('.schema.')) {
    return 'schema';
  }
  // Default to schema
  return 'schema';
}

export const pushCommand = new Command()
  .name('push')
  .description('Push schemas and types to the vault')
  .option('-m, --message <message>', 'Commit message for the push')
  .option('-f, --force', 'Overwrite remote files without prompting')
  .option('-v, --verbose', 'Show detailed output')
  .option('--dry-run', 'Preview changes without applying')
  .option('--schemas-only', 'Only push schemas (no types)')
  .option('--types-only', 'Only push types (no schemas)')
  .option('--from <path>', 'Source directory (overrides config)')
  .action(async (options: PushOptions) => {
    const spinner = ora();
    
    try {
      // Read config
      const config = await readConfig();
      const sourceDir = options.from || process.cwd();
      
      spinner.start('📤 Reading configuration...');
      if (options.verbose) {
        console.log(`Vault URL: ${config.vaultUrl}`);
        console.log(`Team ID: ${config.teamId}`);
        console.log(`Source Dir: ${sourceDir}`);
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
      
      // Push schemas
      let schemasPushed = 0;
      if (!options.typesOnly) {
        spinner.start('📤 Pushing schemas...');
        
        const patterns = config.schemas?.push || ['*.schema.json', '*.json'];
        const ignorePatterns = config.schemas?.ignore || [];
        
        const schemaFiles = await findFilesToPush(
          patterns,
          [...ignorePatterns, ...(config.types?.ignore || [])],
          sourceDir
        );
        
        // Filter to only schemas (not types)
        const schemaFilesOnly = schemaFiles.filter(f => getFileType(f.relativePath) === 'schema');
        
        if (schemaFilesOnly.length > 0) {
          for (const file of schemaFilesOnly) {
            if (options.verbose) {
              console.log(`  → ${file.relativePath}`);
            }
            
            if (options.dryRun) {
              console.log(`  [DRY RUN] Would upload: ${file.relativePath}`);
              schemasPushed++;
              continue;
            }
            
            const content = await readFile(file.filePath, 'utf-8');
            
            try {
              await client.createSchema({
                name: file.relativePath,
                fileName: file.relativePath,
                content,
              }, config.teamId);
              
              if (options.verbose) {
                console.log(`  ✅ Pushed: ${file.relativePath}`);
              }
              schemasPushed++;
            } catch (error: any) {
              if (error.message.includes('already exists')) {
                if (options.force) {
                  // Update existing
                  await client.updateSchema(
                    config.teamId,
                    file.relativePath,
                    { content }
                  );
                  if (options.verbose) {
                    console.log(`  🔄 Updated: ${file.relativePath}`);
                  }
                  schemasPushed++;
                } else {
                  spinner.warn(`⚠️  Skipped (already exists): ${file.relativePath}`);
                }
              } else {
                throw error;
              }
            }
          }
          spinner.succeed(`✅ Pushed ${schemasPushed} schemas`);
        } else {
          spinner.info('ℹ️  No schemas to push');
        }
      }
      
      // Push types
      let typesPushed = 0;
      if (!options.schemasOnly) {
        spinner.start('📤 Pushing type definitions...');
        
        const patterns = config.types?.push || ['*.d.ts'];
        const ignorePatterns = config.types?.ignore || [];
        
        const typeFiles = await findFilesToPush(
          patterns,
          [...ignorePatterns, ...(config.schemas?.ignore || [])],
          sourceDir
        );
        
        // Filter to only types (not schemas)
        const typeFilesOnly = typeFiles.filter(f => getFileType(f.relativePath) === 'type');
        
        if (typeFilesOnly.length > 0) {
          for (const file of typeFilesOnly) {
            if (options.verbose) {
              console.log(`  → ${file.relativePath}`);
            }
            
            if (options.dryRun) {
              console.log(`  [DRY RUN] Would upload: ${file.relativePath}`);
              typesPushed++;
              continue;
            }
            
            const content = await readFile(file.filePath, 'utf-8');
            
            try {
              await client.createType({
                name: file.relativePath,
                fileName: file.relativePath,
                content,
              }, config.teamId);
              
              if (options.verbose) {
                console.log(`  ✅ Pushed: ${file.relativePath}`);
              }
              typesPushed++;
            } catch (error: any) {
              if (error.message.includes('already exists')) {
                if (options.force) {
                  // Update existing
                  await client.updateType(
                    config.teamId,
                    file.relativePath,
                    { content }
                  );
                  if (options.verbose) {
                    console.log(`  🔄 Updated: ${file.relativePath}`);
                  }
                  typesPushed++;
                } else {
                  spinner.warn(`⚠️  Skipped (already exists): ${file.relativePath}`);
                }
              } else {
                throw error;
              }
            }
          }
          spinner.succeed(`✅ Pushed ${typesPushed} type definitions`);
        } else {
          spinner.info('ℹ️  No type definitions to push');
        }
      }
      
      const total = schemasPushed + typesPushed;
      if (options.dryRun) {
        console.log(`\n📊 Dry run complete: Would push ${total} files`);
      } else if (total > 0) {
        const message = options.message || `Pushed ${total} files`;
        console.log(`\n✅ Successfully pushed ${total} files${options.message ? ` (${message})` : ''}`);
      } else {
        console.log('ℹ️  No files to push');
      }
      
    } catch (error: any) {
      spinner.fail(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });
