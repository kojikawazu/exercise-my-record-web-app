import { DEFAULT_THEME, THEME_STORAGE_KEY } from '@/constants/theme';
import { THEMES, type Theme } from '@/types/theme';

/**
 * 保存値などの任意の値をテーマとして解釈する。
 *
 * @param value - localStorage の生値など（未保存は `null`）
 * @returns 選択肢に含まれる値ならそのテーマ、それ以外は既定のテーマ（`dark`）
 */
export const parseTheme = (value: unknown): Theme =>
  typeof value === 'string' && (THEMES as readonly string[]).includes(value)
    ? (value as Theme)
    : DEFAULT_THEME;

/**
 * 初回描画の前に `<html data-theme>` を保存済みのテーマへ合わせるインラインスクリプトの本文。
 *
 * サーバーは保存値を知らない（localStorage はブラウザにしか無い）ため、HTML は既定のテーマで
 * 描画される。ハイドレーションを待ってから切り替えると、ライトを選んだ人の画面が一瞬ダークで
 * 描かれてしまうので、`<head>` で同期的に実行して描画前に合わせる。localStorage が使えない環境
 * （プライベートブラウズでの例外等）では既定のテーマのままにする。
 *
 * @returns `<script>` に埋め込む JavaScript の文字列
 */
export const buildThemeInitScript = () =>
  `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});` +
  `if(${JSON.stringify(THEMES)}.indexOf(t)!==-1){document.documentElement.dataset.theme=t;}}catch(e){}})();`;
