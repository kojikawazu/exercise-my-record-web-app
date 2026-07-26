import type { Metadata } from 'next';
import Link from 'next/link';
import { FilePlus, Folder, ListOrdered, Upload, User } from 'lucide-react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import AdminLogoutButton from '@/components/AdminLogoutButton';

/** 管理者メニューに並べるカードの定義（表示ラベル・遷移先パス・アイコン）。 */
const menuItems = [
  { label: '記録一覧', href: '/admin/records', icon: ListOrdered },
  { label: '記録追加', href: '/admin/records/new', icon: FilePlus },
  { label: 'プロフィール', href: '/admin/profile', icon: User },
  { label: 'マスター管理', href: '/admin/masters', icon: Folder },
  { label: 'データ出力', href: '/admin/export', icon: Upload },
];

/** 管理者メニューページのメタデータ（ブラウザタブのタイトル）。 */
export const metadata: Metadata = {
  title: '管理者メニュー',
};

/**
 * 管理者メニュー画面。記録一覧・記録追加・プロフィール・マスター管理・データ出力への
 * 導線をカードのグリッドで表示し、右上にログアウトボタンを固定表示する。
 *
 * グリッドは静的なので Server Component のまま描画し、対話を伴うログアウトのみ
 * `AdminLogoutButton` として Client 境界に切り出している。
 */
export default function Page() {
  return (
    <main className="min-h-screen pb-16">
      <PageHeader
        title="管理者メニュー"
        subtitle="Admin"
        maxWidth="4xl"
        action={<AdminLogoutButton />}
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
