import { useEffect, useEffectEvent, useState } from 'react';
import { fetchRecordDetail } from '@/repositories/record';
import type { ApiResult } from '@/types/apiResult';
import type { RecordDetail } from '@/types/record';

/** 記録詳細の取得状態。 */
export type RecordDetailStatus =
  /** 指定日の結果がまだ届いていない（日付が変わった直後を含む）。 */
  | 'loading'
  /** 取得に成功した。 */
  | 'ready'
  /** 指定日の記録が存在しない（404）。 */
  | 'not-found'
  /** 404 以外の失敗（通信エラー・5xx 等）。 */
  | 'error';

/** 記録詳細の取得状態。 */
export type UseRecordDetail = {
  /** 取得した詳細。`status` が `ready` のときのみ値を持ち、それ以外は `null`。 */
  detail: RecordDetail | null;
  /** 取得状態。 */
  status: RecordDetailStatus;
};

/** 直近に届いた取得結果と、それがどの日付への要求だったか。 */
type FetchedDetail = {
  /** 要求した記録日。 */
  forDate: string;
  /** 取得結果。 */
  result: ApiResult<RecordDetail>;
};

/**
 * 指定日の記録詳細を取得するフック。日付が変わるたびに取得し直す。
 *
 * @param date - 記録日（`YYYY-MM-DD`）
 * @param onLoaded - 取得成功時に 1 回呼ぶコールバック（編集フォームへの初期値流し込み用、任意）。
 *   最新の関数が呼ばれるため、呼び出し側でメモ化する必要はない
 * @returns 取得状態（各メンバーの意味は {@link UseRecordDetail} を参照）
 */
export function useRecordDetail(
  date: string,
  onLoaded?: (detail: RecordDetail) => void,
): UseRecordDetail {
  const [fetched, setFetched] = useState<FetchedDetail | null>(null);
  const notifyLoaded = useEffectEvent((detail: RecordDetail) => onLoaded?.(detail));

  useEffect(() => {
    let ignore = false;
    void fetchRecordDetail(date).then((result) => {
      if (ignore) return;
      setFetched({ forDate: date, result });
      if (result.ok) notifyLoaded(result.data);
    });
    return () => {
      ignore = true;
    };
  }, [date]);

  const result = fetched?.forDate === date ? fetched.result : null;
  if (!result) return { detail: null, status: 'loading' };
  if (result.ok) return { detail: result.data, status: 'ready' };
  return { detail: null, status: result.status === 404 ? 'not-found' : 'error' };
}
