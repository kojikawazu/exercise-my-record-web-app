import type { Metadata } from 'next';
import RecordDetailClient from '@/components/RecordDetailClient';

/** 記録詳細ページの props。動的セグメントの日付を非同期に受け取る。 */
type PageProps = {
  /** URL 動的セグメント。表示対象の記録日（`YYYY-MM-DD`）を含む Promise。 */
  params: Promise<{ date: string }>;
};

/** 記録詳細ページのメタデータ（ブラウザタブのタイトル）。 */
export const metadata: Metadata = {
  title: '記録詳細',
};

/**
 * 記録詳細画面。URL の日付セグメントを解決し、その日の記録（筋トレ・有酸素・体調メモ・
 * 推定消費カロリー）を表示するクライアントコンポーネント `RecordDetailClient` へ日付を渡す。
 * `params` は表示対象の記録日を含む動的セグメント（非同期に解決する）。
 */
export default async function RecordDetailPage({ params }: PageProps) {
  const { date } = await params;
  return <RecordDetailClient date={date} />;
}
