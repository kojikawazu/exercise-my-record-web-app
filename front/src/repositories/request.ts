import type { ApiResult } from '@/types/apiResult';

/**
 * リクエストを送り、失敗（HTTP 2xx 以外・通信エラー）を {@link ApiResult} の失敗に変換する。
 *
 * @param sender - リクエストを送る関数（`fetch` / `authFetch` の呼び出し）
 * @returns 成功時はレスポンス、失敗時は `{ ok: false, status }`（通信エラーは `status: 0`）
 */
async function send(
  sender: () => Promise<Response>,
): Promise<{ ok: true; res: Response } | Extract<ApiResult<never>, { ok: false }>> {
  try {
    const res = await sender();
    return res.ok ? { ok: true, res } : { ok: false, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

/**
 * リクエストを送り、成功時は本文を JSON として返す。
 *
 * @param sender - リクエストを送る関数
 * @returns 2xx は `{ ok: true, data }`、それ以外は `{ ok: false, status }`
 */
export async function requestJson<T>(sender: () => Promise<Response>): Promise<ApiResult<T>> {
  const result = await send(sender);
  if (!result.ok) return result;
  // 本文の形は同一アプリの Route Handler が types/ の契約型で保証している。
  // 検証ライブラリは未導入（typescript.md「スキーマバリデーション」）のため、ここでは型を付けるに留める
  return { ok: true, data: (await result.res.json()) as T };
}

/**
 * 本文を使わないリクエストを送る（削除など）。
 *
 * @param sender - リクエストを送る関数
 * @returns 2xx は `{ ok: true, data: null }`、それ以外は `{ ok: false, status }`
 */
export async function requestWithoutBody(
  sender: () => Promise<Response>,
): Promise<ApiResult<null>> {
  const result = await send(sender);
  return result.ok ? { ok: true, data: null } : result;
}

/**
 * JSON 本文を送るリクエストの `RequestInit` を組み立てる。
 *
 * @param method - HTTP メソッド
 * @param body - JSON として送る本文
 * @returns `Content-Type: application/json` 付きの `RequestInit`
 */
export const jsonInit = (method: 'POST' | 'PATCH', body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
