import { supabase } from '@/lib/supabase';

/**
 * Supabase セッションの access token を `Authorization: Bearer` として自動付与する `fetch` ラッパー。
 *
 * 書き込み系 API 呼び出しで使用する。セッションが無い場合はヘッダーを付けずに素の `fetch` を行う
 * （その場合サーバー側で 401 となる）。
 *
 * @param url - リクエスト先 URL
 * @param options - `fetch` に渡すオプション。既存の `headers` は保持したうえで認証ヘッダーを追加する
 * @returns `fetch` のレスポンス
 */
export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers);

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, { ...options, headers });
}
