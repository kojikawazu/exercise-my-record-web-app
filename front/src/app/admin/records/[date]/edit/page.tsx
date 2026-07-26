import type { Metadata } from 'next';
import AdminRecordEditClient from '@/components/AdminRecordEditClient';

/** 記録編集ページの props。動的セグメントの日付を非同期に受け取る。 */
type PageProps = {
  /** URL 動的セグメント。編集対象の記録日（`YYYY-MM-DD`）を含む Promise。 */
  params: Promise<{ date: string }>;
};

/** 記録編集ページのメタデータ（ブラウザタブのタイトル）。 */
export const metadata: Metadata = {
  title: '記録編集',
};

/**
 * 記録編集画面。動的セグメントの日付をサーバー側で解決し、フォームの対話・状態を持つ
 * Client Component `AdminRecordEditClient` へ渡す。`params` は編集対象の記録日を含む
 * 動的セグメント（非同期に解決する）。
 */
export default async function Page({ params }: PageProps) {
  const { date } = await params;
  return <AdminRecordEditClient date={date} />;
}
