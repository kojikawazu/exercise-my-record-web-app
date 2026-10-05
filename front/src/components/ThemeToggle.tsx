'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { THEMES, type Theme } from '@/types/theme';

/** テーマボタンの表示文言とアイコン。 */
const THEME_OPTIONS: Record<Theme, { label: string; Icon: typeof Moon }> = {
  dark: { label: 'ダーク', Icon: Moon },
  light: { label: 'ライト', Icon: Sun },
};

/**
 * サイドバーに置く配色テーマの切替（ダーク/ライト）。選択中は `aria-pressed` で示す。
 * テーマが確定するまで（ハイドレーション前）はどちらも選択中にしない。
 */
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-2 px-4 pb-6" role="group" aria-label="テーマ">
      {THEMES.map((t) => {
        const { label, Icon } = THEME_OPTIONS[t];
        const selected = theme === t;
        return (
          <button
            key={t}
            type="button"
            aria-pressed={selected}
            onClick={() => setTheme(t)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${
              selected
                ? 'bg-sidebar-foreground text-sidebar'
                : 'text-sidebar-foreground/80 hover:bg-white/10'
            }`}
          >
            <Icon size={14} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
