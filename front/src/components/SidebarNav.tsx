'use client';

import { History, LayoutGrid } from 'lucide-react';
import { useAdminSession } from '@/hooks/useAdminSession';

/**
 * サイドバーのナビゲーション。記録一覧への導線に加え、管理者にのみ管理者メニューを表示する。
 *
 * 管理者判定は {@link useAdminSession} に依存し、判定中（`isLoading`）は管理者リンクを出さない。
 * バイパス経由（`isBypass`）でも管理者リンクを表示する。
 */
export default function SidebarNav() {
  const { isAdmin, isLoading, isBypass } = useAdminSession();

  return (
    <nav className="px-4 pb-6">
      <a
        href="/"
        className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-white/90 hover:bg-white/10"
      >
        <span className="flex items-center gap-2">
          <History size={16} />
          記録一覧
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent-pink)]" />
      </a>
      {!isLoading && (isAdmin || isBypass) ? (
        <a
          href="/admin"
          className="mt-2 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/10"
        >
          <LayoutGrid size={16} />
          管理者メニュー
        </a>
      ) : null}
    </nav>
  );
}
