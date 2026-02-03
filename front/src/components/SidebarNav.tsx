'use client';

import { History, LayoutGrid } from 'lucide-react';
import { useAdminSession } from '@/hooks/useAdminSession';

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
