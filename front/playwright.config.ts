import { defineConfig, devices } from '@playwright/test';
import { E2E_DATABASE_URL } from './tests/e2e/db-url';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: process.env.CI ? 60_000 : 30_000,
  retries: process.env.CI ? 1 : 0,
  // 実 DB を共有し reset+seed するため直列実行にする。
  workers: 1,
  fullyParallel: false,
  // 起動済みの E2E 用 DB へ Prisma スキーマを適用する。
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    // dev サーバーを E2E 用 DB（docker-compose.e2e.yml）へ接続する。
    // シェルで設定した DATABASE_URL は .env より優先される。
    command: `E2E_BYPASS=1 DATABASE_URL=${E2E_DATABASE_URL} pnpm dev`,
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
