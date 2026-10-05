import { useEffect, useState } from 'react';
import { fetchRecordStreak } from '@/repositories/record';
import { useTodayLocalIso } from '@/hooks/useTodayLocalIso';
import type { ApiResult } from '@/types/apiResult';
import type { RecordStreakResponse } from '@/types/record';

/** 直近に届いた取得結果と、それがどの「今日」に対する要求だったか。 */
type FetchedStreak = {
  /** 要求した今日（`YYYY-MM-DD`）。 */
  forToday: string;
  /** 取得結果。 */
  result: ApiResult<RecordStreakResponse>;
};

/** 連続記録日数の取得状態。 */
type UseStreak = {
  /** 連続記録日数。`status` が `ready` 以外の間は `null` */
  streak: RecordStreakResponse | null;
  /**
   * 取得状態。
   * - `loading`: 今日が未確定（hydration 中）、または取得中
   * - `ready`: 取得済み（0 日も含む）
   * - `error`: 取得に失敗した
   */
  status: 'loading' | 'ready' | 'error';
};

/**
 * 今日（ブラウザのローカル日付）を起点とした連続記録日数を取得するフック。
 *
 * @returns 連続記録日数と取得状態（各メンバーの意味は {@link UseStreak} を参照）
 */
export function useStreak(): UseStreak {
  const today = useTodayLocalIso();
  const [fetched, setFetched] = useState<FetchedStreak | null>(null);

  useEffect(() => {
    if (!today) return;
    let ignore = false;
    void fetchRecordStreak(today).then((result) => {
      if (!ignore) setFetched({ forToday: today, result });
    });
    return () => {
      ignore = true;
    };
  }, [today]);

  const current = today !== '' && fetched?.forToday === today ? fetched.result : null;
  if (!current) return { streak: null, status: 'loading' };
  return current.ok ? { streak: current.data, status: 'ready' } : { streak: null, status: 'error' };
}
