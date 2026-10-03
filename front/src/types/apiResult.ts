/**
 * repositories が返す API 呼び出し結果。例外を投げず、成否を値で返す。
 *
 * 呼び出し側は `ok` で分岐し、失敗時は `status` で挙動を分ける（例: 409 は同日重複）。
 */
export type ApiResult<T> =
  | {
      /** 成功（HTTP 2xx）。 */
      ok: true;
      /** レスポンス本文。本文を持たない API では `null`。 */
      data: T;
    }
  | {
      /** 失敗（HTTP 2xx 以外、または通信エラー）。 */
      ok: false;
      /** HTTP ステータス。通信自体に失敗した（レスポンスが無い）場合は `0`。 */
      status: number;
    };
