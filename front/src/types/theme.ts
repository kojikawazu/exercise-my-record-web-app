/** 選べる配色テーマ。並びは切替ボタンの表示順。 */
export const THEMES = ['dark', 'light'] as const;

/**
 * 配色テーマ。`<html data-theme>` の値で、`globals.css` のトークンを切り替える。
 * - `dark`: 既定。ジムの暗い照明下での眩しさを抑える
 * - `light`: 明るい場所での振り返り用
 */
export type Theme = (typeof THEMES)[number];
