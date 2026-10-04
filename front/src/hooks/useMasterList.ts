import { useCallback, useEffect, useState } from 'react';
import { createMaster, deleteMaster, fetchMasters, updateMaster } from '@/repositories/master';
import type { ApiResult } from '@/types/apiResult';
import type { MasterResponse, MasterType } from '@/types/master';

/** マスター一覧の取得状態。 */
type MasterListStatus =
  /** 選択中の種別の結果がまだ届いていない（種別を切り替えた直後を含む）。 */
  | 'loading'
  /** 取得に成功した。 */
  | 'ready'
  /** 取得に失敗した（通信エラー・5xx 等）。 */
  | 'error';

/** マスター管理画面の一覧の状態と操作。 */
export type UseMasterList = {
  /**
   * 選択中の種別の項目。取得順（名称昇順）に、追加した項目を先頭へ積む。
   * 取得中・取得失敗時は空配列（直前に選んでいた種別の項目は返さない）。
   */
  items: MasterResponse[];
  /** 選択中の種別の取得状態。 */
  status: MasterListStatus;
  /**
   * 選択中の種別に項目を追加する。成功時は `items` の先頭に積む。
   * 名称の空チェックは呼び出し側の責務（サーバーも 400 を返す）。
   */
  add: (name: string) => Promise<ApiResult<MasterResponse>>;
  /** 項目の名称を変更する。成功時は `items` の該当項目をサーバーの返した名称で置き換える。 */
  rename: (id: string, name: string) => Promise<ApiResult<MasterResponse>>;
  /** 項目を削除する。成功時は `items` から取り除く。確認ダイアログは呼び出し側の責務。 */
  remove: (id: string) => Promise<ApiResult<null>>;
};

/** 直近に届いた取得結果と、それがどの種別への要求だったか。 */
type FetchedList = {
  /** 要求したマスター種別。 */
  forType: MasterType;
  /** 取得結果。成功後の追加・更新・削除もここへ反映する。 */
  result: ApiResult<MasterResponse[]>;
};

/** 未取得・失敗時に返す空配列（参照を安定させる）。 */
const EMPTY: MasterResponse[] = [];

/**
 * マスター管理画面の一覧取得と追加・名称変更・削除を担うフック。種別が変わるたびに取得し直す。
 *
 * @param type - 選択中のマスター種別
 * @returns 一覧の状態と操作（各メンバーの意味は {@link UseMasterList} を参照）
 */
export function useMasterList(type: MasterType): UseMasterList {
  const [fetched, setFetched] = useState<FetchedList | null>(null);

  useEffect(() => {
    let ignore = false;
    void fetchMasters(type).then((result) => {
      if (!ignore) setFetched({ forType: type, result });
    });
    return () => {
      ignore = true;
    };
  }, [type]);

  /**
   * 指定種別の一覧が取得済みなら、その項目を更新する。操作中に種別が切り替わった場合は
   * 別種別の一覧を書き換えないよう何もしない（切り替え後の一覧は再取得で最新になる）。
   */
  const updateItems = useCallback(
    (forType: MasterType, update: (items: MasterResponse[]) => MasterResponse[]) =>
      setFetched((prev) =>
        prev?.forType === forType && prev.result.ok
          ? { forType, result: { ok: true, data: update(prev.result.data) } }
          : prev,
      ),
    [],
  );

  const add = useCallback(
    async (name: string) => {
      const result = await createMaster(type, name);
      if (result.ok) updateItems(type, (items) => [result.data, ...items]);
      return result;
    },
    [type, updateItems],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      const result = await updateMaster(id, name);
      if (result.ok) {
        updateItems(type, (items) =>
          items.map((item) => (item.id === id ? { ...item, name: result.data.name } : item)),
        );
      }
      return result;
    },
    [type, updateItems],
  );

  const remove = useCallback(
    async (id: string) => {
      const result = await deleteMaster(id);
      if (result.ok) updateItems(type, (items) => items.filter((item) => item.id !== id));
      return result;
    },
    [type, updateItems],
  );

  const result = fetched?.forType === type ? fetched.result : null;
  if (!result) return { items: EMPTY, status: 'loading', add, rename, remove };
  if (!result.ok) return { items: EMPTY, status: 'error', add, rename, remove };
  return { items: result.data, status: 'ready', add, rename, remove };
}
