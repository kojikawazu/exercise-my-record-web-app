// IT / E2E が使う DB 接続先の唯一の入口（.claude/rules/testing.md「テスト用 DB の接続先（破壊防止）」）。
// seed・TRUNCATE・`prisma db push --accept-data-loss` はテーブルを全消去するため、
// 接続先がローカル以外を指していたら**接続する前に**失敗させる。

import { checkLocalDatabaseUrl } from '@/lib/localDatabaseUrl';

/** 上書きに使うテスト専用の環境変数名。本番用の `DATABASE_URL` とは必ず別名にする。 */
const TEST_DATABASE_URL_ENV = 'TEST_DATABASE_URL';

/** 既定の接続先。`docker-compose.e2e.yml` の E2E 用 PostgreSQL（ポート 5433）。 */
export const DEFAULT_TEST_DATABASE_URL = 'postgresql://e2e:e2e@localhost:5433/e2e';

/** テスト DB の起動コマンド。ガード失敗時の復旧手順として案内する。 */
const TEST_DB_UP_COMMAND = 'pnpm run e2e:db:up';

/**
 * 接続文字列がローカルホストを指していることを検証する。seed / migrate / TRUNCATE の前に呼ぶ。
 * 判定（allowlist）は `checkLocalDatabaseUrl` に委ね、ここではテスト向けの案内文だけを組み立てる。
 *
 * @param url - 検証する接続文字列
 * @returns 検証済みの接続文字列（引数と同じ値）
 * @throws {Error} URL として解釈できない場合、またはホストが allowlist 外の場合。
 *   メッセージには解決されたホスト名と復旧手順を含める（接続文字列全体は資格情報を含むため出さない）
 */
export function assertLocalDatabaseUrl(url: string): string {
  const result = checkLocalDatabaseUrl(url);
  if (result.ok) return url;

  if (result.reason === 'invalid') {
    throw new Error(
      `[test-db-guard] テスト DB の接続先を URL として解釈できません。` +
        `${TEST_DATABASE_URL_ENV} を確認してください（既定: ${DEFAULT_TEST_DATABASE_URL}）。`,
    );
  }

  throw new Error(
    `[test-db-guard] テスト DB の接続先がローカルではありません（host: ${result.host}）。` +
      `本番データ保護のため中断します。` +
      `テスト DB を \`${TEST_DB_UP_COMMAND}\` で起動し、${TEST_DATABASE_URL_ENV} を未設定にするか` +
      ` ${DEFAULT_TEST_DATABASE_URL} を指定してください。`,
  );
}

/**
 * テスト DB の接続先を解決し、ローカルであることを検証して返す。
 *
 * `DATABASE_URL` は**参照しない**。Prisma の import 時に `.env`（本番 URL）が
 * `process.env` へ読み込まれるため、フォールバック先にすると本番を拾う。
 *
 * @param env - 参照する環境変数。既定は `process.env`（UT では任意のオブジェクトを渡す）
 * @returns 検証済みの接続文字列
 * @throws {Error} 解決した接続先がローカル以外、または URL として不正な場合
 */
export function resolveTestDatabaseUrl(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const override = env[TEST_DATABASE_URL_ENV];
  return assertLocalDatabaseUrl(override ? override : DEFAULT_TEST_DATABASE_URL);
}
