import type { Metadata } from 'next';
import AdminMastersClient from '@/components/AdminMastersClient';

/** マスター管理ページのメタデータ（ブラウザタブのタイトル）。 */
export const metadata: Metadata = {
  title: 'マスター管理',
};

/**
 * マスター管理画面。対話・状態を持つため、描画は Client Component `AdminMastersClient` に委ねる。
 */
export default function Page() {
  return <AdminMastersClient />;
}
