import type { Metadata } from 'next';
import TrendsClient from '@/components/TrendsClient';
import { parseTrendPeriod } from '@/lib/trends';

/** 推移グラフページの props。 */
type PageProps = {
  /** URL クエリ。`period` に期間（`1w` / `1m` / `3m` / `all`）を含み得る Promise。 */
  searchParams: Promise<{ period?: string | string[] }>;
};

/** 推移グラフページのメタデータ（ブラウザタブのタイトル）。 */
export const metadata: Metadata = {
  title: '推移グラフ',
};

/**
 * 推移グラフ画面。クエリ `period` をサーバー側で解釈し（未指定・不正は `1m`）、グラフの描画と
 * 期間の切替を担う Client Component `TrendsClient` へ渡す。期間の起点日はブラウザのローカル
 * 日付で決めさせる（サーバーの UTC で決めると日付がずれるため）。
 */
export default async function TrendsPage({ searchParams }: PageProps) {
  const { period } = await searchParams;
  return <TrendsClient period={parseTrendPeriod(period)} />;
}
