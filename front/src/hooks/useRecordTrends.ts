import { useEffect, useState } from 'react';
import { fetchRecordTrends } from '@/repositories/record';
import type { ApiResult } from '@/types/apiResult';
import type { RecordTrendPoint, RecordTrendsResponse } from '@/types/record';

/** 直近に届いた取得結果と、それがどの要求（起点日）に対するものだったか。 */
type FetchedTrends = {
  /** 要求のキー（起点日。全期間は `all`）。 */
  forKey: string;
  /** 取得結果。 */
  result: ApiResult<RecordTrendsResponse>;
};

/** 推移グラフの取得状態。 */
type UseRecordTrends = {
  /** 期間内の記録（日付昇順）。取得中・失敗時は空配列（前の期間の結果を持ち越さない） */
  points: RecordTrendPoint[];
  /**
   * 取得状態。
   * - `loading`: 期間が未確定（hydration 中）、または要求した期間の結果がまだ届いていない
   * - `ready`: 要求した期間の結果を取得済み（記録 0 件も含む）
   * - `error`: 要求した期間の取得に失敗した
   */
  status: 'loading' | 'ready' | 'error';
};

/** 未取得・失敗時に返す空配列（参照を安定させる）。 */
const EMPTY_POINTS: RecordTrendPoint[] = [];

/**
 * 推移グラフ用の記録を取得するフック。起点日が変わるたびに取得し直す。
 *
 * 期間の切替が速い場合に古いレスポンスが後から届いても反映しない（直近の結果がどの要求への
 * ものかで判定する）。
 *
 * @param from - 起点日（`YYYY-MM-DD`）。`null` は全期間。`undefined` は期間が未確定（今日が
 *   決まっていない hydration 中）で、取得しない
 * @returns 取得状態（各メンバーの意味は {@link UseRecordTrends} を参照）
 */
export function useRecordTrends(from: string | null | undefined): UseRecordTrends {
  const [fetched, setFetched] = useState<FetchedTrends | null>(null);
  const key = from === undefined ? undefined : (from ?? 'all');

  useEffect(() => {
    if (key === undefined) return;
    let ignore = false;
    void fetchRecordTrends(key === 'all' ? null : key).then((result) => {
      if (!ignore) setFetched({ forKey: key, result });
    });
    return () => {
      ignore = true;
    };
  }, [key]);

  const current = key !== undefined && fetched?.forKey === key ? fetched.result : null;
  if (!current) return { points: EMPTY_POINTS, status: 'loading' };
  return current.ok
    ? { points: current.data.points, status: 'ready' }
    : { points: EMPTY_POINTS, status: 'error' };
}
