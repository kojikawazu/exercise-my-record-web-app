import { authFetch } from '@/lib/authFetch';
import type { ApiResult } from '@/types/apiResult';
import type {
  RecordCreateRequest,
  RecordDetail,
  RecordIdResponse,
  RecordListResponse,
  RecordUpdateRequest,
} from '@/types/record';

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
async function requestJson<T>(sender: () => Promise<Response>): Promise<ApiResult<T>> {
  const result = await send(sender);
  if (!result.ok) return result;
  // 本文の形は同一アプリの Route Handler が types/record.ts の契約型で保証している。
  // 検証ライブラリは未導入（typescript.md「スキーマバリデーション」）のため、ここでは型を付けるに留める
  return { ok: true, data: (await result.res.json()) as T };
}

/**
 * 本文を使わないリクエストを送る（削除など）。
 *
 * @param sender - リクエストを送る関数
 * @returns 2xx は `{ ok: true, data: null }`、それ以外は `{ ok: false, status }`
 */
async function requestWithoutBody(sender: () => Promise<Response>): Promise<ApiResult<null>> {
  const result = await send(sender);
  return result.ok ? { ok: true, data: null } : result;
}

const jsonInit = (method: 'POST' | 'PATCH', body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/**
 * 記録一覧を 1 ページ分取得する（認証不要）。
 *
 * @param page - 要求するページ（1 始まり）。範囲外はサーバーが丸める
 * @returns 一覧レスポンス。実際に返したページは `data.page` を参照する
 */
export const fetchRecordList = (page: number) =>
  requestJson<RecordListResponse>(() => fetch(`/api/records?page=${page}`));

/**
 * 指定日の記録詳細を取得する（認証不要）。
 *
 * @param date - 記録日（`YYYY-MM-DD`）
 * @returns 記録詳細。記録が無い日は `{ ok: false, status: 404 }`
 */
export const fetchRecordDetail = (date: string) =>
  requestJson<RecordDetail>(() => fetch(`/api/records/${date}`));

/**
 * 記録を新規作成する（管理者のみ）。
 *
 * @param body - 作成内容
 * @returns 作成した記録の ID。同日の記録が既にあれば `{ ok: false, status: 409 }`
 */
export const createRecord = (body: RecordCreateRequest) =>
  requestJson<RecordIdResponse>(() => authFetch('/api/records', jsonInit('POST', body)));

/**
 * 指定日の記録を更新する（管理者のみ。筋トレ・有酸素は全置換）。
 *
 * @param date - 記録日（`YYYY-MM-DD`）
 * @param body - 更新内容
 * @returns 更新した記録の ID。記録が無い日は `{ ok: false, status: 404 }`
 */
export const updateRecord = (date: string, body: RecordUpdateRequest) =>
  requestJson<RecordIdResponse>(() => authFetch(`/api/records/${date}`, jsonInit('PATCH', body)));

/**
 * 指定日の記録を関連データごと削除する（管理者のみ）。
 *
 * @param date - 記録日（`YYYY-MM-DD`）
 * @returns 成功時の `data` は `null`。記録が無い日は `{ ok: false, status: 404 }`
 */
export const deleteRecord = (date: string) =>
  requestWithoutBody(() => authFetch(`/api/records/${date}`, { method: 'DELETE' }));
