import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Use tsx for TypeScript support
    globals: true,
    environment: 'node',
    // Timeout for database operations
    testTimeout: 30000,
    // Setup files
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
