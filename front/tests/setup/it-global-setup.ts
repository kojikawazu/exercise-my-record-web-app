import { execSync } from 'node:child_process';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

// IT で provide/inject する値の型を宣言する。
declare module 'vitest' {
  export interface ProvidedContext {
    /** Testcontainers で起動した PostgreSQL への接続文字列。 */
    DATABASE_URL: string;
  }
}

/** Vitest グローバルセットアップが受け取る最小コンテキスト（`provide` のみ使用）。 */
type SetupContext = {
  provide: (key: 'DATABASE_URL', value: string) => void;
};

/**
 * IT スイート全体で共有する PostgreSQL コンテナを 1 つ起動し、
 * Prisma スキーマを適用してから接続文字列を worker へ provide する。
 * 引数は Vitest のセットアップコンテキストで、`provide` のみ利用する。
 *
 * スキーマ適用は `prisma db push`（マイグレーション履歴不要）で行う。RLS は
 * Prisma（DATABASE_URL 直結）がバイパスするため IT では適用しない。
 *
 * @returns スイート終了時にコンテナを停止する teardown 関数
 */
export default async function setup({ provide }: SetupContext) {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const databaseUrl = container.getConnectionUri();

  // スキーマをコンテナへ反映（クライアント再生成はスキップ）。
  execSync('pnpm exec prisma db push --skip-generate --accept-data-loss', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });

  provide('DATABASE_URL', databaseUrl);

  return async () => {
    await container.stop();
  };
}
