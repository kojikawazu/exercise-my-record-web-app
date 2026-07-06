import { Suspense } from 'react';
import AdminRecordsListClient from '@/components/AdminRecordsListClient';

/**
 * 管理者向け記録一覧画面。記録の管理操作（編集・削除への導線）を提供するクライアント
 * コンポーネント `AdminRecordsListClient` を `Suspense` 境界内で描画する。
 */
export default function AdminRecordsPage() {
  return (
    <Suspense>
      <AdminRecordsListClient />
    </Suspense>
  );
}
