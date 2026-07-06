import { Suspense } from 'react';
import AdminLayoutClient from './AdminLayoutClient';

/**
 * 管理者エリア（`/admin/*`）のレイアウト。認証ガードを担う `AdminLayoutClient` を
 * `Suspense` 境界内で描画する。`AdminLayoutClient` が `useSearchParams` を利用するため
 * Suspense でラップしている。`children` は認証ガードを通過した後に描画する管理画面の内容。
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </Suspense>
  );
}
