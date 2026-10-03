import { authFetch } from '@/lib/authFetch';
import { jsonInit, requestJson } from '@/repositories/request';
import type { ProfileResponse, ProfileSaveRequest } from '@/types/profile';

/**
 * 保存済みの体重を取得する（認証不要）。
 *
 * @returns 体重。未保存は `data.weightKg` が `null`
 */
export const fetchProfile = () => requestJson<ProfileResponse>(() => fetch('/api/profile'));

/**
 * 体重を保存する（管理者のみ。既存の値は上書き）。
 *
 * @param body - 保存内容
 * @returns 保存後の体重。未認証は `{ ok: false, status: 401 }`
 */
export const saveProfile = (body: ProfileSaveRequest) =>
  requestJson<ProfileResponse>(() => authFetch('/api/profile', jsonInit('POST', body)));
