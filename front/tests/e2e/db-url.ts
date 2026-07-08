// E2E 用 PostgreSQL（docker-compose.e2e.yml）の接続文字列。
// playwright.config.ts の webServer コマンド、global-setup、db ヘルパーで共有する。
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgresql://e2e:e2e@localhost:5433/e2e';
