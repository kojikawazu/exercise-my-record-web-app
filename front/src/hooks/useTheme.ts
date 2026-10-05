import { useCallback, useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY } from '@/constants/theme';
import { parseTheme } from '@/lib/theme';
import type { Theme } from '@/types/theme';

/** 現在のテーマと切替操作。 */
type UseTheme = {
  /**
   * 現在のテーマ（`<html data-theme>` の値）。サーバー描画・ハイドレーション中は `null`
   * （保存値はブラウザでしか分からないため、確定前にどちらかを選択中として描画しない）
   */
  theme: Theme | null;
  /**
   * テーマを切り替え、選んだテーマを localStorage に保存する（次回の表示にも使う）。
   * 保存に失敗しても（プライベートブラウズ等）表示の切替は行う
   */
  setTheme: (theme: Theme) => void;
};

/**
 * `<html data-theme>` の変化を購読する。描画前スクリプト・他のコンポーネントからの切替の
 * どちらでも追従できるよう、属性そのものを監視する。
 *
 * @param onChange - 変化時に呼ぶコールバック
 * @returns 購読の解除関数
 */
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
};

const getSnapshot = (): Theme => parseTheme(document.documentElement.dataset.theme);

const getServerSnapshot = (): Theme | null => null;

/**
 * 配色テーマ（ダーク/ライト）を読み書きするフック（#25）。
 *
 * テーマの唯一の真実は `<html data-theme>` で、初期値は描画前スクリプト
 * （`lib/theme.ts` の `buildThemeInitScript`）が保存値から設定する。
 *
 * @returns 現在のテーマと切替操作（各メンバーの意味は {@link UseTheme} を参照）
 */
export function useTheme(): UseTheme {
  const theme = useSyncExternalStore<Theme | null>(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // 保存できない環境では、今回の表示だけ切り替える（次回は既定のテーマに戻る）
    }
  }, []);

  return { theme, setTheme };
}
