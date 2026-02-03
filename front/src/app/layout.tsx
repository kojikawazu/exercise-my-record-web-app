import type { Metadata } from 'next';
import SidebarNav from '@/components/SidebarNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Exercise My Record',
  description: 'フィットネス記録の一覧・詳細・管理を行うアプリ',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <div className="min-h-screen bg-[color:var(--background)] md:flex">
          <aside className="af-sidebar sticky top-0 z-20 w-full md:h-screen md:w-72">
            <div className="flex items-center gap-3 border-b border-white/10 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[color:var(--accent)]">
                <span className="text-lg font-black">AF</span>
              </div>
              <div>
                <p className="text-lg font-black tracking-tight">AF MOBILE</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-200">
                  MVP Training App
                </p>
              </div>
            </div>
            <div className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-purple-200/70">
              Navigation
            </div>
            <SidebarNav />
          </aside>
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
