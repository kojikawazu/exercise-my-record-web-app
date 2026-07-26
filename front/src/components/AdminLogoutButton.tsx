'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { buttonClasses } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { setBypassSession } from '@/hooks/useAdminSession';

/**
 * ログアウトボタン。E2E バイパスフラグを解除してから Supabase をサインアウトし、
 * ログイン画面へ置換遷移する（戻る操作で管理画面に復帰させないため `replace`）。
 *
 * 管理者メニューのうち対話を伴うのはこのボタンだけなので、ページ本体を Server Component
 * に保ったままここだけを Client 境界にしている（`.claude/rules/frontend.md`）。
 */
export default function AdminLogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    setBypassSession(false);
    await supabase.auth.signOut();
    router.replace('/admin/login');
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={`${buttonClasses('outline')} flex items-center gap-2`}
    >
      <LogOut size={16} />
      ログアウト
    </button>
  );
}
