import { authFetch } from '@/lib/authFetch';
import { jsonInit, requestJson } from '@/repositories/request';
import type { ProfileResponse, ProfileSaveRequest, WeightHistoryResponse } from '@/types/profile';

/**
 * 保存済みの体重を取得する（認証不要）。
 *
 * @returns 体重。未保存は `data.weightKg` が `null`
 */
export const fetchProfile = () => requestJson<ProfileResponse>(() => fetch('/api/profile'));

/**
 * 体重を保存する（管理者のみ。現在の値は上書きし、`body.date` の履歴を積む）。
 *
 * @param body - 保存内容
 * @returns 保存後の体重。未認証は `{ ok: false, status: 401 }`
 */
export const saveProfile = (body: ProfileSaveRequest) =>
  requestJson<ProfileResponse>(() => authFetch('/api/profile', jsonInit('POST', body)));

/**
 * 推移グラフ用に、期間内の体重の履歴を取得する（認証不要）。
 *
 * @param from - 起点日（`YYYY-MM-DD`、この日を含む）。`null` は全期間
 * @returns 期間内の体重の履歴（日付昇順）
 */
export const fetchWeightHistory = (from: string | null) =>
  requestJson<WeightHistoryResponse>(() =>
    fetch(from ? `/api/profile/weights?from=${encodeURIComponent(from)}` : '/api/profile/weights'),
  );
