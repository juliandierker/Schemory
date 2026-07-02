import { Command } from 'commander';
import { readConfig } from '../config/rc-file';
import { SchemoryClient } from '../api/client';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import archiver from 'archiver';
import ora from 'ora';

interface ExportOptions {
  team: string;
  output: string;
  format: 'zip' | 'dir';
  includeHistory: boolean;
  verbose: boolean;
  schema: string;
  type: string;
}

/**
 * Create a ZIP archive of all schemas and types for a team
 */
async function exportToZip(
  client: SchemoryClient,
  teamId: string,
  outputPath: string,
  includeHistory: boolean,
  spinner: any
): Promise<string> {
  const tempDir = join(process.cwd(), '.schemory-export-temp');
  await mkdir(tempDir, { recursive: true });
  
  try {
    // Create manifest
    const manifest = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      schemoryVersion: '0.1.0',
      team: { id: teamId },
      contents: {
        schemas: 0,
        types: 0,
      },
    };
    
    // Fetch schemas
    spinner.text = '📥 Fetching schemas...';
    const { schemas } = await client.listSchemas(teamId);
    manifest.contents.schemas = schemas.length;
    
    // Write schemas
    const schemasDir = join(tempDir, 'schemas');
    await mkdir(schemasDir, { recursive: true });
    
    for (const schema of schemas) {
      const filePath = join(schemasDir, schema.fileName);
      await mkdir(join(schemasDir, schema.fileName, '..'), { recursive: true });
      await writeFile(filePath, schema.content, 'utf-8');
    }
    
    // Fetch types
    spinner.text = '📥 Fetching type definitions...';
    const { types } = await client.listTypes(teamId);
    manifest.contents.types = types.length;
    
    // Write types
    const typesDir = join(tempDir, 'types');
    await mkdir(typesDir, { recursive: true });
    
    for (const type of types) {
      const filePath = join(typesDir, type.fileName);
      await mkdir(join(typesDir, type.fileName, '..'), { recursive: true });
      await writeFile(filePath, type.content, 'utf-8');
    }
    
    // Write manifest
    const manifestPath = join(tempDir, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    
    // Calculate total size
    let totalSize = 0;
    
    // Create ZIP archive
    spinner.text = '📦 Creating ZIP archive...';
    
    return new Promise((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => {
        spinner.succeed(`✅ Exported to ${outputPath} (${archive.pointer()} bytes)`);
        resolve(outputPath);
      });
      
      archive.on('error', (err: any) => {
        reject(err);
      });
      
      archive.pipe(output);
      archive.directory(tempDir, false);
      archive.finalize();
    });
    
  } finally {
    // Cleanup temp directory (in the background)
    setTimeout(async () => {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }, 1000);
  }
}

/**
 * Export to directory (unzipped)
 */
async function exportToDir(
  client: SchemoryClient,
  teamId: string,
  outputDir: string,
  spinner: any
): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  
  // Create manifest
  const manifest = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    schemoryVersion: '0.1.0',
    team: { id: teamId },
    contents: {
      schemas: 0,
      types: 0,
    },
  };
  
  // Fetch and write schemas
  spinner.text = '📥 Fetching schemas...';
  const { schemas } = await client.listSchemas(teamId);
  manifest.contents.schemas = schemas.length;
  
  const schemasDir = join(outputDir, 'schemas');
  await mkdir(schemasDir, { recursive: true });
  
  for (const schema of schemas) {
    const filePath = join(schemasDir, schema.fileName);
    await mkdir(join(schemasDir, schema.fileName, '..'), { recursive: true });
    await writeFile(filePath, schema.content, 'utf-8');
  }
  
  // Fetch and write types
  spinner.text = '📥 Fetching type definitions...';
  const { types } = await client.listTypes(teamId);
  manifest.contents.types = types.length;
  
  const typesDir = join(outputDir, 'types');
  await mkdir(typesDir, { recursive: true });
  
  for (const type of types) {
    const filePath = join(typesDir, type.fileName);
    await mkdir(join(typesDir, type.fileName, '..'), { recursive: true });
    await writeFile(filePath, type.content, 'utf-8');
  }
  
  // Write manifest
  const manifestPath = join(outputDir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  
  spinner.succeed(`✅ Exported to ${outputDir}`);
  return outputDir;
}

// Import rm from fs/promises for cleanup
import { rm } from 'node:fs/promises';

export const exportCommand = new Command()
  .name('export')
  .description('Export schemas and types from the vault')
  .option('-t, --team <id>', 'Team ID to export (overrides config)')
  .option('-o, --output <path>', 'Output file or directory', 'backup.zip')
  .option('--format <format>', 'Export format: zip or dir', 'zip')
  .option('--include-history', 'Include version history')
  .option('-v, --verbose', 'Show detailed output')
  .option('--schema <name>', 'Export a single schema')
  .option('--type <name>', 'Export a single type definition')
  .action(async (options: ExportOptions) => {
    const spinner = ora();
    
    try {
      const config = await readConfig();
      const teamId = options.team || config.teamId;
      
      const client = new SchemoryClient({
        baseUrl: config.vaultUrl,
        teamId,
      });
      
      spinner.start('🔍 Connecting to vault...');
      await client.healthCheck();
      spinner.succeed('✅ Connected to vault');
      
      const outputPath = options.output;
      const isZip = options.format === 'zip' || outputPath.endsWith('.zip');
      
      if (options.schema) {
        // Export single schema
        spinner.start(`📥 Exporting schema: ${options.schema}`);
        
        // Find schema by fileName
        const { schemas } = await client.listSchemas(teamId);
        const schema = schemas.find(s => s.fileName === options.schema || s.name === options.schema);
        
        if (!schema) {
          spinner.fail(`❌ Schema not found: ${options.schema}`);
          process.exit(1);
        }
        
        const filePath = join(process.cwd(), schema.fileName);
        await writeFile(filePath, schema.content, 'utf-8');
        spinner.succeed(`✅ Exported schema to ${schema.fileName}`);
        
      } else if (options.type) {
        // Export single type
        spinner.start(`📥 Exporting type: ${options.type}`);
        
        const { types } = await client.listTypes(teamId);
        const type = types.find(t => t.fileName === options.type || t.name === options.type);
        
        if (!type) {
          spinner.fail(`❌ Type definition not found: ${options.type}`);
          process.exit(1);
        }
        
        const filePath = join(process.cwd(), type.fileName);
        await writeFile(filePath, type.content, 'utf-8');
        spinner.succeed(`✅ Exported type to ${type.fileName}`);
        
      } else {
        // Export all
        if (isZip) {
          await exportToZip(client, teamId, outputPath, options.includeHistory, spinner);
        } else {
          await exportToDir(client, teamId, outputPath, spinner);
        }
        
        console.log(`\n📦 Export contains:`);
        console.log(`   - manifest.json (metadata)`);
        console.log(`   - schemas/ (all schema files)`);
        console.log(`   - types/ (all type definition files)`);
        console.log(`\n💡 To import: npx schemory-vault import --file ${outputPath}`);
      }
      
    } catch (error: any) {
      spinner.fail(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });
