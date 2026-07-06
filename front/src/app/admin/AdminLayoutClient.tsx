'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  getBypassFlag,
  isBypassAllowed,
  setBypassSession,
  useAdminSession,
} from '@/hooks/useAdminSession';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * 管理者エリアの認証ガード兼レイアウト。管理者セッションの有無を判定し、未ログインなら
 * ログイン画面へリダイレクトする。ログイン画面（`/admin/login`）自体、E2E バイパス有効時、
 * および判定中ローディング表示は例外として通過・表示する。`?bypass=1` を検出した場合は
 * バイパスフラグを保存してクエリを除去する。`children` は管理者と判定された場合に描画する
 * 管理画面の内容。
 */
export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAdmin, isLoading, isBypass } = useAdminSession();
  const bypassParam = searchParams.get('bypass') === '1';
  const hasBypass = isBypass || (isBypassAllowed && getBypassFlag()) || bypassParam;

  const isLoginRoute = pathname.startsWith('/admin/login');

  useEffect(() => {
    if (bypassParam) {
      setBypassSession(true);
      router.replace(pathname);
    }
  }, [bypassParam, pathname, router]);

  useEffect(() => {
    if (isLoginRoute || isLoading || hasBypass) return;
    if (!isAdmin) {
      router.replace('/admin/login');
    }
  }, [isAdmin, isLoading, isLoginRoute, hasBypass, router]);

  if (isLoginRoute) return <>{children}</>;
  if (hasBypass) return <>{children}</>;
  if (isLoading) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto flex max-w-5xl justify-center rounded-2xl bg-white p-8">
          <LoadingSpinner mode="fetching" />
        </div>
      </main>
    );
  }
  if (!isAdmin) return null;

  return <>{children}</>;
}
