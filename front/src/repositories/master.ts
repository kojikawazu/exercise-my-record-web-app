import { authFetch } from '@/lib/authFetch';
import { jsonInit, requestJson, requestWithoutBody } from '@/repositories/request';
import type { MasterResponse, MasterType } from '@/types/master';

/**
 * 指定種別のマスターを名称昇順で取得する（認証不要）。
 *
 * @param type - 取得するマスター種別
 * @returns マスターの配列（名称昇順）。0 件は空配列
 */
export const fetchMasters = (type: MasterType) =>
  requestJson<MasterResponse[]>(() => fetch(`/api/masters?type=${type}`));

/**
 * マスターを追加する（管理者のみ）。
 *
 * @param type - 追加先のマスター種別
 * @param name - 追加する名称（前後の空白はサーバーで除去する）
 * @returns 作成したマスター。同種別内で名称が重複すれば `{ ok: false, status: 409 }`
 */
export const createMaster = (type: MasterType, name: string) =>
  requestJson<MasterResponse>(() =>
    authFetch(`/api/masters?type=${type}`, jsonInit('POST', { name })),
  );

/**
 * マスターの名称を変更する（管理者のみ）。
 *
 * @param id - 対象マスターの ID
 * @param name - 変更後の名称
 * @returns 更新後のマスター。対象が無い・名称が重複する場合は `{ ok: false, status: 404 }`
 */
export const updateMaster = (id: string, name: string) =>
  requestJson<MasterResponse>(() => authFetch(`/api/masters/${id}`, jsonInit('PATCH', { name })));

/**
 * マスターを削除する（管理者のみ）。
 *
 * @param id - 対象マスターの ID
 * @returns 成功時の `data` は `null`。対象が無い場合は `{ ok: false, status: 404 }`
 */
export const deleteMaster = (id: string) =>
  requestWithoutBody(() => authFetch(`/api/masters/${id}`, { method: 'DELETE' }));
