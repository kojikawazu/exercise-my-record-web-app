'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { WEEK_LABELS } from '@/constants/calendar';
import { useRecordCalendar } from '@/hooks/useRecordCalendar';
import { useTodayLocalIso } from '@/hooks/useTodayLocalIso';
import { buildMonthCells } from '@/lib/calendar';
import type { RecordStreakResponse } from '@/types/record';

/** {@link MonthHeatmap} の props。 */
type MonthHeatmapProps = {
  /** 連続記録日数。連続の範囲（`from`〜`to`）の日を別の見た目で示す。取得中・失敗・0 日は `null` 相当で強調しない */
  streak: RecordStreakResponse | null;
};

/**
 * トップページの「今月のヒートマップ」（#27）。
 *
 * 今月（ブラウザのローカル日付）の日を小さなマス目で並べ、記録がある日を塗る。塗られた日は
 * 記録詳細へのリンク。月の移動はカレンダー画面に任せ、見出しから導線を出す。連続記録中の日は
 * 色（ピンク）と白い点の形の両方で示し、凡例を添える（色だけで区別しない。#28）。props の各項目は
 * {@link MonthHeatmapProps} を参照。
 */
export default function MonthHeatmap({ streak }: MonthHeatmapProps) {
  const today = useTodayLocalIso();
  const month = today.slice(0, 7);
  const { recordedDates, status } = useRecordCalendar(month);

  const cells = useMemo(() => {
    if (!month) return [];
    const [year, monthNumber] = month.split('-').map(Number);
    return buildMonthCells(year, monthNumber - 1);
  }, [month]);

  return (
    <Card className="p-6 md:p-8" role="region" aria-label="今月の記録">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="shrink-0 text-xl font-black text-primary">
          今月の記録{month ? `（${Number(month.slice(5))}月）` : ''}
        </h2>
        <Link
          href="/calendar"
          className="text-xs font-bold text-primary underline-offset-4 hover:underline"
        >
          カレンダーで見る
        </Link>
      </div>
      {status === 'error' ? (
        <p className="mt-4 text-sm font-bold text-danger">記録の取得に失敗しました。</p>
      ) : (
        <div className="mt-4 max-w-sm">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-subtle">
            {WEEK_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1" aria-busy={status === 'loading'}>
            {cells.map((day, idx) => {
              if (day === null) return <span key={`empty-${idx}`} />;
              const iso = `${month}-${String(day).padStart(2, '0')}`;
              const todayRing = iso === today ? 'ring-2 ring-foreground' : '';
              // `YYYY-MM-DD` は文字列の大小比較が日付の前後と一致する
              const inStreak =
                streak?.from != null && streak.to != null && iso >= streak.from && iso <= streak.to;
              return recordedDates.has(iso) ? (
                <Link
                  key={iso}
                  href={`/records/${iso}`}
                  aria-label={`${iso} の記録を見る${inStreak ? '（連続記録中）' : ''}`}
                  title={iso}
                  className={`flex aspect-square items-center justify-center rounded-md hover:opacity-80 ${
                    inStreak ? 'bg-accent' : 'bg-primary-fill'
                  } ${todayRing}`}
                >
                  {inStreak ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                  ) : null}
                </Link>
              ) : (
                <span
                  key={iso}
                  title={iso}
                  className={`aspect-square rounded-md bg-surface-muted ${todayRing}`}
                />
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-muted">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-primary-fill" aria-hidden="true" />
              記録あり
            </span>
            <span className="flex items-center gap-1">
              <span
                className="flex h-3 w-3 items-center justify-center rounded-sm bg-accent"
                aria-hidden="true"
              >
                <span className="h-1 w-1 rounded-full bg-white" />
              </span>
              連続記録中
            </span>
            <span className="flex items-center gap-1">
              <span
                className="h-3 w-3 rounded-sm bg-surface-muted ring-2 ring-foreground"
                aria-hidden="true"
              />
              今日
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
