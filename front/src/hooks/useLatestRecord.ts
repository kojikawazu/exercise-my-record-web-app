import { useCallback, useEffect, useState } from 'react';
import { fetchRecordDetail, fetchRecordList } from '@/repositories/record';
import type { ApiResult } from '@/types/apiResult';
import type { RecordDetail } from '@/types/record';

/** 最新の記録の日付の取得状態。 */
type LatestRecordStatus =
  /** 一覧の結果がまだ届いていない。 */
  | 'loading'
  /** 最新の記録の日付を取得できた。 */
  | 'ready'
  /** 記録が 1 件も無い。 */
  | 'empty'
  /** 一覧の取得に失敗した（通信エラー・5xx 等）。 */
  | 'error';

/** 最新の記録（前回の記録）の取得状態と操作。 */
export type UseLatestRecord = {
  /** 最新の記録の日付（`YYYY-MM-DD`）。`status` が `ready` のときのみ値を持ち、それ以外は `null`。 */
  latestDate: string | null;
  /** 最新の記録の日付の取得状態。 */
  status: LatestRecordStatus;
  /**
   * 最新の記録の詳細を取得する。押下時点の内容を使うため、呼ぶたびに API を叩く。
   * `latestDate` が `null` の間に呼ぶと `{ ok: false, status: 0 }` を返す（API は呼ばない）。
   * フォームへの反映は呼び出し側の責務。
   */
  loadLatest: () => Promise<ApiResult<RecordDetail>>;
};

/**
 * 記録追加画面の「前回の記録をコピー」用に、最新の記録を取得するフック。
 * マウント時に一覧の 1 ページ目（日付降順）を 1 回だけ取得し、先頭の日付を最新とみなす。
 *
 * @returns 取得状態と操作（各メンバーの意味は {@link UseLatestRecord} を参照）
 */
export function useLatestRecord(): UseLatestRecord {
  const [listResult, setListResult] = useState<ApiResult<string | null> | null>(null);

  useEffect(() => {
    let ignore = false;
    void fetchRecordList(1).then((result) => {
      if (ignore) return;
      setListResult(result.ok ? { ok: true, data: result.data.records[0]?.date ?? null } : result);
    });
    return () => {
      ignore = true;
    };
  }, []);

  const latestDate = listResult?.ok ? listResult.data : null;

  const loadLatest = useCallback(
    async (): Promise<ApiResult<RecordDetail>> =>
      latestDate ? fetchRecordDetail(latestDate) : { ok: false, status: 0 },
    [latestDate],
  );

  if (!listResult) return { latestDate: null, status: 'loading', loadLatest };
  if (!listResult.ok) return { latestDate: null, status: 'error', loadLatest };
  return latestDate
    ? { latestDate, status: 'ready', loadLatest }
    : { latestDate: null, status: 'empty', loadLatest };
}
