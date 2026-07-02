import { Command } from 'commander';
import { readConfig, getOutputDir } from '../config/rc-file';
import { SchemoryClient } from '../api/client';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { glob } from 'glob';
import ora from 'ora';
import { minimatch } from 'minimatch';

interface StatusOptions {
  verbose: boolean;
}

/**
 * Get all files in a directory matching patterns
 */
async function getLocalFiles(
  patterns: string[],
  ignorePatterns: string[],
  baseDir: string
): Promise<string[]> {
  const files: string[] = [];
  
  for (const pattern of patterns) {
    const matchedFiles = await glob(pattern, {
      cwd: baseDir,
      ignore: ignorePatterns,
      nodir: true,
    });
    files.push(...matchedFiles);
  }
  
  return files.filter(file => !isIgnored(file, ignorePatterns));
}

function isIgnored(filePath: string, ignorePatterns: string[] = []): boolean {
  for (const pattern of ignorePatterns) {
    if (minimatch(filePath, pattern)) {
      return true;
    }
  }
  return false;
}

export const statusCommand = new Command()
  .name('status')
  .description('Show the status of schemas and types (what has changed)')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options: StatusOptions) => {
    const spinner = ora();
    
    try {
      const config = await readConfig();
      const client = new SchemoryClient({
        baseUrl: config.vaultUrl,
        teamId: config.teamId,
      });
      
      spinner.start('🔍 Checking vault status...');
      await client.healthCheck();
      spinner.succeed('✅ Connected to vault');
      
      const { schemas: remoteSchemas } = await client.listSchemas();
      const { types: remoteTypes } = await client.listTypes();
      
      const outputDir = getOutputDir(config);
      
      // Get local schemas
      const schemaPatterns = config.schemas?.pull || ['*.schema.json', '*.json'];
      const schemaIgnorePatterns = config.schemas?.ignore || [];
      const localSchemas = await getLocalFiles(
        schemaPatterns,
        [...schemaIgnorePatterns, ...(config.types?.ignore || [])],
        outputDir
      );
      
      // Get local types
      const typePatterns = config.types?.pull || ['*.d.ts'];
      const typeIgnorePatterns = config.types?.ignore || [];
      const localTypes = await getLocalFiles(
        typePatterns,
        [...typeIgnorePatterns, ...(config.schemas?.ignore || [])],
        outputDir
      );
      
      // Compare schemas
      const remoteSchemaFiles = remoteSchemas.map(s => s.fileName);
      const newSchemas = remoteSchemaFiles.filter(f => !localSchemas.includes(f));
      const deletedSchemas = localSchemas.filter(f => !remoteSchemaFiles.includes(f));
      const unchangedSchemas = remoteSchemaFiles.filter(f => localSchemas.includes(f));
      
      // Compare types
      const remoteTypeFiles = remoteTypes.map(t => t.fileName);
      const newTypes = remoteTypeFiles.filter(f => !localTypes.includes(f));
      const deletedTypes = localTypes.filter(f => !remoteTypeFiles.includes(f));
      const unchangedTypes = remoteTypeFiles.filter(f => localTypes.includes(f));
      
      console.log('\n📊 Status Summary:\n');
      
      console.log('📄 Schemas:');
      console.log(`   New (remote):     ${newSchemas.length}`);
      console.log(`   Deleted (local): ${deletedSchemas.length}`);
      console.log(`   Unchanged:       ${unchangedSchemas.length}`);
      console.log(`   Total remote:    ${remoteSchemas.length}`);
      console.log(`   Total local:     ${localSchemas.length}`);
      
      console.log('\n🏷️  Type Definitions:');
      console.log(`   New (remote):     ${newTypes.length}`);
      console.log(`   Deleted (local): ${deletedTypes.length}`);
      console.log(`   Unchanged:       ${unchangedTypes.length}`);
      console.log(`   Total remote:    ${remoteTypes.length}`);
      console.log(`   Total local:     ${localTypes.length}`);
      
      const hasChanges = newSchemas.length > 0 || deletedSchemas.length > 0 || 
                         newTypes.length > 0 || deletedTypes.length > 0;
      
      if (!hasChanges) {
        console.log('\n✅ Everything is up to date!');
      } else {
        console.log('\n🔄 You have changes to sync:');
        
        if (newSchemas.length > 0 || newTypes.length > 0) {
          console.log(`   Run 'npx schemory-vault pull' to get ${newSchemas.length + newTypes.length} new items`);
        }
        if (deletedSchemas.length > 0 || deletedTypes.length > 0) {
          console.log(`   Run 'npx schemory-vault push' to upload ${deletedSchemas.length + deletedTypes.length} local items`);
        }
      }
      
      // Verbose output
      if (options.verbose) {
        if (newSchemas.length > 0) {
          console.log('\n🆕 New schemas on remote:');
          for (const schema of newSchemas) {
            console.log(`   + ${schema}`);
          }
        }
        
        if (deletedSchemas.length > 0) {
          console.log('\n🗑️  Deleted schemas on local:');
          for (const schema of deletedSchemas) {
            console.log(`   - ${schema}`);
          }
        }
        
        if (newTypes.length > 0) {
          console.log('\n🆕 New type definitions on remote:');
          for (const type of newTypes) {
            console.log(`   + ${type}`);
          }
        }
        
        if (deletedTypes.length > 0) {
          console.log('\n🗑️  Deleted type definitions on local:');
          for (const type of deletedTypes) {
            console.log(`   - ${type}`);
          }
        }
      }
      
    } catch (error: any) {
      spinner.fail(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });
