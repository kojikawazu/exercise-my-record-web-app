'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FilePlus, Folder, ListOrdered, LogOut, Upload, User } from 'lucide-react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { setBypassSession } from '@/hooks/useAdminSession';

const menuItems = [
  { label: '記録一覧', href: '/admin/records', icon: ListOrdered },
  { label: '記録追加', href: '/admin/records/new', icon: FilePlus },
  { label: 'プロフィール', href: '/admin/profile', icon: User },
  { label: 'マスター管理', href: '/admin/masters', icon: Folder },
  { label: 'データ出力', href: '/admin/export', icon: Upload },
];

export default function AdminMenuPage() {
  const router = useRouter();

  const handleLogout = async () => {
    setBypassSession(false);
    await supabase.auth.signOut();
    router.replace('/admin/login');
  };

  return (
    <main className="min-h-screen pb-16">
      <PageHeader
        title="管理者メニュー"
        subtitle="Admin"
        maxWidth="4xl"
        action={
          <button
            type="button"
            onClick={handleLogout}
            className={`${buttonClasses('outline')} flex items-center gap-2`}
          >
            <LogOut size={16} />
            ログアウト
          </button>
        }
      />

      <section className="mx-auto max-w-4xl px-6 pt-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {menuItems.map((item) => (
            <Link key={item.label} href={item.href} className="group">
              <Card className="p-6 transition hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xl font-black text-[color:var(--accent)]">
                    <item.icon size={20} />
                    {item.label}
                  </span>
                  <span className="text-lg text-[color:var(--accent)] transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-400">移動する</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
