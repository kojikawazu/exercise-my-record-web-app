import { useSyncExternalStore } from 'react';
import { toLocalIso } from '@/lib/date';

// 「今日」は購読すべき変化源を持たないため、購読は何もしない
const subscribe = () => () => {};

const getTodaySnapshot = () => toLocalIso(new Date());

// サーバー描画・hydration 時は日付を確定させない（ビルド時刻やサーバーの UTC を焼き込まないため）
const getServerSnapshot = () => '';

/**
 * ブラウザのローカルタイムゾーンでの今日の日付を返す。
 *
 * 静的プリレンダリングされるページで初期値に使っても、ビルド時の日付・サーバー（UTC）の
 * 日付が HTML に焼き込まれず、hydration mismatch も起きないよう `useSyncExternalStore` で
 * サーバー値とクライアント値を分けている。
 *
 * @returns `YYYY-MM-DD` 形式の今日の日付。サーバー描画・hydration 中は空文字（未確定）
 */
export const useTodayLocalIso = (): string =>
  useSyncExternalStore(subscribe, getTodaySnapshot, getServerSnapshot);
