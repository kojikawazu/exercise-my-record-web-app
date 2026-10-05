'use client';

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useWeeklySummary } from '@/hooks/useWeeklySummary';
import { changeRate } from '@/lib/dashboard';

/** {@link StatTile} の props。 */
type StatTileProps = {
  /** 指標名。 */
  label: string;
  /** 今週の値の表示文字列（単位込み）。 */
  value: string;
  /** 今週の値（先週比の計算用）。値が無い（体重未設定のカロリー等）場合は `null` */
  current: number | null;
  /** 先週（同じ曜日まで）の値。値が無い場合は `null` */
  previous: number | null;
};

/**
 * 先週比を「アイコン + 文言」で表す（色だけで増減を伝えない）。値の意味は
 * {@link StatTileProps} の `current` / `previous` を参照。
 */
function ChangeBadge({ current, previous }: Pick<StatTileProps, 'current' | 'previous'>) {
  if (current === null || previous === null) return null;
  const rate = changeRate(current, previous);
  if (rate === null) {
    return <p className="mt-2 text-xs font-bold text-gray-400">先週は記録なし</p>;
  }
  const Icon = rate > 0 ? TrendingUp : rate < 0 ? TrendingDown : Minus;
  const sign = rate > 0 ? '+' : '';
  return (
    <p className="mt-2 flex items-center justify-center gap-1 text-xs font-bold text-gray-600">
      <Icon size={14} aria-hidden="true" />
      先週比 {sign}
      {rate}%
    </p>
  );
}

/**
 * サマリーカードの 1 指標（今週の値と先週比）。props の各項目は {@link StatTileProps} を参照。
 */
function StatTile({ label, value, current, previous }: StatTileProps) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4 text-center">
      <p className="text-[10px] font-black uppercase text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-gray-900">{value}</p>
      <ChangeBadge current={current} previous={previous} />
    </div>
  );
}

/**
 * トップページの「今週のサマリー」カード（#27）。
 *
 * 今週（月曜〜今日）のトレーニング回数・合計セット数・推定消費カロリーと、先週の同じ曜日まで
 * との比較を表示する。体重が未設定ならカロリーは `-- kcal`（先週比なし）。
 */
export default function DashboardSummary() {
  const { current, previous, status } = useWeeklySummary();

  return (
    <Card className="p-6 md:p-8" role="region" aria-label="今週のサマリー">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="shrink-0 text-xl font-black text-[color:var(--accent)]">今週のサマリー</h2>
        <span className="text-xs font-bold text-gray-400">月曜〜今日 / 先週の同じ曜日まで比</span>
      </div>
      {status === 'loading' ? (
        <div className="py-6">
          <LoadingSpinner mode="fetching" />
        </div>
      ) : null}
      {status === 'error' ? (
        <p className="mt-4 text-sm font-bold text-red-500">サマリーの取得に失敗しました。</p>
      ) : null}
      {current && previous ? (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StatTile
            label="トレーニング回数"
            value={`${current.days}回`}
            current={current.days}
            previous={previous.days}
          />
          <StatTile
            label="合計セット数"
            value={`${current.totalSets}セット`}
            current={current.totalSets}
            previous={previous.totalSets}
          />
          <StatTile
            label="推定消費カロリー"
            value={current.calories === null ? '-- kcal' : `${current.calories} kcal`}
            current={current.calories}
            previous={previous.calories}
          />
        </div>
      ) : null}
    </Card>
  );
}
