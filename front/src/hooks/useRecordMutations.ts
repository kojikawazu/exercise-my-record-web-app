import { toRecordRequest } from '@/lib/recordForm';
import { createRecord, deleteRecord, updateRecord } from '@/repositories/record';
import type { ApiResult } from '@/types/apiResult';
import type { RecordIdResponse } from '@/types/record';
import type { RecordFormValues } from '@/types/recordForm';

/** 記録の作成・更新・削除操作。いずれも状態を持たず、結果を値で返す（例外を投げない）。 */
export type UseRecordMutations = {
  /** フォーム入力値から記録を作成する。同日の記録があれば `{ ok: false, status: 409 }` */
  create: (date: string, values: RecordFormValues) => Promise<ApiResult<RecordIdResponse>>;
  /** フォーム入力値で指定日の記録を全置換する。記録が無ければ `{ ok: false, status: 404 }` */
  update: (date: string, values: RecordFormValues) => Promise<ApiResult<RecordIdResponse>>;
  /** 指定日の記録を削除する。記録が無ければ `{ ok: false, status: 404 }` */
  remove: (date: string) => Promise<ApiResult<null>>;
};

const mutations: UseRecordMutations = {
  create: (date, values) => createRecord({ date, ...toRecordRequest(values) }),
  update: (date, values) => updateRecord(date, toRecordRequest(values)),
  remove: (date) => deleteRecord(date),
};

/**
 * 記録の作成・更新・削除操作を返すフック。
 *
 * React の状態は持たないが、`components/` は `repositories/` を直接 import できない
 * （frontend.md「レイヤ依存の一方向ルール」）ため、フォーム値 → API 本文の変換とあわせて
 * hooks 層に置く。返す関数は常に同一参照。
 *
 * @returns 作成・更新・削除の各操作（{@link UseRecordMutations} を参照）
 */
export function useRecordMutations(): UseRecordMutations {
  return mutations;
}
