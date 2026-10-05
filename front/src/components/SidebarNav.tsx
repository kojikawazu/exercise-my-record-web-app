'use client';

import Link from 'next/link';
import { CalendarDays, History, LayoutGrid, LineChart } from 'lucide-react';
import { useAdminSession } from '@/hooks/useAdminSession';

/**
 * サイドバーのナビゲーション。記録一覧・カレンダー・推移グラフへの導線に加え、管理者にのみ管理者メニューを表示する。
 *
 * 管理者判定は {@link useAdminSession} に依存し、判定中（`isLoading`）は管理者リンクを出さない。
 * バイパス経由（`isBypass`）でも管理者リンクを表示する。
 */
export default function SidebarNav() {
  const { isAdmin, isLoading, isBypass } = useAdminSession();

  return (
    <nav className="px-4 pb-6">
      <Link
        href="/"
        className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-sidebar-foreground hover:bg-white/10"
      >
        <span className="flex items-center gap-2">
          <History size={16} />
          記録一覧
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-cta" />
      </Link>
      <Link
        href="/calendar"
        className="mt-2 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-sidebar-foreground/80 hover:bg-white/10"
      >
        <CalendarDays size={16} />
        カレンダー
      </Link>
      <Link
        href="/trends"
        className="mt-2 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-sidebar-foreground/80 hover:bg-white/10"
      >
        <LineChart size={16} />
        推移グラフ
      </Link>
      {!isLoading && (isAdmin || isBypass) ? (
        <Link
          href="/admin"
          className="mt-2 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-sidebar-foreground/80 hover:bg-white/10"
        >
          <LayoutGrid size={16} />
          管理者メニュー
        </Link>
      ) : null}
    </nav>
  );
}
