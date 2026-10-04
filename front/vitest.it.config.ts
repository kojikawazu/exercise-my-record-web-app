import { defineConfig } from 'vitest/config';
import path from 'path';

// IT（統合テスト）専用の Vitest 設定。
// - Testcontainers の PostgreSQL に対して実 Prisma 経由で Route Handler を検証する。
// - UT（vitest.config.ts）とは**ディレクトリ**（tests/it）で分離する。
//   ファイル名の .it. は「実 DB を要求するテスト」であることを一覧上でも示すために残す。
// - 単一 fork で全 IT を直列実行し、コンテナ/接続を共有する。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/it/**/*.it.test.ts'],
    globalSetup: ['./tests/setup/it-global-setup.ts'],
    setupFiles: ['./tests/setup/it-setup.ts'],
    // 共有する実 DB を TRUNCATE で奪い合わないよう、テストファイルを直列実行する。
    fileParallelism: false,
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // `server-only` は `react-server` 条件でのみ空モジュールに解決され、それ以外では import 時に throw する。
      // Vitest（node）はこの条件を持たないため、実物の lib/prisma・lib/adminAuth を読む IT では空モジュールに差し替える。
      // Client Component からの誤 import の検知は next build が担う（#114）。
      {
        find: /^server-only$/,
        replacement: path.resolve(__dirname, './node_modules/server-only/empty.js'),
      },
    ],
  },
});
