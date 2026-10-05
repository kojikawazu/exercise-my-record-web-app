import type { Metadata } from 'next';
import AdminRecordEditClient from '@/components/AdminRecordEditClient';
import { resolveEditReturn } from '@/lib/recordEditNavigation';

/** 記録編集ページの props。動的セグメントの日付を非同期に受け取る。 */
type PageProps = {
  /** URL 動的セグメント。編集対象の記録日（`YYYY-MM-DD`）を含む Promise。 */
  params: Promise<{ date: string }>;
  /** URL クエリ。`from` に遷移元（`detail` 等）を含み得る Promise。 */
  searchParams: Promise<{ from?: string | string[] }>;
};

/** 記録編集ページのメタデータ（ブラウザタブのタイトル）。 */
export const metadata: Metadata = {
  title: '記録編集',
};

/**
 * 記録編集画面。動的セグメントの日付と遷移元クエリ（`from`）をサーバー側で解決し、フォームの
 * 対話・状態を持つ Client Component `AdminRecordEditClient` へ渡す。戻り先（保存後の遷移先・
 * 戻りリンク）は遷移元から決める（#32）。
 */
export default async function Page({ params, searchParams }: PageProps) {
  const { date } = await params;
  const { from } = await searchParams;
  return <AdminRecordEditClient date={date} returnTo={resolveEditReturn(from, date)} />;
}
