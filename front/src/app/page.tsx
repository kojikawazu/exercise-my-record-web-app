import { Suspense } from 'react';
import RecordsListClient from '@/components/RecordsListClient';

/**
 * トップページ（記録一覧画面）。日付降順で記録カードを表示するクライアントコンポーネント
 * `RecordsListClient` を `Suspense` 境界内で描画する。ページングやクエリパラメータ参照に
 * 備え Suspense でラップしている。
 */
export default function HomePage() {
  return (
    <Suspense>
      <RecordsListClient />
    </Suspense>
  );
}
