import type { Metadata } from 'next';
import CalendarClient from '@/components/CalendarClient';
import { parseMonthParam } from '@/lib/calendar';

/** カレンダーページの props。 */
type PageProps = {
  /** URL クエリ。`month` に表示する月（`YYYY-MM`）を含み得る Promise。 */
  searchParams: Promise<{ month?: string | string[] }>;
};

/** カレンダーページのメタデータ（ブラウザタブのタイトル）。 */
export const metadata: Metadata = {
  title: 'カレンダー',
};

/**
 * カレンダー画面（月表示）。クエリ `month` をサーバー側で検証し、月グリッドの描画と月移動を
 * 担う Client Component `CalendarClient` へ渡す。未指定・不正な値は `null` として渡し、
 * 「今月」の決定はブラウザのローカル日付で行わせる（サーバーの UTC で決めると日付がずれるため）。
 */
export default async function CalendarPage({ searchParams }: PageProps) {
  const { month } = await searchParams;
  return <CalendarClient month={parseMonthParam(month)} />;
}
