import { useEffect, useMemo, useState } from 'react';
import { fetchRecordCalendar } from '@/repositories/record';
import type { ApiResult } from '@/types/apiResult';
import type { RecordCalendarResponse } from '@/types/record';

/** 直近に届いた取得結果と、それがどの月への要求だったか。 */
type FetchedCalendar = {
  /** 要求した月（`YYYY-MM`）。 */
  forMonth: string;
  /** 取得結果。 */
  result: ApiResult<RecordCalendarResponse>;
};

/** 記録カレンダーの取得状態。 */
type UseRecordCalendar = {
  /** 表示中の月に記録がある日（`YYYY-MM-DD`）。取得中・失敗時は空（前の月の結果を持ち越さない） */
  recordedDates: ReadonlySet<string>;
  /**
   * 取得状態。
   * - `loading`: 月が未確定（hydration 中）、または要求した月の結果がまだ届いていない
   * - `ready`: 要求した月の結果を取得済み（記録 0 件も含む）
   * - `error`: 要求した月の取得に失敗した
   */
  status: 'loading' | 'ready' | 'error';
};

/** 未取得・失敗時に返す空集合（参照を安定させる）。 */
const EMPTY_DATES: ReadonlySet<string> = new Set();

/**
 * 指定月に記録がある日を取得するフック。月が変わるたびに取得し直す。
 *
 * 読み込み中かどうかは「直近の結果がどの月への要求か」から導くため、取得開始時に state を
 * 同期的に書き換えない。月の切替が速い場合に古いレスポンスが後から届いても反映しない。
 *
 * @param month - 対象の月（`YYYY-MM`）。空文字（今日が未確定の hydration 中）の間は取得しない
 * @returns 取得状態（各メンバーの意味は {@link UseRecordCalendar} を参照）
 */
export function useRecordCalendar(month: string): UseRecordCalendar {
  const [fetched, setFetched] = useState<FetchedCalendar | null>(null);

  useEffect(() => {
    if (!month) return;
    let ignore = false;
    void fetchRecordCalendar(month).then((result) => {
      if (!ignore) setFetched({ forMonth: month, result });
    });
    return () => {
      ignore = true;
    };
  }, [month]);

  const current = month !== '' && fetched?.forMonth === month ? fetched.result : null;
  // 描画のたびに Set を作り直さない（呼び出し側の useMemo 依存を安定させる）
  const recordedDates = useMemo(
    () => (current?.ok ? new Set(current.data.dates) : EMPTY_DATES),
    [current],
  );

  if (!current) return { recordedDates: EMPTY_DATES, status: 'loading' };
  return { recordedDates, status: current.ok ? 'ready' : 'error' };
}
