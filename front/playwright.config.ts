import { defineConfig, devices } from '@playwright/test';
import { resolveTestDatabaseUrl } from './tests/setup/test-database-url';

// 接続先はローカル以外なら設定の読み込み時点で throw する（本番データ保護）。
const testDatabaseUrl = resolveTestDatabaseUrl();

export default defineConfig({
  timeout: process.env.CI ? 60_000 : 30_000,
  retries: process.env.CI ? 1 : 0,
  // 実 DB を共有し reset+seed するため直列実行にする。
  workers: 1,
  fullyParallel: false,
  // 起動済みの E2E 用 DB へ Prisma スキーマを適用する（e2e / scenario 共通）。
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    // dev サーバーを E2E 用 DB（docker-compose.e2e.yml）へ接続する。
    // シェルで設定した DATABASE_URL は .env より優先される。
    command: `E2E_BYPASS=1 DATABASE_URL=${testDatabaseUrl} pnpm dev`,
    url: 'http://localhost:3000',
    // 既存サーバーを再利用しない。手元の `pnpm dev` は .env（本番 DB）に接続しているため、
    // 再利用すると画面からの作成・削除が本番に対して実行される。3000 番が使用中なら起動に失敗して止まる。
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      // 単機能フローの E2E（tests/e2e）。
      name: 'e2e',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // 複数機能横断のユーザージャーニー（tests/scenario）。
      name: 'scenario',
      testDir: './tests/scenario',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
