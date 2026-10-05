import { authFetch } from '@/lib/authFetch';
import { jsonInit, requestJson, requestWithoutBody } from '@/repositories/request';
import type {
  RecordCalendarResponse,
  RecordCreateRequest,
  RecordDetail,
  RecordIdResponse,
  RecordListResponse,
  RecordTrendsResponse,
  RecordUpdateRequest,
} from '@/types/record';

/**
 * 記録一覧を 1 ページ分取得する（認証不要）。
 *
 * @param page - 要求するページ（1 始まり）。範囲外はサーバーが丸める
 * @returns 一覧レスポンス。実際に返したページは `data.page` を参照する
 */
export const fetchRecordList = (page: number) =>
  requestJson<RecordListResponse>(() => fetch(`/api/records?page=${page}`));

/**
 * 指定月に記録がある日の一覧を取得する（認証不要）。
 *
 * @param month - 対象の月（`YYYY-MM`）
 * @returns 記録がある日の一覧。形式不正の月は `{ ok: false, status: 400 }`
 */
export const fetchRecordCalendar = (month: string) =>
  requestJson<RecordCalendarResponse>(() =>
    fetch(`/api/records/calendar?month=${encodeURIComponent(month)}`),
  );

/**
 * 推移グラフ用に、期間内の記録を取得する（認証不要）。
 *
 * @param from - 起点日（`YYYY-MM-DD`、当日を含む）。`null` は全期間
 * @returns 期間内の記録（日付昇順）。不正な起点日は `{ ok: false, status: 400 }`
 */
export const fetchRecordTrends = (from: string | null) =>
  requestJson<RecordTrendsResponse>(() =>
    fetch(from ? `/api/records/trends?from=${encodeURIComponent(from)}` : '/api/records/trends'),
  );

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
