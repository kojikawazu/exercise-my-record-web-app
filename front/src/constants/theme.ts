import type { Theme } from '@/types/theme';

/** 選んだテーマを保存する localStorage のキー。描画前スクリプトとフックで共有する。 */
export const THEME_STORAGE_KEY = 'theme';

/** 保存が無い・読めない・不正な値のときに使うテーマ（#25: 既定はダーク）。 */
export const DEFAULT_THEME: Theme = 'dark';
