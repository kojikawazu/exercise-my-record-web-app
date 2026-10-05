/** 日付の範囲（両端を含む、`YYYY-MM-DD`）。 */
export type DateRange = {
  /** 開始日（この日を含む）。 */
  from: string;
  /** 終了日（この日を含む）。 */
  to: string;
};

/** 今週と、先週のうち今週と同じ曜日までの範囲（先週比の比較に使う）。 */
export type WeekRanges = {
  /** 今週の月曜〜今日。 */
  thisWeek: DateRange;
  /** 先週の月曜〜先週の今日と同じ曜日。 */
  lastWeek: DateRange;
};

/** 1 週間分（範囲内）の集計。 */
export type WeekTotals = {
  /** トレーニング回数（範囲内で記録がある日数）。 */
  days: number;
  /** 合計セット数。 */
  totalSets: number;
  /** 推定消費カロリーの合計（kcal、整数に丸め済み）。体重が未設定なら `null` */
  calories: number | null;
};
