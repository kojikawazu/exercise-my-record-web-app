import { defineConfig } from 'vitest/config';
import path from 'path';

// IT（統合テスト）専用の Vitest 設定。
// - Testcontainers の PostgreSQL に対して実 Prisma 経由で Route Handler を検証する。
// - UT（vitest.config.ts）とはファイル命名（*.it.test.ts）で分離する。
// - 単一 fork で全 IT を直列実行し、コンテナ/接続を共有する。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.it.test.ts'],
    globalSetup: ['./src/test/it-global-setup.ts'],
    setupFiles: ['./src/test/it-setup.ts'],
    // 共有する実 DB を TRUNCATE で奪い合わないよう、テストファイルを直列実行する。
    fileParallelism: false,
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
