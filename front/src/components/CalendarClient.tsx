'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { WEEK_LABELS } from '@/constants/calendar';
import { useRecordCalendar } from '@/hooks/useRecordCalendar';
import { useTodayLocalIso } from '@/hooks/useTodayLocalIso';
import { buildMonthCells, shiftMonth } from '@/lib/calendar';

/** {@link CalendarClient} の props。 */
type CalendarClientProps = {
  /** 表示する月（`YYYY-MM`、サーバー側で検証済み）。`null` はクエリ未指定・不正で、今月を表示する */
  month: string | null;
};

/**
 * 記録カレンダー（月表示）。記録がある日をハイライトし、クリックで記録詳細へ遷移する。
 *
 * 表示月は URL の `?month=` を唯一の真実とし、前月/次月は URL を書き換えて移動する（ブラウザの
 * 戻る/進むが効く）。今日の枠表示・今月の決定はブラウザのローカル日付で行う。props の各項目は
 * {@link CalendarClientProps} を参照。
 */
export default function CalendarClient({ month }: CalendarClientProps) {
  const router = useRouter();
  const today = useTodayLocalIso();
  // クエリが無いときは今月。今日が未確定（hydration 中）の間は空文字で、取得も描画もしない
  const displayMonth = month ?? today.slice(0, 7);
  const { recordedDates, status } = useRecordCalendar(displayMonth);

  const cells = useMemo(() => {
    if (!displayMonth) return [];
    const [year, monthNumber] = displayMonth.split('-').map(Number);
    return buildMonthCells(year, monthNumber - 1);
  }, [displayMonth]);

  const goToMonth = (delta: number) => {
    router.push(`/calendar?month=${shiftMonth(displayMonth, delta)}`);
  };

  const [yearLabel, monthLabel] = displayMonth ? displayMonth.split('-') : ['', ''];

  return (
    <main className="min-h-screen pb-16">
      <PageHeader
        title="カレンダー"
        subtitle="Calendar"
        maxWidth="4xl"
        action={
          <Link href="/" className={buttonClasses('outline')}>
            一覧へ戻る
          </Link>
        }
      />

      <section className="mx-auto max-w-4xl px-6 pt-8">
        <Card className="p-6 md:p-8">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className={buttonClasses('outline')}
              onClick={() => goToMonth(-1)}
              disabled={!displayMonth}
            >
              <ChevronLeft size={16} />
              前月
            </button>
            <h2 className="text-xl font-black text-gray-900" aria-live="polite">
              {displayMonth ? `${yearLabel}年${Number(monthLabel)}月` : ''}
            </h2>
            <button
              type="button"
              className={buttonClasses('outline')}
              onClick={() => goToMonth(1)}
              disabled={!displayMonth}
            >
              次月
              <ChevronRight size={16} />
            </button>
          </div>

          {status === 'error' ? (
            <p className="mt-4 text-sm font-bold text-red-500">記録の取得に失敗しました。</p>
          ) : null}

          <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-400">
            {WEEK_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          {status === 'loading' ? (
            <div className="py-10">
              <LoadingSpinner mode="fetching" />
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-7 gap-2 text-center">
              {cells.map((day, idx) => {
                if (day === null) return <span key={`empty-${idx}`} />;
                const iso = `${displayMonth}-${String(day).padStart(2, '0')}`;
                const isToday = iso === today;
                const todayRing = isToday ? 'ring-2 ring-[color:var(--accent-pink)]' : '';
                return recordedDates.has(iso) ? (
                  <Link
                    key={iso}
                    href={`/records/${iso}`}
                    aria-label={`${iso} の記録を見る`}
                    className={`flex flex-col items-center rounded-xl bg-purple-50 py-2 text-sm font-black text-[color:var(--accent)] transition hover:bg-purple-100 ${todayRing}`}
                  >
                    {day}
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]" />
                  </Link>
                ) : (
                  <span
                    key={iso}
                    className={`flex flex-col items-center rounded-xl py-2 text-sm font-bold text-gray-400 ${todayRing}`}
                  >
                    {day}
                    <span className="mt-1 h-1.5 w-1.5" />
                  </span>
                );
              })}
            </div>
          )}
        </Card>
      </section>
    </main>
  );
}
