import { addDays } from '@/lib/date';
import type { RecordStreakResponse } from '@/types/record';

/**
 * 連続記録日数（ストリーク）を求める。
 *
 * 今日を起点に、記録がある日が途切れずに続く日数を数える。今日の記録がまだ無くても、昨日まで
 * 続いていれば継続中とみなし、昨日を起点に数える（未記録の朝に 0 日と見せないため）。今日も
 * 昨日も記録が無ければ 0 日。今日より後の日付は数えない。
 *
 * @param dates - 記録日（`YYYY-MM-DD`）。順序・重複は問わない
 * @param today - 今日（`YYYY-MM-DD`、ブラウザのローカル日付）
 * @returns 連続日数・連続の初日/最終日・今日の記録の有無
 */
export const computeStreak = (dates: string[], today: string): RecordStreakResponse => {
  const recorded = new Set(dates);
  const recordedToday = recorded.has(today);
  const end = recordedToday ? today : addDays(today, -1);
  if (!recorded.has(end)) {
    return { days: 0, from: null, to: null, recordedToday };
  }

  let from = end;
  let days = 1;
  while (recorded.has(addDays(from, -1))) {
    from = addDays(from, -1);
    days += 1;
  }
  return { days, from, to: end, recordedToday };
};
