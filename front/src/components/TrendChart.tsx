'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type TooltipValueType,
} from 'recharts';
import Card from '@/components/ui/Card';

/** グラフの 1 点（記録がある 1 日分）。 */
type TrendChartPoint = {
  /** 記録日（`YYYY-MM-DD`）。横軸のカテゴリ。 */
  date: string;
  /** その日の値（単位は `unit`）。 */
  value: number;
};

/** {@link TrendChart} の props。 */
type TrendChartProps = {
  /** グラフの見出し（指標名）。系列が 1 本のため凡例の代わりに指標を名指す */
  title: string;
  /** 値の単位（ツールチップ・表に付ける。例: `セット` / `km` / `kcal`） */
  unit: string;
  /** 表示する点（日付昇順）。空配列は呼び出し側で空状態を出すため渡さない想定 */
  points: TrendChartPoint[];
  /** 値の表示整形（ツールチップ・表で使う）。既定は値をそのまま文字列にする */
  formatValue?: (value: number) => string;
  /**
   * 縦軸を 0 起点ではなく値の範囲（前後 1 単位の余白付き）に合わせるか。既定は `false`（0 起点）。
   * 体重のように、値の大きさに比べて変化の幅が小さい指標で使う（0 起点だと変化が潰れて見えない）
   */
  fitToData?: boolean;
};

// 色は配色トークン（globals.css）を参照し、テーマの切替に追従させる（#25）。
// 系列色は 1 系列のみで、dataviz の検査（明度帯・面とのコントラスト 3:1 以上）をライト（#6d28d9 on #ffffff）・
// ダーク（#8b5cf6 on #1e1e30）の両方で PASS する値を --chart-series に置いている。
// 文字は系列色を使わず、本文用のインク色で書く
const SERIES_COLOR = 'var(--chart-series)';
const SURFACE_COLOR = 'var(--surface)';
const GRID_COLOR = 'var(--line)';
const AXIS_TEXT_COLOR = 'var(--subtle)';

/**
 * 横軸の目盛りを `M/D` に縮める（年は表で確認できる）。
 *
 * @param date - `YYYY-MM-DD`
 * @returns `M/D` 形式の文字列
 */
const shortDate = (date: string) => {
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
};

/**
 * 1 指標の推移を折れ線で表示し、同じ値を表でも確認できるようにする（#22）。
 *
 * 横軸は記録がある日だけを並べる（点の間隔は日数を表さないため、日付はツールチップと表で示す）。
 * 縦軸は 1 本のみ（指標ごとにグラフを分ける）。props の各項目は {@link TrendChartProps} を参照。
 */
export default function TrendChart({
  title,
  unit,
  points,
  formatValue = (value) => String(value),
  fitToData = false,
}: TrendChartProps) {
  const renderTooltip = ({
    active,
    payload,
  }: TooltipContentProps<TooltipValueType, string | number>) => {
    const point = active ? (payload?.[0]?.payload as TrendChartPoint | undefined) : undefined;
    if (!point) return null;
    return (
      <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-sm">
        <p className="font-bold text-muted">{point.date}</p>
        <p className="mt-1 flex items-center gap-2 font-black text-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: SERIES_COLOR }} />
          {formatValue(point.value)}
          {unit}
        </p>
      </div>
    );
  };

  return (
    <Card className="p-6 md:p-8">
      <h2 className="text-lg font-black text-foreground">
        {title}
        <span className="ml-2 text-xs font-bold text-subtle">（{unit}）</span>
      </h2>
      <div className="mt-4 h-56" role="img" aria-label={`${title}の推移（${points.length} 日分）`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID_COLOR} strokeWidth={1} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fill: AXIS_TEXT_COLOR, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: GRID_COLOR }}
              minTickGap={16}
            />
            <YAxis
              tick={{ fill: AXIS_TEXT_COLOR, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
              allowDecimals={false}
              domain={
                fitToData
                  ? [(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]
                  : undefined
              }
            />
            <Tooltip
              content={renderTooltip}
              cursor={{ stroke: AXIS_TEXT_COLOR, strokeWidth: 1 }}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="value"
              name={title}
              stroke={SERIES_COLOR}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              // 点は r=4（8px）。背景色のリングで線との交差でも判読できるようにする
              dot={{ r: 4, fill: SERIES_COLOR, stroke: SURFACE_COLOR, strokeWidth: 2 }}
              activeDot={{ r: 6, fill: SERIES_COLOR, stroke: SURFACE_COLOR, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-bold text-muted">表で見る</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-[10px] font-black uppercase text-subtle">
              <th className="py-1">日付</th>
              <th className="py-1 text-right">
                {title}（{unit}）
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.date} className="border-t border-line text-foreground">
                <td className="py-1">{point.date}</td>
                <td className="py-1 text-right font-bold">{formatValue(point.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
}
