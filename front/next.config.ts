import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
import { assertDevDatabaseUrl } from './src/lib/localDatabaseUrl';

const nextConfig: NextConfig = {
  reactCompiler: true,
};

/**
 * Next.js の設定を返す。`next dev` のときだけ、DB 接続先がローカルであることを先に検証する
 * （本番の `DATABASE_URL` を手元で使ったまま画面操作して本番データを書き換える事故を防ぐ）。
 * `next build` / `next start`（Vercel 含む）では検証しない。
 *
 * @param phase - Next.js が渡す実行フェーズ
 * @returns Next.js の設定
 * @throws {Error} `next dev` で `DATABASE_URL` がローカル以外を指している場合
 */
export default function config(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER) assertDevDatabaseUrl();
  return nextConfig;
}
