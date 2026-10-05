import { estimateDailyCalories, toCalorieCardioType } from '@/lib/calorie';
import { toLocalIso } from '@/lib/date';
import type { RecordTrendPoint } from '@/types/record';
import { TREND_PERIODS, type TrendPeriod } from '@/types/trend';

/** 期間ごとの日数（今日を含む）。`all` は起点を持たない。 */
const PERIOD_DAYS: Record<Exclude<TrendPeriod, 'all'>, number> = {
  '1w': 7,
  '1m': 30,
  '3m': 90,
};

/** 期間の指定が無い・不正なときの既定値。 */
const DEFAULT_PERIOD: TrendPeriod = '1m';

/** `YYYY-MM-DD`（年の先頭 0 は認めない）。暦として存在するかは別途確かめる。 */
const ISO_DATE_PATTERN = /^[1-9]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * クエリから受け取った期間の指定を解釈する。
 *
 * @param value - `searchParams.period` の生値（重複指定時は配列）
 * @returns 選択肢に含まれる値ならその期間、それ以外（未指定・配列・未知の値）は既定の `1m`
 */
export const parseTrendPeriod = (value: string | string[] | undefined): TrendPeriod =>
  typeof value === 'string' && (TREND_PERIODS as readonly string[]).includes(value)
    ? (value as TrendPeriod)
    : DEFAULT_PERIOD;

/**
 * 期間の起点日（この日を含む）を求める。
 *
 * @param today - 今日（`YYYY-MM-DD`、ブラウザのローカル日付）
 * @param period - 期間
 * @returns 起点日（`YYYY-MM-DD`）。`all` は起点を持たないため `null`
 */
export const trendFromDate = (today: string, period: TrendPeriod): string | null => {
  if (period === 'all') return null;
  const [year, month, day] = today.split('-').map(Number);
  // 日の繰り下がりで月・年をまたぐ計算を Date に任せる（ローカル時刻で組み立てるため DST の影響を受けない日付単位の計算になる）
  return toLocalIso(new Date(year, month - 1, day - (PERIOD_DAYS[period] - 1)));
};

/**
 * `YYYY-MM-DD` の日付文字列を検証する（暦に存在しない日付も弾く）。
 *
 * @param value - 検証対象（クエリの生値）
 * @returns 正しい日付ならその文字列、それ以外（未指定・形式不正・2/30 等の存在しない日）は `null`
 */
export const parseIsoDate = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  // 2026-02-30 は Date では 3/2 に繰り上がるため、往復して一致するかで存在を確かめる
  return parsed.toISOString().slice(0, 10) === value ? value : null;
};

/** グラフ 1 本分の点（記録がある 1 日分）。 */
type TrendSeriesPoint = {
  /** 記録日（`YYYY-MM-DD`）。 */
  date: string;
  /** その日の値。 */
  value: number;
};

/** 推移グラフの指標ごとの系列。 */
type TrendSeries = {
  /** 合計セット数。 */
  sets: TrendSeriesPoint[];
  /** 有酸素距離（km）。 */
  distance: TrendSeriesPoint[];
  /** 推定消費カロリー（kcal、整数に丸め済み）。体重が未設定なら `null`（グラフを出さず案内を表示する） */
  calories: TrendSeriesPoint[] | null;
};

/**
 * 推移 API の点から、指標ごとのグラフ系列を組み立てる。
 *
 * 推定カロリーは一覧・詳細と同じ算定（有酸素種別は {@link toCalorieCardioType} で寄せる）で、
 * 体重は現在のプロフィールの値を全期間に使う（体重の履歴は持たない）。
 *
 * @param points - 推移 API の点（日付昇順）
 * @param weightKg - プロフィールの体重（kg）。未設定・未取得は `null`
 * @returns 指標ごとの系列（各メンバーの意味は {@link TrendSeries} を参照）
 */
export const buildTrendSeries = (
  points: RecordTrendPoint[],
  weightKg: number | null,
): TrendSeries => ({
  sets: points.map((p) => ({ date: p.date, value: p.totalSets })),
  distance: points.map((p) => ({ date: p.date, value: p.cardioDistance })),
  calories:
    weightKg === null
      ? null
      : points.map((p) => ({
          date: p.date,
          value: Math.round(
            estimateDailyCalories(
              weightKg,
              p.totalSets,
              p.cardios.map((c) => ({ type: toCalorieCardioType(c.type), minutes: c.minutes })),
            ),
          ),
        })),
});
