#!/usr/bin/env node
// Schemory CLI entry point
// This is the bin entry point that runs the CLI

import { createCLI } from './cli.js';

const program = createCLI();

(async () => {
  try {
    await program.parseAsync(process.argv);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error: ${message}`);
    process.exit(1);
  }
})();
