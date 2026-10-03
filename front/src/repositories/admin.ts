import { requestJson } from '@/repositories/request';
import type { AdminMeResponse } from '@/types/admin';

/**
 * アクセストークンのユーザーが管理者かを判定する。
 *
 * `authFetch` は使わない。呼び出し側（`useAdminSession`）は認証状態の変化イベントで受け取った
 * セッションで判定するため、その時点のトークンを明示的に渡す（`getSession()` を取り直すと、
 * ログアウト直後などに別時点のトークンを拾い得る）。判定結果はキャッシュさせない。
 *
 * @param accessToken - Supabase セッションの access token
 * @returns 管理者なら `{ ok: true, data: { isAdmin: true } }`。トークン無効は 401、管理者以外は 403 の失敗
 */
export const fetchAdminMe = (accessToken: string) =>
  requestJson<AdminMeResponse>(() =>
    fetch('/api/admin/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }),
  );
