import { defineConfig } from 'vitest/config';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
