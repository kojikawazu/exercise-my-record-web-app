import { useCallback, useEffect, useState } from 'react';
import { fetchRecordList } from '@/repositories/record';
import type { ApiResult } from '@/types/apiResult';
import type { RecordListItem, RecordListResponse } from '@/types/record';

/** 直近に届いた取得結果と、それがどのページへの要求だったか。 */
type FetchedList = {
  /** 要求したページ（サーバーが丸めた後のページではない）。 */
  forPage: number;
  /** 取得結果。 */
  result: ApiResult<RecordListResponse>;
};

/** 記録一覧の取得状態と操作。 */
export type UseRecordList = {
  /** 表示する記録。別ページを読み込み中は直前の結果を保持し、取得失敗時は空配列。 */
  records: RecordListItem[];
  /** サーバーが実際に返したページ。要求ページと異なる場合は呼び出し側で URL を補正する。未取得・失敗時は要求ページ */
  page: number;
  /** 総ページ数。未取得・失敗時は 1。 */
  totalPages: number;
  /** 要求ページに対する結果が届いたか（成功・失敗とも `true`）。ページが変わると `false` に戻る */
  hasFetched: boolean;
  /** 要求ページの取得に失敗したか（`hasFetched` が `false` の間は常に `false`）。 */
  hasError: boolean;
  /** 要求ページを再取得し、結果を反映する（削除後の再読込用）。成功時はレスポンス、失敗時は `null` を返す */
  refetch: () => Promise<RecordListResponse | null>;
};

/** 未取得・失敗時に返す空配列（参照を安定させる）。 */
const EMPTY_RECORDS: RecordListItem[] = [];

/**
 * 記録一覧を指定ページで取得するフック。ページが変わるたびに取得し直す。
 *
 * 読み込み中かどうかは「直近の結果がどのページへの要求か」から導くため、取得開始時に state を
 * 同期的に書き換えない。ページ切替が速い場合に古いレスポンスが後から届いても反映しない。
 *
 * @param requestedPage - 要求するページ（1 始まり。URL の `page` クエリ由来）
 * @returns 取得状態と再取得操作（各メンバーの意味は {@link UseRecordList} を参照）
 */
export function useRecordList(requestedPage: number): UseRecordList {
  const [fetched, setFetched] = useState<FetchedList | null>(null);

  useEffect(() => {
    let ignore = false;
    void fetchRecordList(requestedPage).then((result) => {
      if (!ignore) setFetched({ forPage: requestedPage, result });
    });
    return () => {
      ignore = true;
    };
  }, [requestedPage]);

  const refetch = useCallback(async () => {
    const result = await fetchRecordList(requestedPage);
    setFetched({ forPage: requestedPage, result });
    return result.ok ? result.data : null;
  }, [requestedPage]);

  const latest = fetched?.result;
  const hasFetched = fetched?.forPage === requestedPage;
  const current = hasFetched && latest?.ok ? latest.data : null;

  return {
    records: latest?.ok ? latest.data.records : EMPTY_RECORDS,
    page: current?.page ?? requestedPage,
    totalPages: current?.totalPages ?? 1,
    hasFetched,
    hasError: hasFetched && latest?.ok === false,
    refetch,
  };
}
