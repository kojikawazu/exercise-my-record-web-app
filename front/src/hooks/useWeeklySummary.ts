import { useMemo } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useRecordTrends } from '@/hooks/useRecordTrends';
import { useTodayLocalIso } from '@/hooks/useTodayLocalIso';
import { summarizeRange, weekRanges } from '@/lib/dashboard';
import type { WeekTotals } from '@/types/dashboard';

/** 今週のサマリーの取得状態。 */
type UseWeeklySummary = {
  /** 今週（月曜〜今日）の集計。`status` が `ready` 以外の間は `null` */
  current: WeekTotals | null;
  /** 先週（月曜〜先週の今日と同じ曜日）の集計。`status` が `ready` 以外の間は `null` */
  previous: WeekTotals | null;
  /**
   * 取得状態。
   * - `loading`: 今日が未確定（hydration 中）、または記録の取得中
   * - `ready`: 集計済み（記録 0 件も含む）
   * - `error`: 記録の取得に失敗した
   */
  status: 'loading' | 'ready' | 'error';
};

/**
 * 今週と先週（同じ曜日まで）の記録を集計するフック（トップページのサマリーカード用）。
 *
 * 推移 API に先週の月曜を起点として 1 回だけ問い合わせ、今週・先週に振り分けて集計する。
 * 今日はブラウザのローカル日付で決める。推定カロリーはプロフィールの体重（現在値）で算定する。
 *
 * @returns 集計と取得状態（各メンバーの意味は {@link UseWeeklySummary} を参照）
 */
export function useWeeklySummary(): UseWeeklySummary {
  const today = useTodayLocalIso();
  const ranges = useMemo(() => (today ? weekRanges(today) : null), [today]);
  // 今日が未確定の間は undefined を渡して取得しない
  const { points, status } = useRecordTrends(ranges ? ranges.lastWeek.from : undefined);
  const { weightKg } = useProfile();

  return useMemo(() => {
    if (!ranges || status !== 'ready') return { current: null, previous: null, status };
    return {
      current: summarizeRange(points, ranges.thisWeek, weightKg),
      previous: summarizeRange(points, ranges.lastWeek, weightKg),
      status,
    };
  }, [ranges, points, status, weightKg]);
}
