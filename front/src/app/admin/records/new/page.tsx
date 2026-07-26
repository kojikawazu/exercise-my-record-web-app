import type { Metadata } from 'next';
import AdminRecordNewClient from '@/components/AdminRecordNewClient';

/** 記録追加ページのメタデータ（ブラウザタブのタイトル）。 */
export const metadata: Metadata = {
  title: '記録追加',
};

/**
 * 記録追加画面。対話・状態を持つため、描画は Client Component `AdminRecordNewClient` に委ねる。
 */
export default function Page() {
  return <AdminRecordNewClient />;
}
