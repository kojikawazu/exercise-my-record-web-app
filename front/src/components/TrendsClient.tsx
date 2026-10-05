'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import TrendChart from '@/components/TrendChart';
import { useProfile } from '@/hooks/useProfile';
import { useRecordTrends } from '@/hooks/useRecordTrends';
import { useTodayLocalIso } from '@/hooks/useTodayLocalIso';
import { useWeightHistory } from '@/hooks/useWeightHistory';
import { buildTrendSeries, buildWeightSeries, trendFromDate } from '@/lib/trends';
import { TREND_PERIODS, type TrendPeriod } from '@/types/trend';

/** 期間ボタンの表示文言。 */
const PERIOD_LABELS: Record<TrendPeriod, string> = {
  '1w': '1 週間',
  '1m': '1 ヶ月',
  '3m': '3 ヶ月',
  all: '全期間',
};

/** {@link TrendsClient} の props。 */
type TrendsClientProps = {
  /** 表示する期間（サーバー側で解釈済み。未指定・不正は `1m`） */
  period: TrendPeriod;
};

/**
 * 推移グラフ画面。合計セット数・有酸素距離・推定消費カロリー・体重を指標ごとのグラフで表示する。
 *
 * 期間は URL の `?period=` を唯一の真実とし、切替は URL を書き換えて行う。起点日はブラウザの
 * ローカル日付から求める。推定カロリーはプロフィールの体重（現在値）で算定し、体重が未設定なら
 * 案内を表示する。体重のグラフは体重の履歴から描き、記録の有無とは独立に表示する。
 * props の各項目は {@link TrendsClientProps} を参照。
 */
export default function TrendsClient({ period }: TrendsClientProps) {
  const router = useRouter();
  const today = useTodayLocalIso();
  // 今日が未確定（hydration 中）の間は undefined にして取得しない
  const from = today ? trendFromDate(today, period) : undefined;
  const { points, status } = useRecordTrends(from);
  const { weightKg, status: profileStatus } = useProfile();

  const weights = useWeightHistory(from);

  const series = useMemo(() => buildTrendSeries(points, weightKg), [points, weightKg]);
  const weightSeries = useMemo(() => buildWeightSeries(weights.points), [weights.points]);

  return (
    <main className="min-h-screen pb-16">
      <PageHeader
        title="推移グラフ"
        subtitle="Trends"
        action={
          <Link href="/" className={buttonClasses('outline')}>
            一覧へ戻る
          </Link>
        }
      />

      <section className="mx-auto max-w-5xl px-6 pt-8">
        <div className="flex flex-wrap gap-2" role="group" aria-label="期間">
          {TREND_PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={p === period}
              className={buttonClasses(p === period ? 'primary' : 'outline')}
              onClick={() => router.push(`/trends?period=${p}`)}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-6">
          {status === 'loading' ? (
            <Card className="p-10">
              <LoadingSpinner mode="fetching" />
            </Card>
          ) : null}
          {status === 'error' ? (
            <Card className="p-6 text-sm font-bold text-red-500">記録の取得に失敗しました。</Card>
          ) : null}
          {status === 'ready' && points.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="text-lg font-bold text-gray-500">この期間の記録はありません</p>
            </Card>
          ) : null}
          {status === 'ready' && points.length > 0 ? (
            <>
              <TrendChart title="合計セット数" unit="セット" points={series.sets} />
              <TrendChart
                title="有酸素距離"
                unit="km"
                points={series.distance}
                formatValue={(v) => String(Math.round(v * 10) / 10)}
              />
              {profileStatus === 'ready' && weightKg === null ? (
                <Card className="p-6 text-sm font-bold text-gray-500">
                  推定消費カロリー: プロフィールで体重を設定すると表示されます
                </Card>
              ) : null}
              {series.calories ? (
                <TrendChart title="推定消費カロリー" unit="kcal" points={series.calories} />
              ) : null}
            </>
          ) : null}

          {weights.status === 'loading' ? (
            <Card className="p-10">
              <LoadingSpinner mode="fetching" />
            </Card>
          ) : null}
          {weights.status === 'error' ? (
            <Card className="p-6 text-sm font-bold text-red-500">
              体重の履歴の取得に失敗しました。
            </Card>
          ) : null}
          {weights.status === 'ready' && weightSeries.length === 0 ? (
            <Card className="p-6 text-sm font-bold text-gray-500">
              体重: この期間の体重の記録はありません
            </Card>
          ) : null}
          {weights.status === 'ready' && weightSeries.length > 0 ? (
            <TrendChart
              title="体重"
              unit="kg"
              points={weightSeries}
              formatValue={(v) => String(Math.round(v * 10) / 10)}
              fitToData
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}
