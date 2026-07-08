import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // IT（*.it.test.ts）は vitest.it.config.ts（Testcontainers）、
    // E2E/シナリオ（Playwright）は tests/e2e・tests/scenario で実行するため UT からは除外する。
    exclude: ['tests/e2e/**', 'tests/scenario/**', 'node_modules/**', 'src/**/*.it.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
