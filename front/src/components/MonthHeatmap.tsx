'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { WEEK_LABELS } from '@/constants/calendar';
import { useRecordCalendar } from '@/hooks/useRecordCalendar';
import { useTodayLocalIso } from '@/hooks/useTodayLocalIso';
import { buildMonthCells } from '@/lib/calendar';

/**
 * トップページの「今月のヒートマップ」（#27）。
 *
 * 今月（ブラウザのローカル日付）の日を小さなマス目で並べ、記録がある日を塗る。塗られた日は
 * 記録詳細へのリンク。月の移動はカレンダー画面に任せ、見出しから導線を出す。
 */
export default function MonthHeatmap() {
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
        <h2 className="shrink-0 text-xl font-black text-[color:var(--accent)]">
          今月の記録{month ? `（${Number(month.slice(5))}月）` : ''}
        </h2>
        <Link
          href="/calendar"
          className="text-xs font-bold text-[color:var(--accent)] underline-offset-4 hover:underline"
        >
          カレンダーで見る
        </Link>
      </div>
      {status === 'error' ? (
        <p className="mt-4 text-sm font-bold text-red-500">記録の取得に失敗しました。</p>
      ) : (
        <div className="mt-4 max-w-sm">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400">
            {WEEK_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1" aria-busy={status === 'loading'}>
            {cells.map((day, idx) => {
              if (day === null) return <span key={`empty-${idx}`} />;
              const iso = `${month}-${String(day).padStart(2, '0')}`;
              const todayRing = iso === today ? 'ring-2 ring-[color:var(--accent-pink)]' : '';
              return recordedDates.has(iso) ? (
                <Link
                  key={iso}
                  href={`/records/${iso}`}
                  aria-label={`${iso} の記録を見る`}
                  title={iso}
                  className={`aspect-square rounded-md bg-[color:var(--accent)] hover:opacity-80 ${todayRing}`}
                />
              ) : (
                <span
                  key={iso}
                  title={iso}
                  className={`aspect-square rounded-md bg-gray-100 ${todayRing}`}
                />
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
