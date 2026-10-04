import { useCallback, useEffect, useState } from 'react';
import { fetchProfile, saveProfile } from '@/repositories/profile';
import type { ApiResult } from '@/types/apiResult';
import type { ProfileResponse } from '@/types/profile';

/** 保存済みの体重の取得状態。 */
type ProfileStatus =
  /** 結果がまだ届いていない。 */
  | 'loading'
  /** 取得に成功した（未保存で `weightKg` が `null` の場合を含む）。 */
  | 'ready'
  /** 取得に失敗した（通信エラー・5xx 等）。 */
  | 'error';

/** 保存済みの体重と保存操作。 */
export type UseProfile = {
  /** 保存済みの体重（kg）。取得前・取得失敗・未保存は `null`。保存に成功すると保存値に更新される。 */
  weightKg: number | null;
  /** 取得状態。 */
  status: ProfileStatus;
  /** 体重を保存する（管理者のみ）。成功時は `weightKg` を保存値に更新する。入力値の検証は呼び出し側の責務。 */
  save: (weightKg: number) => Promise<ApiResult<ProfileResponse>>;
};

/**
 * 保存済みの体重（プロフィール）を取得・保存するフック。マウント時に 1 回だけ取得する。
 * プロフィール画面と推定消費カロリーの表示で共用する。
 *
 * @returns 体重と保存操作（各メンバーの意味は {@link UseProfile} を参照）
 */
export function useProfile(): UseProfile {
  const [result, setResult] = useState<ApiResult<ProfileResponse> | null>(null);

  useEffect(() => {
    let ignore = false;
    void fetchProfile().then((fetched) => {
      if (!ignore) setResult(fetched);
    });
    return () => {
      ignore = true;
    };
  }, []);

  const save = useCallback(async (weightKg: number) => {
    const saved = await saveProfile({ weightKg });
    if (saved.ok) setResult(saved);
    return saved;
  }, []);

  if (!result) return { weightKg: null, status: 'loading', save };
  if (!result.ok) return { weightKg: null, status: 'error', save };
  return { weightKg: result.data.weightKg, status: 'ready', save };
}
