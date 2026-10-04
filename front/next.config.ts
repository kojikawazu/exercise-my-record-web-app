import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
import { assertDevDatabaseUrl } from './src/lib/localDatabaseUrl';
import { buildSecurityHeaders } from './src/lib/securityHeaders';

const nextConfig: NextConfig = {
  reactCompiler: true,
  // `next dev` が front/ 直下に AGENTS.md / CLAUDE.md を自動生成するのを止める。
  // エージェント向け指示の正本はリポジトリ直下の CLAUDE.md / AGENTS.md と .claude/rules/ であり、
  // front/ に別系統の指示を置くと正本が二重化するため（#138）。
  agentRules: false,
};

/**
 * Next.js の設定を返す。`next dev` のときだけ、DB 接続先がローカルであることを先に検証する
 * （本番の `DATABASE_URL` を手元で使ったまま画面操作して本番データを書き換える事故を防ぐ）。
 * `next build` / `next start`（Vercel 含む）では検証しない。
 *
 * 全レスポンスにセキュリティヘッダー（CSP 等）を付与する（#122）。`'unsafe-eval'` は `next dev` のときだけ許可する。
 *
 * @param phase - Next.js が渡す実行フェーズ
 * @returns Next.js の設定
 * @throws {Error} `next dev` で `DATABASE_URL` がローカル以外を指している場合
 */
export default function config(phase: string): NextConfig {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  if (isDev) assertDevDatabaseUrl();
  const securityHeaders = buildSecurityHeaders({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    isDev,
  });
  return {
    ...nextConfig,
    headers: () => Promise.resolve([{ source: '/:path*', headers: securityHeaders }]),
  };
}
