import { estimateDailyCalories, toCalorieCardioType } from '@/lib/calorie';
import { toLocalIso } from '@/lib/date';
import type { DateRange, WeekRanges, WeekTotals } from '@/types/dashboard';
import type { RecordTrendPoint } from '@/types/record';

/**
 * `YYYY-MM-DD` を基準に日数をずらした日付を返す（ローカル日付で計算し、月・年をまたぐ）。
 *
 * @param date - 基準日（`YYYY-MM-DD`）
 * @param days - ずらす日数（負で過去）
 * @returns ずらした日付（`YYYY-MM-DD`）
 */
const addDays = (date: string, days: number) => {
  const [year, month, day] = date.split('-').map(Number);
  return toLocalIso(new Date(year, month - 1, day + days));
};

/**
 * 今週（月曜始まり）と、先週のうち今週と同じ曜日までの範囲を求める。
 *
 * 先週は 1 週間全体ではなく「先週の月曜〜先週の今日と同じ曜日」とする。週の途中でも
 * 同じ日数どうしで比べられるようにするため（全体と比べると週の前半はほぼ常に減少になる）。
 *
 * @param today - 今日（`YYYY-MM-DD`、ブラウザのローカル日付）
 * @returns 今週と先週の範囲（両端を含む）
 */
export const weekRanges = (today: string): WeekRanges => {
  const [year, month, day] = today.split('-').map(Number);
  // getDay は日曜 = 0。月曜を週の先頭（0）にずらす
  const sinceMonday = (new Date(year, month - 1, day).getDay() + 6) % 7;
  const monday = addDays(today, -sinceMonday);
  return {
    thisWeek: { from: monday, to: today },
    lastWeek: { from: addDays(monday, -7), to: addDays(today, -7) },
  };
};

/**
 * 範囲内の記録を集計する。
 *
 * 推定カロリーは一覧・詳細と同じ算定（有酸素種別は {@link toCalorieCardioType} で寄せる）で、
 * 日ごとの値を合算してから整数に丸める。
 *
 * @param points - 推移 API の点（記録がある日のみ）
 * @param range - 集計する範囲（両端を含む）
 * @param weightKg - プロフィールの体重（kg）。未設定・未取得は `null`
 * @returns 範囲内の集計（各メンバーの意味は {@link WeekTotals} を参照）
 */
export const summarizeRange = (
  points: RecordTrendPoint[],
  range: DateRange,
  weightKg: number | null,
): WeekTotals => {
  // `YYYY-MM-DD` は文字列の大小比較が日付の前後と一致する
  const inRange = points.filter((p) => p.date >= range.from && p.date <= range.to);
  return {
    days: inRange.length,
    totalSets: inRange.reduce((sum, p) => sum + p.totalSets, 0),
    calories:
      weightKg === null
        ? null
        : Math.round(
            inRange.reduce(
              (sum, p) =>
                sum +
                estimateDailyCalories(
                  weightKg,
                  p.totalSets,
                  p.cardios.map((c) => ({ type: toCalorieCardioType(c.type), minutes: c.minutes })),
                ),
              0,
            ),
          ),
  };
};

/**
 * 先週比（%）を求める。
 *
 * @param current - 今週の値
 * @param previous - 先週（同じ曜日まで）の値
 * @returns 増減率（%、整数に丸め）。先週が 0 の場合は比を定義できないため `null`
 */
export const changeRate = (current: number, previous: number): number | null =>
  previous === 0 ? null : Math.round(((current - previous) / previous) * 100);
