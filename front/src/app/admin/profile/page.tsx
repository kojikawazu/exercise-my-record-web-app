import type { Metadata } from 'next';
import AdminProfileClient from '@/components/AdminProfileClient';

/** プロフィールページのメタデータ（ブラウザタブのタイトル）。 */
export const metadata: Metadata = {
  title: 'プロフィール',
};

/**
 * プロフィール画面。対話・状態を持つため、描画は Client Component `AdminProfileClient` に委ねる。
 */
export default function Page() {
  return <AdminProfileClient />;
}
