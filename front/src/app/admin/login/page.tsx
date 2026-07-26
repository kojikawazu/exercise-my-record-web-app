import type { Metadata } from 'next';
import AdminLoginClient from '@/components/AdminLoginClient';

/** 管理者ログインページのメタデータ（ブラウザタブのタイトル）。 */
export const metadata: Metadata = {
  title: '管理者ログイン',
};

/**
 * 管理者ログイン画面。対話・状態を持つため、描画は Client Component `AdminLoginClient` に委ねる。
 */
export default function Page() {
  return <AdminLoginClient />;
}
