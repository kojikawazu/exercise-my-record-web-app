import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// UT（ユニットテスト）専用の Vitest 設定。
// テストは src にコロケートせず tests/ 配下へ集約する（.claude/rules/testing.md）。
// レベルの分離はファイル名ではなく**ディレクトリ**で行うため、include だけで完結し
// IT・E2E・シナリオを exclude で除外する必要がない。
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup/setup.ts'],
    globals: true,
    include: ['tests/unit/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
