import { execSync } from 'node:child_process';
import { resolveTestDatabaseUrl } from '../setup/test-database-url';
import { disconnectDb } from './db';

/**
 * E2E 実行前に、起動済みの E2E 用 PostgreSQL（docker-compose.e2e.yml）へ
 * Prisma スキーマを適用する。
 *
 * DB コンテナ自体は Playwright の外（`pnpm run e2e:db:up` / CI ステップ）で起動する。
 * ここではスキーマ同期のみを行い、データ投入は各テストの beforeEach に任せる。
 *
 * @returns Playwright の globalTeardown 相当（Prisma 接続の後始末）
 */
export default async function globalSetup() {
  // `db push --accept-data-loss` の前に接続先を検証する（ローカル以外なら throw）。
  const databaseUrl = resolveTestDatabaseUrl();
  execSync('pnpm exec prisma db push --skip-generate --accept-data-loss', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });

  return async () => {
    await disconnectDb();
  };
}
