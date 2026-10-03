import { requestJson } from '@/repositories/request';
import type { MasterResponse, MasterType } from '@/types/master';

/**
 * 指定種別のマスターを名称昇順で取得する（認証不要）。
 *
 * @param type - 取得するマスター種別
 * @returns マスターの配列（名称昇順）。0 件は空配列
 */
export const fetchMasters = (type: MasterType) =>
  requestJson<MasterResponse[]>(() => fetch(`/api/masters?type=${type}`));
