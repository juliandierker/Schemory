import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';

// Zod schema for validation
import { z } from 'zod';

const SchemoryConfigSchema = z.object({
  vaultUrl: z.string().url(),
  teamId: z.string().min(1),
  schemas: z.object({
    pull: z.array(z.string()).optional(),
    push: z.array(z.string()).optional(),
    ignore: z.array(z.string()).optional(),
  }).optional(),
  types: z.object({
    pull: z.array(z.string()).optional(),
    push: z.array(z.string()).optional(),
    ignore: z.array(z.string()).optional(),
  }).optional(),
  outputDir: z.string().optional(),
  cli: z.object({
    autoPull: z.boolean().optional(),
    watch: z.boolean().optional(),
  }).optional(),
});

export type SchemoryConfig = z.infer<typeof SchemoryConfigSchema>;

export interface ResolvedSchemoryConfig extends SchemoryConfig {
  outputDir: string;
}

const DEFAULT_CONFIG: Partial<SchemoryConfig> = {
  outputDir: './schemory',
  schemas: {
    pull: ['*.schema.json', '*.json'],
    push: ['*.schema.json', '*.json'],
    ignore: ['node_modules/**', '.git/**'],
  },
  types: {
    pull: ['*.d.ts'],
    push: ['*.d.ts'],
    ignore: ['node_modules/**', '.git/**'],
  },
  cli: {
    autoPull: false,
    watch: false,
  },
};

const CONFIG_FILE_NAME = '.schemoryrc';

/**
 * Find the .schemoryrc file starting from the current directory and moving up
 */
export async function findConfigPath(cwd: string = process.cwd()): Promise<string | null> {
  let currentDir = cwd;
  const root = dirname(currentDir);

  // Prevent infinite loop
  const maxDepth = 10;
  let depth = 0;

  while (currentDir !== root && depth < maxDepth) {
    const configPath = join(currentDir, CONFIG_FILE_NAME);
    try {
      await readFile(configPath, 'utf-8');
      return configPath;
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      currentDir = dirname(currentDir);
      depth++;
    }
  }

  // Check home directory
  try {
    const homeConfigPath = join(homedir(), CONFIG_FILE_NAME);
    await readFile(homeConfigPath, 'utf-8');
    return homeConfigPath;
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  return null;
}

/**
 * Read and parse the .schemoryrc file
 */
export async function readConfig(configPath?: string): Promise<ResolvedSchemoryConfig> {
  const path = configPath || (await findConfigPath());
  
  if (!path) {
    throw new Error(
      `Could not find ${CONFIG_FILE_NAME} file. ` +
      `Run 'npx schemory-vault init' to create one.`
    );
  }

  const content = await readFile(path, 'utf-8');
  const config = JSON.parse(content);
  
  // Validate and parse with defaults
  const parsed = SchemoryConfigSchema.parse(config);
  
  // Merge with defaults and resolve output directory
  const resolved: ResolvedSchemoryConfig = {
    ...DEFAULT_CONFIG,
    ...parsed,
    outputDir: parsed.outputDir || DEFAULT_CONFIG.outputDir!,
  };

  return resolved;
}

/**
 * Write a new .schemoryrc file
 */
export async function writeConfig(config: SchemoryConfig, path?: string): Promise<string> {
  const targetPath = path || join(process.cwd(), CONFIG_FILE_NAME);
  
  // Merge with defaults
  const fullConfig: SchemoryConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // Validate before writing
  SchemoryConfigSchema.parse(fullConfig);

  const content = JSON.stringify(fullConfig, null, 2);
  await writeFile(targetPath, content, 'utf-8');
  
  return targetPath;
}

/**
 * Check if a .schemoryrc file exists
 */
export async function hasConfig(cwd: string = process.cwd()): Promise<boolean> {
  try {
    const path = await findConfigPath(cwd);
    return path !== null;
  } catch {
    return false;
  }
}

/**
 * Get the resolved output directory for a config
 */
export function getOutputDir(config: ResolvedSchemoryConfig, cwd: string = process.cwd()): string {
  if (config.outputDir.startsWith('/')) {
    return config.outputDir;
  }
  return join(cwd, config.outputDir);
}
