/** 推移グラフの期間の選択肢。表示順もこの配列の順序に従う。 */
export const TREND_PERIODS = ['1w', '1m', '3m', 'all'] as const;

/**
 * 推移グラフの期間（URL の `?period=` の値）。
 * - `1w`: 今日を含む直近 7 日
 * - `1m`: 今日を含む直近 30 日
 * - `3m`: 今日を含む直近 90 日
 * - `all`: 全期間（起点なし）
 */
export type TrendPeriod = (typeof TREND_PERIODS)[number];
