import type { Metadata } from 'next';
import SidebarNav from '@/components/SidebarNav';
import ThemeToggle from '@/components/ThemeToggle';
import { DEFAULT_THEME } from '@/constants/theme';
import { buildThemeInitScript } from '@/lib/theme';
import './globals.css';

/** アプリ全体の既定メタデータ（ブラウザタブのタイトルと説明文）。 */
export const metadata: Metadata = {
  title: 'Exercise My Record',
  description: 'フィットネス記録の一覧・詳細・管理を行うアプリ',
};

/**
 * アプリ全体のルートレイアウト。左サイドバー（ロゴ + ナビゲーション）と本文領域の
 * 2 カラム構成を提供し、全ページ共通の `<html>` / `<body>` とグローバル CSS を適用する。
 * `children` はサイドバー右側の本文領域に描画する各ページの内容。
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-theme は描画前スクリプトが保存値で書き換えるため、サーバーの値（既定）と食い違ってよい
    <html lang="ja" data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: buildThemeInitScript() }} />
      </head>
      <body className="antialiased">
        <div className="min-h-screen bg-background md:flex">
          <aside className="sticky bg-sidebar text-sidebar-foreground top-0 z-20 w-full md:h-screen md:w-72">
            <div className="flex items-center gap-3 border-b border-white/10 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary-fill">
                <span className="text-lg font-black">AF</span>
              </div>
              <div>
                <p className="text-lg font-black tracking-tight">AF MOBILE</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/80">
                  MVP Training App
                </p>
              </div>
            </div>
            <div className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-sidebar-foreground/80">
              Navigation
            </div>
            <SidebarNav />
            <ThemeToggle />
          </aside>
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
