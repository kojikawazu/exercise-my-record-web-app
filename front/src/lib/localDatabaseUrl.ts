// DB 接続先が「ローカル」かを判定する唯一の入口（.claude/rules/production-data.md）。
// テスト DB のガード（tests/setup/test-database-url.ts）と、`next dev` 起動時のガード
// （next.config.ts）が同じ allowlist を参照する。失敗時の案内文は用途ごとに呼び出し側で組み立てる。

/**
 * ローカルとみなすホスト。WHATWG URL は IPv6 の `hostname` を角括弧付き（`[::1]`）で返すため、
 * 両方の表記を列挙する。
 */
const LOCAL_DATABASE_HOSTS: readonly string[] = ['localhost', '127.0.0.1', '::1', '[::1]'];

/** 接続先の判定結果。 */
export type LocalDatabaseUrlCheck =
  /** ホストが allowlist に含まれる */
  | { ok: true }
  /** URL として解釈できない（空文字を含む） */
  | { ok: false; reason: 'invalid' }
  /** ホストが allowlist 外。`host` は案内用のホスト名（資格情報は含まない） */
  | { ok: false; reason: 'remote'; host: string };

/**
 * 接続文字列のホストがローカル（allowlist）かを判定する。例外は投げない。
 *
 * @param url - 判定する接続文字列
 * @returns 判定結果。リモートの場合は解決されたホスト名を含む
 */
export function checkLocalDatabaseUrl(url: string): LocalDatabaseUrlCheck {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  return LOCAL_DATABASE_HOSTS.includes(host) ? { ok: true } : { ok: false, reason: 'remote', host };
}

/** 開発用 DB（ローカル Supabase）の起動コマンド。ガード失敗時の復旧手順として案内する。 */
const DEV_DB_UP_COMMAND = 'pnpm run dev:db:up';

/**
 * `next dev` の起動時に、アプリの接続先（`DATABASE_URL`）がローカルであることを検証する。
 * 手元の `.env` に本番の接続情報が残っていると、画面操作がそのまま本番データを書き換えるため、
 * サーバーを起動する前に止める。
 *
 * `DATABASE_URL` が未設定・空のときは通す（API が 503 を返すフォールバック動作で、本番には接続しない）。
 *
 * @param env - 参照する環境変数。既定は `process.env`（UT では任意のオブジェクトを渡す）
 * @throws {Error} `DATABASE_URL` が URL として不正、またはローカル以外を指している場合。
 *   メッセージには解決されたホスト名と復旧手順を含める（接続文字列全体は資格情報を含むため出さない）
 */
export function assertDevDatabaseUrl(
  env: Readonly<Record<string, string | undefined>> = process.env,
): void {
  const url = env.DATABASE_URL;
  if (!url) return;

  const result = checkLocalDatabaseUrl(url);
  if (result.ok) return;

  const target = result.reason === 'remote' ? `host: ${result.host}` : 'URL として解釈できません';
  throw new Error(
    `[dev-db-guard] next dev の DATABASE_URL がローカルではありません（${target}）。` +
      `本番データ保護のため起動を中断します。` +
      `\`${DEV_DB_UP_COMMAND}\` でローカル Supabase を起動し、front/.env を .env.example の` +
      `ローカル既定値に戻してください（本番の接続情報は PROD_* の別変数で .env.prod に置く）。`,
  );
}
